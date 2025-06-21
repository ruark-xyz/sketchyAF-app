// Supabase Edge Function for PubNub Authentication
// Provides secure PubNub access token generation with Supabase user validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface PubNubAuthRequest {
  user_id: string;
  channel: string;
  permissions?: {
    read?: boolean;
    write?: boolean;
    manage?: boolean;
  };
}

interface PubNubAuthResponse {
  token: string;
  ttl: number;
  authorized_uuid: string;
  channels: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { user_id, channel, permissions = { read: true, write: true } }: PubNubAuthRequest = await req.json()

    if (!user_id || !channel) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id and channel' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Validate user authentication and get user details
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id)
    
    if (userError || !user) {
      console.error('User validation failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid user' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate channel access based on channel type
    const channelValidation = await validateChannelAccess(supabase, user_id, channel)
    if (!channelValidation.success) {
      return new Response(
        JSON.stringify({ error: channelValidation.error }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate PubNub access token
    const accessToken = await generatePubNubToken(user_id, channel, permissions)
    
    const response: PubNubAuthResponse = {
      token: accessToken,
      ttl: 3600, // 1 hour
      authorized_uuid: user_id,
      channels: [channel]
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('PubNub auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Validate user access to specific channel
 */
async function validateChannelAccess(supabase: any, userId: string, channel: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract channel type and ID from channel name
    const channelMatch = channel.match(/^(game|presence)-(.+)$/)
    if (!channelMatch) {
      return { success: false, error: 'Invalid channel format' }
    }

    const [, channelType, gameId] = channelMatch

    // For game channels, verify user is a participant in the game
    if (channelType === 'game' || channelType === 'presence') {
      const { data: participant, error } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .is('left_at', null)
        .single()

      if (error || !participant) {
        return { success: false, error: 'User not authorized for this game channel' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Channel validation error:', error)
    return { success: false, error: 'Channel validation failed' }
  }
}

/**
 * Generate PubNub access token (simplified version)
 * In production, this would use PubNub's Access Manager API
 */
async function generatePubNubToken(userId: string, channel: string, permissions: any): Promise<string> {
  // For now, return a simple token structure
  // In production, integrate with PubNub Access Manager
  const tokenData = {
    userId,
    channel,
    permissions,
    timestamp: Date.now(),
    expires: Date.now() + (3600 * 1000) // 1 hour
  }

  // Simple base64 encoding for demo purposes
  // In production, use proper JWT signing with PubNub keys
  return btoa(JSON.stringify(tokenData))
}
