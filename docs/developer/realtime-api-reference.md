# Real-time API Reference - Developer Documentation

## Overview

This document provides a comprehensive API reference for developers working with the SketchyAF real-time communication system. It includes usage examples, best practices, and troubleshooting guidance.

## Quick Start

### Basic Setup

```typescript
import { RealtimeGameService } from '../services/RealtimeGameService';
import { useAuth } from '../context/AuthContext';

// Get the singleton instance
const realtimeService = RealtimeGameService.getInstance();

// Initialize with authenticated user
const { currentUser } = useAuth();
await realtimeService.initialize(currentUser);
```

### Joining a Game

```typescript
// Join a game channel
const result = await realtimeService.joinGame('game-123');
if (result.success) {
  console.log('Successfully joined game');
} else {
  console.error('Failed to join game:', result.error);
}
```

## API Reference

### RealtimeGameService

#### Methods

##### `initialize(user: User): Promise<ServiceResponse<void>>`

Initializes the real-time service with an authenticated user.

**Parameters:**
- `user` - Authenticated user object from Supabase

**Returns:**
- `ServiceResponse<void>` - Success/failure response

**Example:**
```typescript
const result = await realtimeService.initialize(currentUser);
if (!result.success) {
  console.error('Initialization failed:', result.error);
}
```

##### `joinGame(gameId: string): Promise<ServiceResponse<void>>`

Joins a game channel for real-time communication.

**Parameters:**
- `gameId` - Unique game identifier

**Returns:**
- `ServiceResponse<void>` - Success/failure response

**Example:**
```typescript
const result = await realtimeService.joinGame('game-abc123');
```

##### `leaveGame(): Promise<ServiceResponse<void>>`

Leaves the current game channel.

**Returns:**
- `ServiceResponse<void>` - Success/failure response

##### `broadcastPlayerReady(isReady: boolean, selectedBoosterPack?: string): Promise<ServiceResponse<void>>`

Broadcasts player ready status to other players.

**Parameters:**
- `isReady` - Whether the player is ready
- `selectedBoosterPack` - Optional booster pack selection

**Example:**
```typescript
await realtimeService.broadcastPlayerReady(true, 'animals-pack');
```

##### `broadcastPhaseChange(newPhase: GameStatus, previousPhase: GameStatus, phaseDuration?: number): Promise<ServiceResponse<void>>`

Broadcasts game phase transitions.

**Parameters:**
- `newPhase` - New game phase
- `previousPhase` - Previous game phase  
- `phaseDuration` - Optional phase duration in seconds

##### `broadcastTimerSync(timeRemaining: number, phase: GameStatus, totalDuration: number): Promise<ServiceResponse<void>>`

Synchronizes game timers across all players.

**Parameters:**
- `timeRemaining` - Time remaining in seconds
- `phase` - Current game phase
- `totalDuration` - Total phase duration

##### `broadcastDrawingSubmitted(submissionId: string, elementCount?: number, drawingTimeSeconds?: number): Promise<ServiceResponse<void>>`

Notifies other players of drawing submission.

**Parameters:**
- `submissionId` - Unique submission identifier
- `elementCount` - Number of drawing elements
- `drawingTimeSeconds` - Time spent drawing

##### `broadcastVoteCast(submissionId: string, totalVotes?: number): Promise<ServiceResponse<void>>`

Broadcasts vote casting events.

**Parameters:**
- `submissionId` - Submission being voted for
- `totalVotes` - Current total vote count

##### `getGamePresence(): Promise<ServiceResponse<string[]>>`

Gets current players in the game.

**Returns:**
- `ServiceResponse<string[]>` - Array of user IDs

##### `addEventListener(eventType: GameEventType, handler: GameEventHandler): void`

Adds an event listener for specific game events.

**Parameters:**
- `eventType` - Type of event to listen for
- `handler` - Function to handle the event

**Example:**
```typescript
realtimeService.addEventListener('player_joined', (event) => {
  console.log('Player joined:', event.data.username);
});
```

##### `removeEventListener(eventType: GameEventType, handler: GameEventHandler): void`

Removes an event listener.

##### `getConnectionStatus(): ConnectionStatus`

Gets current connection status.

**Returns:**
- `ConnectionStatus` - Current connection state

## React Hook Usage

### useRealtimeGame Hook

```typescript
import { useRealtimeGame } from '../hooks/useRealtimeGame';

const MyComponent = () => {
  const {
    isConnected,
    connectionStatus,
    activeGameId,
    gamePresence,
    joinGame,
    leaveGame,
    broadcastPlayerReady,
    addEventListener,
    error
  } = useRealtimeGame({ gameId: 'game-123' });

  useEffect(() => {
    const handlePlayerJoined = (event) => {
      console.log('New player:', event.data.username);
    };

    addEventListener('player_joined', handlePlayerJoined);
    
    return () => {
      removeEventListener('player_joined', handlePlayerJoined);
    };
  }, [addEventListener, removeEventListener]);

  return (
    <div>
      <p>Status: {connectionStatus}</p>
      <p>Players: {gamePresence.length}</p>
      {error && <p>Error: {error}</p>}
    </div>
  );
};
```

## Event Handling Best Practices

### Event Listener Management

```typescript
// ✅ Good: Clean up event listeners
useEffect(() => {
  const handler = (event) => { /* handle event */ };
  realtimeService.addEventListener('player_joined', handler);
  
  return () => {
    realtimeService.removeEventListener('player_joined', handler);
  };
}, []);

// ❌ Bad: Memory leak from not cleaning up
useEffect(() => {
  realtimeService.addEventListener('player_joined', handler);
  // Missing cleanup
}, []);
```

