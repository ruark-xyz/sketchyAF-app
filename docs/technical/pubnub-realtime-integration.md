# PubNub Real-time Integration - Technical Documentation

## Overview

This document provides technical documentation for the PubNub real-time communication system implemented for SketchyAF multiplayer functionality. The system focuses on essential game coordination features for MVP, including player presence tracking, game room management, live voting, and basic game state synchronization.

## Architecture

### Core Components

1. **PubNubGameService** (`src/services/PubNubService.ts`)
   - Low-level PubNub SDK wrapper
   - Handles connection management, channel subscriptions, and message publishing
   - Implements retry logic and error handling

2. **RealtimeGameService** (`src/services/RealtimeGameService.ts`)
   - High-level game-specific real-time service
   - Provides game event broadcasting and subscription management
   - Integrates with existing game services

3. **Real-time Types** (`src/types/realtime.ts`)
   - TypeScript interfaces for all real-time events and configurations
   - Event schema definitions and validation types

4. **Error Handling** (`src/utils/realtimeErrorHandler.ts`)
   - Robust error handling with retry mechanisms
   - Circuit breaker pattern for preventing cascading failures
   - Graceful degradation utilities

## Event Schema

### Base Event Structure

```typescript
interface GameEvent {
  type: GameEventType;
  gameId: string;
  userId: string;
  timestamp: number;
  data?: any;
  version: string;
}
```

### Supported Event Types (MVP Scope)

- `player_joined` - Player joins game
- `player_left` - Player leaves game  
- `player_ready` - Player ready state change
- `game_started` - Game begins
- `phase_changed` - Game phase transitions
- `timer_sync` - Timer synchronization
- `drawing_submitted` - Drawing submission
- `vote_cast` - Vote casting
- `game_completed` - Game completion
- `connection_status` - Connection status updates

## Channel Management

### Channel Naming Convention

- **Game Channel**: `game-{gameId}` - Main game events and coordination
- **Presence Channel**: `presence-{gameId}` - Player presence tracking

### Channel Security

- Channels restricted to game participants only
- Message validation prevents malicious events
- Rate limiting prevents spam and abuse

## Configuration

### Environment Variables

```bash
VITE_PUBNUB_PUBLISH_KEY=your_pubnub_publish_key_here
VITE_PUBNUB_SUBSCRIBE_KEY=your_pubnub_subscribe_key_here
```

### PubNub Configuration

```typescript
const config: PubNubConfig = {
  publishKey: process.env.VITE_PUBNUB_PUBLISH_KEY,
  subscribeKey: process.env.VITE_PUBNUB_SUBSCRIBE_KEY,
  userId: user.id, // From Supabase authentication
  ssl: true,
  heartbeatInterval: 60, // seconds
  presenceTimeout: 120, // seconds
  restore: true,
  autoNetworkDetection: true
};
```

## Connection Management

### Connection States

- `connecting` - Establishing connection
- `connected` - Successfully connected
- `reconnecting` - Attempting to reconnect
- `disconnected` - Not connected
- `error` - Connection error

### Heartbeat and Presence

- Heartbeat interval: 60 seconds (configurable)
- Presence timeout: 120 seconds (configurable)
- Automatic presence detection for player join/leave events

### Network Failure Recovery

- Automatic reconnection with exponential backoff
- Message retry mechanism with configurable attempts
- Circuit breaker pattern to prevent cascading failures
- Graceful degradation for poor connections

## Error Handling

### Error Types

- `PUBNUB_INIT_FAILED` - PubNub initialization failure
- `CHANNEL_JOIN_FAILED` - Channel subscription failure
- `PUBLISH_FAILED` - Message publishing failure
- `SUBSCRIPTION_FAILED` - Event subscription failure
- `CONNECTION_FAILED` - Connection establishment failure
- `PRESENCE_FAILED` - Presence tracking failure
- `NETWORK_ERROR` - Network connectivity issues
- `RATE_LIMITED` - Rate limit exceeded
- `AUTHENTICATION_FAILED` - Authentication failure

