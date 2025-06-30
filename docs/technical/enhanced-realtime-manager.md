# Enhanced Realtime Manager

## Overview

The Enhanced Realtime Manager is a robust singleton service that provides reliable Supabase Realtime connections with advanced features like heartbeat monitoring, automatic reconnection, and fallback polling.

## 🎯 Key Features

### Connection Reliability
- **Heartbeat Mechanism**: 30-second intervals prevent WebSocket timeouts
- **Exponential Backoff Retry**: Automatic reconnection with increasing delays
- **Fallback Polling**: 10-second database polling when Realtime unavailable
- **Connection Health Monitoring**: Real-time status tracking and metrics

### Advanced Management
- **Singleton Pattern**: Single instance manages all connections
- **Subscription Pooling**: Efficient channel management and cleanup
- **Error Recovery**: Comprehensive error handling and recovery
- **Performance Monitoring**: Built-in metrics and health tracking

## 🏗️ Architecture

### Class Structure

```typescript
class EnhancedRealtimeManager {
  private static instance: EnhancedRealtimeManager;
  private channels = new Map<string, ChannelSubscription>();
  private connectionStatus: ConnectionStatus;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private fallbackMode = false;
  
  static getInstance(): EnhancedRealtimeManager;
  subscribeToGameUpdates(gameId, subscriberId, handler): string;
  unsubscribeFromGameUpdates(gameId, subscriberId, handler): void;
  addConnectionListener(listener): () => void;
  getConnectionStatus(): ConnectionStatus;
  getHealthMetrics(): HealthMetrics;
  forceReconnect(): void;
  cleanup(): void;
}
```

### Interfaces

```typescript
interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  isHealthy: boolean;
}

interface GameUpdateHandler {
  (gameData: Record<string, unknown>): void;
}

interface ChannelSubscription {
  channel: RealtimeChannel;
  subscribers: Set<string>;
  gameId: string;
  handlers: Set<GameUpdateHandler>;
  lastActivity: Date;
}
```

## 🔧 Usage

### Basic Subscription

```typescript
import EnhancedRealtimeManager from '../services/EnhancedRealtimeManager';

// Get singleton instance
const realtimeManager = EnhancedRealtimeManager.getInstance();

// Subscribe to game updates
const subscriptionId = realtimeManager.subscribeToGameUpdates(
  'game-123',
  'my-component',
  (gameData) => {
    console.log('Game updated:', gameData);
    // Handle game state changes
  }
);

// Cleanup when component unmounts
realtimeManager.unsubscribeFromGameUpdates(
  'game-123',
  'my-component',
  gameUpdateHandler
);
```

### Connection Monitoring

```typescript
// Monitor connection status
const removeListener = realtimeManager.addConnectionListener((status) => {
  console.log('Connection status:', status);
  
  if (status.status === 'connected') {
    console.log('✅ Connected to Realtime');
  } else if (status.status === 'error') {
    console.log('❌ Connection error, attempts:', status.reconnectAttempts);
  }
});

// Get current status
const currentStatus = realtimeManager.getConnectionStatus();
console.log('Current connection:', currentStatus);

// Cleanup listener
removeListener();
```

### Health Metrics

```typescript
// Get comprehensive health metrics
const metrics = realtimeManager.getHealthMetrics();
console.log({
  isConnected: metrics.isConnected,
  isHealthy: metrics.isHealthy,
  lastConnected: metrics.lastConnected,
  lastHeartbeat: metrics.lastHeartbeat,
  reconnectAttempts: metrics.reconnectAttempts,
  activeChannels: metrics.activeChannels,
  fallbackMode: metrics.fallbackMode,
  uptime: metrics.uptime
});
```

## 🔄 Connection Management

### Heartbeat System

The manager sends heartbeat signals every 30 seconds to maintain connection health:

```typescript
private startHeartbeat(): void {
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
  }

  this.heartbeatInterval = setInterval(() => {
    this.sendHeartbeat();
  }, this.HEARTBEAT_INTERVAL);
}

private sendHeartbeat(): void {
  // Check connection health based on active channels
  if (this.channels.size > 0) {
    this.lastHeartbeat = new Date();
    console.log('💓 Heartbeat: Active channels detected, connection healthy');
    
    if (this.connectionStatus.status !== 'connected') {
      this.updateConnectionStatus('connected');
    }
  } else {
    console.log('💓 Heartbeat: No active channels, connection status uncertain');
    
    if (this.connectionStatus.status === 'connected') {
      this.updateConnectionStatus('disconnected');
    }
  }
}
```

### Retry Logic

Exponential backoff retry with configurable parameters:

```typescript
private readonly retryConfig: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

private attemptReconnection(): void {
  const { reconnectAttempts } = this.connectionStatus;
  const { maxAttempts } = this.retryConfig;
  
  if (reconnectAttempts >= maxAttempts) {
    console.error('🚫 Max reconnection attempts reached');
    this.updateConnectionStatus('error');
    this.startFallbackPolling();
    return;
  }

  const delay = Math.min(
    this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, reconnectAttempts),
    this.retryConfig.maxDelay
  );

  console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxAttempts})`);

  this.reconnectTimeout = setTimeout(() => {
    this.performReconnection();
  }, delay);
}
```

### Fallback Polling

When Realtime is unavailable, the manager falls back to database polling:

```typescript
private startFallbackPolling(): void {
  if (this.pollingInterval || this.fallbackMode) {
    return;
  }

  console.log('🔄 Starting fallback polling mode');
  this.fallbackMode = true;

  this.pollingInterval = setInterval(() => {
    this.performFallbackPolling();
  }, this.POLLING_INTERVAL);
}

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

