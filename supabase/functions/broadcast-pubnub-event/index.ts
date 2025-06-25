// Supabase Edge Function for Broadcasting PubNub Events
// Handles database-triggered real-time event broadcasting via PubNub

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface GameEvent {
  type: string;
  gameId: string;
  userId: string;
  timestamp: number;
  version: string;
  data: any;
}

interface PubNubPublishResponse {
  timetoken: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the game event from request body
    const gameEvent: GameEvent = await req.json()

    if (!gameEvent.type || !gameEvent.gameId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and gameId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get PubNub configuration from environment
    const publishKey = Deno.env.get('PUBNUB_PUBLISH_KEY')
    const subscribeKey = Deno.env.get('PUBNUB_SUBSCRIBE_KEY')
    const secretKey = Deno.env.get('PUBNUB_SECRET_KEY')

    if (!publishKey || !subscribeKey) {
      console.error('PubNub configuration missing')
      return new Response(
        JSON.stringify({ error: 'PubNub configuration not available' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For match notifications, broadcast to user-specific channel
    let userChannelResult = null
    if (gameEvent.type === 'MATCH_FOUND' && gameEvent.userId) {
      userChannelResult = await broadcastToPubNub(
        publishKey,
        subscribeKey,
        secretKey,
        `user-${gameEvent.userId}`,
        gameEvent
      )
    }

    // Broadcast to main game channel
    const gameChannelResult = await broadcastToPubNub(
      publishKey,
      subscribeKey,
      secretKey,
      `game-${gameEvent.gameId}`,
      gameEvent
    )

    // Also broadcast to presence channel for presence-related events
    let presenceChannelResult = null
    if (['player_joined', 'player_left', 'connection_status'].includes(gameEvent.type)) {
      presenceChannelResult = await broadcastToPubNub(
        publishKey,
        subscribeKey,
        secretKey,
        `presence-${gameEvent.gameId}`,
        gameEvent
      )
    }

    // Log successful broadcast
    console.log('Event broadcasted successfully:', {
      type: gameEvent.type,
      gameId: gameEvent.gameId,
      userId: gameEvent.userId,
      userChannel: userChannelResult?.timetoken,
      gameChannel: gameChannelResult?.timetoken,
      presenceChannel: presenceChannelResult?.timetoken
    })

    return new Response(
      JSON.stringify({
        success: true,
        userChannel: userChannelResult,
        gameChannel: gameChannelResult,
        presenceChannel: presenceChannelResult
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('PubNub broadcast error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to broadcast event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Broadcast event to PubNub channel
 */
async function broadcastToPubNub(
  publishKey: string,
  subscribeKey: string,
  secretKey: string | undefined,
  channel: string,
  message: GameEvent
): Promise<PubNubPublishResponse> {
  try {
    // Prepare the message with metadata
    const messageWithMetadata = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      version: message.version || '1.0.0'
    }

    // Build PubNub publish URL
    const timestamp = Math.floor(Date.now() / 1000)
    const uuid = 'server-broadcast'
    
    // Create signature if secret key is available
    let signature = ''
    if (secretKey) {
      const signatureString = `${subscribeKey}\n${publishKey}\n${channel}\n${JSON.stringify(messageWithMetadata)}\n${timestamp}`
      signature = await generateSignature(signatureString, secretKey)
    }

    const publishUrl = new URL(`https://ps.pndsn.com/publish/${publishKey}/${subscribeKey}/0/${channel}/0/${encodeURIComponent(JSON.stringify(messageWithMetadata))}`)
    
    // Add query parameters
    publishUrl.searchParams.set('uuid', uuid)
    publishUrl.searchParams.set('timestamp', timestamp.toString())
    if (signature) {
      publishUrl.searchParams.set('signature', signature)
    }

    // Make the HTTP request to PubNub
    const response = await fetch(publishUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`PubNub API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    
    // PubNub returns [1, "Sent", "timetoken"] for success
    if (Array.isArray(result) && result[0] === 1) {
      return { timetoken: result[2] }
    } else {
      throw new Error(`PubNub publish failed: ${JSON.stringify(result)}`)
    }

  } catch (error) {
    console.error(`Failed to broadcast to channel ${channel}:`, error)
    throw error
  }
}

/**
 * Generate HMAC-SHA256 signature for PubNub authentication
 */
async function generateSignature(message: string, secretKey: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secretKey)
    const messageData = encoder.encode(message)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const signatureArray = new Uint8Array(signature)
    
    // Convert to base64
    return btoa(String.fromCharCode(...signatureArray))
  } catch (error) {
    console.error('Failed to generate signature:', error)
    return ''
  }
}

/**
 * Validate game event structure
 */
function validateGameEvent(event: any): event is GameEvent {
  return (
    typeof event === 'object' &&
    typeof event.type === 'string' &&
    typeof event.gameId === 'string' &&
    typeof event.userId === 'string' &&
    typeof event.timestamp === 'number' &&
    typeof event.version === 'string' &&
    event.data !== undefined
  )
}