### Retry Logic

```typescript
const publishWithRetry = async (event: GameEvent, maxRetries = 3) => {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      await pubnub.publish({ channel, message: event });
      return; // Success
    } catch (error) {
      attempts++;
      if (attempts >= maxRetries) throw error;
      
      // Exponential backoff
      const delay = Math.pow(2, attempts) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

## Performance Optimization

### Message Optimization

- Events published without history storage for better performance
- Message deduplication for critical events
- Batch processing for non-critical events
- Efficient JSON serialization

### Connection Optimization

- Optimized heartbeat intervals for game performance
- Reduced message overhead with minimal metadata
- Connection pooling and reuse
- Efficient presence tracking

## Security Considerations

### Message Security

- All messages encrypted in transit (SSL/TLS)
- Message authentication to verify sender
- Input sanitization for all event data
- Protection against message replay attacks

### Anti-cheat Measures

- Server-side validation of all game events
- Timestamp verification for event ordering
- Detection of impossible game state transitions
- Monitoring for suspicious activity patterns

## Integration Points

### Authentication Integration

```typescript
// Link PubNub user IDs with Supabase authentication
const userId = user.id; // From Supabase auth context
await realtimeService.initialize(user);
```

### Game Service Integration

```typescript
// Broadcast events when game state changes
await GameService.transitionGameStatus(gameId, newStatus);
// Automatically broadcasts phase_changed event
```

### UI Component Integration

```typescript
// React hook for real-time functionality
const { isConnected, joinGame, addEventListener } = useRealtimeGame();

// Event handling in components
useEffect(() => {
  addEventListener('player_joined', handlePlayerJoined);
  return () => removeEventListener('player_joined', handlePlayerJoined);
}, []);
```

## Monitoring and Debugging

### Logging

- Comprehensive logging for all real-time operations
- Error tracking with context and stack traces
- Performance metrics for message delivery
- Connection status monitoring

### Debug Tools

- Connection status indicators in UI
- Real-time event monitoring dashboard
- Error statistics and reporting
- Network performance metrics

## Testing Strategy

### Unit Tests

- PubNub service initialization and configuration
- Event publishing and subscription mechanisms
- Message validation and sanitization
- Presence tracking functionality
- Connection status management

### Integration Tests

- Multi-client real-time synchronization
- Network failure and recovery scenarios
- High-load concurrent messaging
- Cross-platform compatibility
- End-to-end game event flow

### Performance Tests

- Message delivery latency under load
- Connection scalability testing
- Memory usage with multiple channels
- Battery impact on mobile devices

## Deployment Considerations

### Environment Setup

- PubNub account configured with appropriate limits
- API keys secured in environment variables
- Channel permissions and access control configured
- Monitoring and analytics enabled

### Production Readiness

- Load balancing for high availability
- Backup communication channels configured
- Performance monitoring dashboards
- Incident response procedures documented

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check API keys configuration
   - Verify network connectivity
   - Review firewall settings

2. **Message Delivery Issues**
   - Check rate limits
   - Verify channel permissions
   - Review message format

3. **Presence Tracking Problems**
   - Check heartbeat configuration
   - Verify presence timeout settings
   - Review connection stability

### Debug Commands

```typescript
// Check connection status
const status = realtimeService.getConnectionStatus();

// Get current presence
const presence = await realtimeService.getGamePresence();

// Monitor error statistics
const stats = RealtimeErrorHandler.getInstance().getErrorStats();
```

## Future Enhancements

### Planned Features (Post-MVP)

- Real-time drawing stroke synchronization
- High-frequency drawing events
- Complex message queuing for offline players
- Advanced message compression
- Millisecond-precision event timing
- Separate channels for drawing/voting phases

### Scalability Improvements

- Message batching optimization
- Connection pooling enhancements
- Advanced caching strategies
- Load balancing improvements
