# Supabase Realtime Integration

## Overview

SketchyAF uses Supabase Realtime for real-time game phase transitions and multiplayer communication. This system replaced the previous PubNub integration to provide a simplified, more reliable architecture with native Supabase integration.

## 🎯 Architecture

### Core Components

1. **Database Timer Monitoring**: PostgreSQL functions handle game phase transitions
2. **Supabase Realtime**: Native postgres_changes events notify clients
3. **Enhanced Connection Manager**: Robust client-side connection handling
4. **Automatic Navigation**: Seamless game phase transitions

### Data Flow

```
Database Timer → Game Status Update → postgres_changes Event → Client Navigation
```

## 🔧 Configuration

### Database Setup

The games table is automatically configured for Realtime notifications:

```sql
-- Games table is included in supabase_realtime publication
-- This enables postgres_changes events for game status updates
```

### Client Configuration

```typescript
import { supabase } from '../lib/supabase';
import EnhancedRealtimeManager from '../services/EnhancedRealtimeManager';

// Get singleton instance
const realtimeManager = EnhancedRealtimeManager.getInstance();

// Subscribe to game updates
const subscriptionId = realtimeManager.subscribeToGameUpdates(
  gameId,
  'component-id',
  (gameData) => {
    // Handle game update
    console.log('Game updated:', gameData);
  }
);
```

## 📡 Real-time Events

### Game Phase Transitions

When the database timer monitoring system updates a game's status, Supabase Realtime automatically broadcasts the change:

```typescript
// Client receives postgres_changes event
{
  eventType: 'UPDATE',
  schema: 'public',
  table: 'games',
  new: {
    id: 'game-uuid',
    status: 'drawing',
    phase_expires_at: '2025-06-30T10:00:00Z',
    // ... other game fields
  },
  old: {
    status: 'briefing',
    // ... previous values
  }
}
```

### Automatic Navigation

The Enhanced Realtime Manager automatically triggers navigation based on game status changes:

```typescript
// In useSupabaseRealtimeGameState hook
const handleGameUpdate = useCallback((gameData: any) => {
  if (gameData.status !== state.game?.status) {
    // Navigate to appropriate phase
    navigateToPhase(gameData.status);
  }
  
  // Update local state
  setState(prev => ({
    ...prev,
    game: gameData,
    lastUpdated: Date.now()
  }));
}, [navigateToPhase, state.game?.status]);
```

## 🔄 Connection Management

### Enhanced Realtime Manager Features

- **Heartbeat Mechanism**: 30-second intervals to prevent WebSocket timeouts
- **Exponential Backoff Retry**: Automatic reconnection with increasing delays
- **Fallback Polling**: 10-second database polling when Realtime is unavailable
- **Connection Health Monitoring**: Real-time status tracking and metrics

### Connection Status

```typescript
interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  isHealthy: boolean;
}
```

### Health Metrics

```typescript
const healthMetrics = realtimeManager.getHealthMetrics();
console.log({
  isConnected: healthMetrics.isConnected,
  isHealthy: healthMetrics.isHealthy,
  lastConnected: healthMetrics.lastConnected,
  lastHeartbeat: healthMetrics.lastHeartbeat,
  reconnectAttempts: healthMetrics.reconnectAttempts,
  activeChannels: healthMetrics.activeChannels,
  fallbackMode: healthMetrics.fallbackMode,
  uptime: healthMetrics.uptime
});
```

## 🧪 Testing

### Local Testing

```bash
# Start Supabase
npx supabase start

# Test timer monitoring with Realtime
npm run monitor:test

# Continuous monitoring simulation
npm run monitor:continuous
```

### Manual Testing

```typescript
// Create test subscription
const channel = supabase
  .channel('test-game-123')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'games',
      filter: 'id=eq.test-game-123'
    },
    (payload) => {
      console.log('Received update:', payload);
    }
  )
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

## 🚨 Error Handling

### Connection Failures

The Enhanced Realtime Manager handles various failure scenarios:

1. **WebSocket Disconnection**: Automatic reconnection with exponential backoff
2. **Subscription Failures**: Retry logic with fallback to polling
3. **Network Issues**: Graceful degradation to polling mode
4. **Timeout Errors**: Heartbeat mechanism prevents timeouts

### Fallback Mechanisms

```typescript
// Automatic fallback to polling when Realtime fails
private async performFallbackPolling(): Promise<void> {
  if (!this.fallbackMode || this.channels.size === 0) {
    return;
  }

  try {
    const gameIds = Array.from(this.channels.keys()).map(key => 
      key.replace('game-', '')
    );

    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .in('id', gameIds);

    if (games) {
      games.forEach(game => {
        const channelKey = `game-${game.id}`;
        const subscription = this.channels.get(channelKey);
        
        if (subscription) {
          this.handleGameUpdate(game.id, game, subscription.handlers);
        }
      });
    }
  } catch (error) {
    console.error('❌ Fallback polling failed:', error);
  }
}
```

## 📊 Monitoring

### Connection Status Monitoring

```typescript
// Add connection listener
const removeListener = realtimeManager.addConnectionListener((status) => {
  console.log('Connection status changed:', status);
  
  if (!status.isHealthy) {
    // Handle connection issues
    showConnectionWarning();
  }
});

// Cleanup
removeListener();
```

### Performance Metrics

The system provides comprehensive metrics for monitoring:

- **Connection uptime**: Time since last successful connection
- **Heartbeat status**: Last heartbeat timestamp
- **Active channels**: Number of active subscriptions
- **Fallback mode**: Whether using polling fallback
- **Reconnection attempts**: Number of retry attempts

## 🔧 Configuration Options

### Heartbeat Configuration

```typescript
private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
```

### Retry Configuration

```typescript
private readonly retryConfig: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};
```

### Fallback Polling

```typescript
private readonly POLLING_INTERVAL = 10000; // 10 seconds
```

## 🎯 Benefits

### Simplified Architecture
- **No external dependencies**: Pure Supabase integration
- **Reduced complexity**: Single source of truth for real-time events
- **Better reliability**: Native database integration

### Enhanced Performance
- **Faster connections**: No external service latency
- **Better caching**: Supabase-native connection pooling
- **Reduced costs**: No external service fees

### Improved Developer Experience
- **Unified API**: Same client for database and real-time
- **Better debugging**: Integrated logging and monitoring
- **Easier testing**: Local development support

## 🔄 Migration from PubNub

### What Changed
- **Removed**: PubNub database triggers and Edge Functions
- **Added**: Enhanced Realtime Manager with connection handling
- **Updated**: Client hooks to use new manager
- **Maintained**: Same game phase transition logic

### Backward Compatibility
- ✅ Same game phase transitions
- ✅ Same client-side navigation
- ✅ Same database schema
- ✅ Same timer monitoring system

### Migration Benefits
- **Simplified infrastructure**: One less external service
- **Better reliability**: Native Supabase integration
- **Enhanced monitoring**: Built-in connection health tracking
- **Improved error handling**: Comprehensive retry and fallback logic