### Error Handling

```typescript
// ✅ Good: Handle errors gracefully
const handleBroadcast = async () => {
  try {
    const result = await realtimeService.broadcastPlayerReady(true);
    if (!result.success) {
      showErrorMessage(result.error);
    }
  } catch (error) {
    showErrorMessage('Network error occurred');
  }
};

// ❌ Bad: Unhandled errors
const handleBroadcast = async () => {
  await realtimeService.broadcastPlayerReady(true); // May throw
};
```

### Connection Status Monitoring

```typescript
// ✅ Good: Monitor connection status
const [isOnline, setIsOnline] = useState(false);

useEffect(() => {
  const handleStatusChange = (status) => {
    setIsOnline(status === 'connected');
    
    if (status === 'disconnected') {
      showOfflineIndicator();
    } else if (status === 'connected') {
      hideOfflineIndicator();
    }
  };

  realtimeService.addConnectionStatusListener(handleStatusChange);
  
  return () => {
    realtimeService.removeConnectionStatusListener(handleStatusChange);
  };
}, []);
```

## Common Patterns

### Game Flow Management

```typescript
// Complete game flow with real-time events
const GameManager = () => {
  const [gamePhase, setGamePhase] = useState('waiting');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Handle phase changes
    realtimeService.addEventListener('phase_changed', (event) => {
      setGamePhase(event.data.newPhase);
    });

    // Handle player events
    realtimeService.addEventListener('player_joined', (event) => {
      setPlayers(prev => [...prev, event.data]);
    });

    realtimeService.addEventListener('player_left', (event) => {
      setPlayers(prev => prev.filter(p => p.userId !== event.userId));
    });

    return () => {
      // Cleanup all listeners
    };
  }, []);

  const startGame = async () => {
    await realtimeService.broadcastPhaseChange('drawing', 'waiting', 180);
  };

  return (
    <div>
      <h2>Game Phase: {gamePhase}</h2>
      <PlayerList players={players} />
      {gamePhase === 'waiting' && (
        <button onClick={startGame}>Start Game</button>
      )}
    </div>
  );
};
```

### Timer Synchronization

```typescript
const GameTimer = ({ duration, phase }) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const { broadcastTimerSync } = useRealtimeGame();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1);
        
        // Broadcast sync every 10 seconds
        if (newTime % 10 === 0) {
          broadcastTimerSync(newTime, phase, duration);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, phase, broadcastTimerSync]);

  // Listen for timer sync from other players
  useEffect(() => {
    const handleTimerSync = (event) => {
      if (event.data.phase === phase) {
        setTimeRemaining(event.data.timeRemaining);
      }
    };

    realtimeService.addEventListener('timer_sync', handleTimerSync);
    
    return () => {
      realtimeService.removeEventListener('timer_sync', handleTimerSync);
    };
  }, [phase]);

  return <div>Time: {timeRemaining}s</div>;
};
```

## Debugging and Troubleshooting

### Debug Logging

```typescript
// Enable debug logging
localStorage.setItem('debug', 'pubnub:*');

// Check connection status
console.log('Connection:', realtimeService.getConnectionStatus());

// Monitor error statistics
const errorHandler = RealtimeErrorHandler.getInstance();
console.log('Error stats:', errorHandler.getErrorStats());
```

### Common Issues

#### Connection Problems

```typescript
// Check if properly initialized
if (!realtimeService.getConnectionStatus() === 'connected') {
  console.error('Service not connected');
}

// Verify API keys
if (!import.meta.env.VITE_PUBNUB_PUBLISH_KEY) {
  console.error('Missing PubNub publish key');
}
```

#### Event Not Received

```typescript
// Verify event listener is set up correctly
realtimeService.addEventListener('player_joined', (event) => {
  console.log('Received event:', event);
});

// Check if in correct game channel
const presence = await realtimeService.getGamePresence();
console.log('Current players:', presence.data);
```

#### Performance Issues

```typescript
// Monitor message frequency
let messageCount = 0;
realtimeService.addEventListener('timer_sync', () => {
  messageCount++;
  console.log('Messages per minute:', messageCount);
});

// Reset counter every minute
setInterval(() => { messageCount = 0; }, 60000);
```

## Testing Guidelines

### Unit Testing

```typescript
// Mock the real-time service for testing
vi.mock('../services/RealtimeGameService', () => ({
  RealtimeGameService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue({ success: true }),
      joinGame: vi.fn().mockResolvedValue({ success: true }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  }
}));
```

### Integration Testing

```typescript
// Test multi-client scenarios
const service1 = RealtimeGameService.getInstance();
const service2 = RealtimeGameService.getInstance();

await service1.initialize(user1);
await service2.initialize(user2);

const events = [];
service2.addEventListener('player_joined', (event) => {
  events.push(event);
});

await service1.joinGame('test-game');
// Verify service2 receives the event
```

## Performance Optimization

### Message Batching

```typescript
// Batch non-critical events
const eventQueue = [];
const flushInterval = 1000; // 1 second

const queueEvent = (event) => {
  eventQueue.push(event);
};

setInterval(() => {
  if (eventQueue.length > 0) {
    // Send batched events
    realtimeService.publishBatchedEvents(eventQueue);
    eventQueue.length = 0;
  }
}, flushInterval);
```

### Connection Optimization

```typescript
// Optimize for game performance
const optimizedConfig = {
  heartbeatInterval: 60,
  presenceTimeout: 120,
  suppressLeaveEvents: false,
  announceSuccessfulHeartbeats: false
};
```