## 🧪 Testing

### Unit Testing

```typescript
describe('EnhancedRealtimeManager', () => {
  let manager: EnhancedRealtimeManager;
  
  beforeEach(() => {
    manager = EnhancedRealtimeManager.getInstance();
  });
  
  afterEach(() => {
    manager.cleanup();
  });
  
  it('should create singleton instance', () => {
    const instance1 = EnhancedRealtimeManager.getInstance();
    const instance2 = EnhancedRealtimeManager.getInstance();
    expect(instance1).toBe(instance2);
  });
  
  it('should handle subscription lifecycle', () => {
    const handler = jest.fn();
    const subscriptionId = manager.subscribeToGameUpdates('game-1', 'test', handler);
    
    expect(subscriptionId).toBe('game-game-1:test');
    
    manager.unsubscribeFromGameUpdates('game-1', 'test', handler);
    // Verify cleanup
  });
});
```

### Integration Testing

```typescript
// Test with real Supabase connection
const testRealConnection = async () => {
  const manager = EnhancedRealtimeManager.getInstance();
  
  // Monitor connection status
  const statusUpdates: ConnectionStatus[] = [];
  const removeListener = manager.addConnectionListener((status) => {
    statusUpdates.push(status);
  });
  
  // Subscribe to test game
  const gameUpdates: any[] = [];
  const subscriptionId = manager.subscribeToGameUpdates(
    'test-game',
    'integration-test',
    (gameData) => {
      gameUpdates.push(gameData);
    }
  );
  
  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Verify connection established
  const status = manager.getConnectionStatus();
  expect(status.isHealthy).toBe(true);
  
  // Cleanup
  manager.unsubscribeFromGameUpdates('test-game', 'integration-test', handler);
  removeListener();
};
```

## 📊 Monitoring and Debugging

### Logging

The manager provides comprehensive logging for debugging:

```typescript
// Connection events
console.log('🔗 Enhanced Realtime Manager initialized');
console.log('💓 Heartbeat: Active channels detected, connection healthy');
console.log('📡 Subscription status for game game-123: SUBSCRIBED');
console.log('🔄 Reconnecting in 2000ms (attempt 2/5)');
console.log('🔄 Starting fallback polling mode');
console.log('✅ Stopped fallback polling mode');
```

### Health Metrics

```typescript
interface HealthMetrics {
  isConnected: boolean;
  isHealthy: boolean;
  lastConnected: Date | null;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  activeChannels: number;
  fallbackMode: boolean;
  uptime: number;
}
```

### Performance Monitoring

```typescript
// Monitor subscription performance
const startTime = Date.now();
const subscriptionId = manager.subscribeToGameUpdates(gameId, subscriberId, handler);
const subscriptionTime = Date.now() - startTime;
console.log(`Subscription created in ${subscriptionTime}ms`);

// Monitor update latency
const updateHandler = (gameData) => {
  const latency = Date.now() - gameData.updated_at;
  console.log(`Update received with ${latency}ms latency`);
};
```

## 🔧 Configuration

### Timing Configuration

```typescript
// Heartbeat interval (30 seconds)
private readonly HEARTBEAT_INTERVAL = 30000;

// Fallback polling interval (10 seconds)
private readonly POLLING_INTERVAL = 10000;

// Retry configuration
private readonly retryConfig: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};
```

### Environment-Specific Settings

```typescript
// Development: More verbose logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Enhanced Realtime Manager in development mode');
}

// Production: Reduced logging
if (process.env.NODE_ENV === 'production') {
  // Minimal logging for performance
}
```

## 🚨 Error Handling

### Common Error Scenarios

1. **WebSocket Connection Failure**: Automatic retry with exponential backoff
2. **Subscription Timeout**: Fallback to polling mode
3. **Network Interruption**: Heartbeat detection and reconnection
4. **Channel Creation Error**: Error logging and graceful degradation

### Error Recovery

```typescript
private handleConnectionError(error: Error | unknown): void {
  console.error('🚨 Connection error:', error);
  
  // Start fallback polling if not already active
  if (!this.fallbackMode) {
    this.startFallbackPolling();
  }
  
  // Attempt reconnection with exponential backoff
  this.scheduleReconnection();
}
```

## 🎯 Best Practices

### Subscription Management
- Always unsubscribe when components unmount
- Use unique subscriber IDs to avoid conflicts
- Handle connection status changes gracefully

### Performance Optimization
- Minimize the number of active subscriptions
- Use connection listeners sparingly
- Clean up resources properly

### Error Handling
- Monitor connection status in critical components
- Implement fallback UI for connection issues
- Log errors for debugging and monitoring
