# Server-Side Timer Synchronization System

## Overview

The server-side timer synchronization system provides authoritative timing for game phases, ensuring all players see identical countdown timers and automatic phase transitions occur simultaneously across all clients.

## Architecture

### Core Components

1. **Database Layer**: Timer fields and transition tracking
2. **Edge Functions**: Server-side timer monitoring and processing
3. **Client Hooks**: Server-synchronized timer display
4. **Real-time Events**: PubNub integration for timer broadcasts

## Database Schema

### Timer Fields in `games` Table

```sql
-- Timer synchronization fields
current_phase_duration INTEGER,     -- Duration of current phase in seconds
phase_expires_at TIMESTAMP WITH TIME ZONE  -- When current phase expires
```

### Game Transition Log Table

```sql
CREATE TABLE game_transition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  from_status game_status NOT NULL,
  to_status game_status NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Performance Indexes

```sql
-- Critical indexes for timer monitoring
CREATE INDEX idx_games_phase_expires_at ON games(phase_expires_at);
CREATE INDEX idx_games_timer_monitoring ON games(status, phase_expires_at);
CREATE INDEX idx_games_active_timers ON games(phase_expires_at, status, id);
```

## Database Functions

### `transition_game_status(game_uuid, new_status)`

Enhanced game transition function with timer logic:

- Sets `current_phase_duration` based on phase type
- Calculates `phase_expires_at` timestamp
- Maintains existing phase-specific timestamps
- Includes concurrency control and validation
- Logs transitions in `game_transition_log`

### `get_game_timer_state(game_uuid)`

Returns current timer state for a game:

```sql
RETURNS TABLE(
  time_remaining INTEGER,
  phase_duration INTEGER,
  phase_expires_at TIMESTAMP WITH TIME ZONE,
  server_time TIMESTAMP WITH TIME ZONE,
  phase game_status
)
```

### `find_expired_games(limit_count)`

Finds games with expired timers for monitoring:

```sql
RETURNS TABLE(
  game_id UUID,
  current_status game_status,
  phase_expires_at TIMESTAMP WITH TIME ZONE,
  phase_duration INTEGER
)
```

## Edge Functions

### `monitor-game-timers`

**Purpose**: Background timer monitoring (cron job)

**Frequency**: Every 10 seconds

**Authentication**: Requires service role key + cron secret

**Process**:
1. Acquires advisory lock to prevent overlapping executions
2. Finds expired games using `find_expired_games()`
3. Processes games in batches with concurrency limit
4. Handles timer expiration directly in function
5. Broadcasts timer expiration events via PubNub

**Request**:
```bash
curl -X POST /functions/v1/monitor-game-timers \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "x-cron-secret: CRON_SECRET" \
  -d '{}'
```

**Response**:
```json
{
  "processed": 1,
  "errors": 0,
  "skipped": 0,
  "executionTime": 245,
  "timestamp": "2025-06-26T10:33:42.969Z"
}
```

### `get-game-timer`

**Purpose**: Client timer synchronization

**Authentication**: Requires user authentication + game participation

**Request**:
```json
{
  "gameId": "uuid"
}
```

**Response**:
```json
{
  "timeRemaining": 45,
  "phaseDuration": 60,
  "phaseExpiresAt": "2025-06-26T10:35:00.000Z",
  "serverTime": "2025-06-26T10:34:15.000Z",
  "phase": "drawing"
}
```

### `handle-timer-expiration`

**Purpose**: Process individual timer expiration (called by monitor)

**Authentication**: Service role only

**Process**:
1. Validates game state and transition
2. Calls `transition_game_status()` database function
3. Broadcasts timer expiration event
4. Returns transition result

## Client-Side Integration

### `useServerTimer` Hook

Server-synchronized timer hook with fallback mechanisms:

```typescript
const {
  timeRemaining,
  isActive,
  isExpired,
  syncError,
  forceSync
} = useServerTimer({
  gameId: 'uuid',
  syncInterval: 10, // seconds
  onTimerExpired: () => console.log('Timer expired'),
  onSyncError: (error) => console.error('Sync error:', error)
});
```

**Features**:
- Server synchronization every 10 seconds
- Client-side countdown between syncs
- Fallback to direct database queries
- Error handling and recovery

### Updated Components

- **GameTimer**: Uses `useServerTimer` for display
- **GameContext**: Maintains timer state for backward compatibility
- **useGameTimer**: Enhanced with server synchronization option

## Real-time Events

### New Event Types

```typescript
// Server-authoritative timer sync
interface ServerTimerSyncEvent {
  type: 'server_timer_sync';
  data: {
    phaseStartedAt: string;
    phaseDuration: number;
    serverTime: string;
    timeRemaining: number;
    phase: GameStatus;
    phaseExpiresAt: string;
  };
}

// Timer expiration notification
interface TimerExpiredEvent {
  type: 'timer_expired';
  data: {
    expiredPhase: GameStatus;
    nextPhase: GameStatus;
    expiredAt: string;
    transitionTriggeredBy: 'server_timer';
    executionId?: string;
  };
}
```

## Deployment

### Environment Variables

```bash
# Required for Edge Functions
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

### Production Cron Setup

Set up a cron job to call the monitor function every 10 seconds:

```bash
# Example using curl
*/10 * * * * curl -X POST https://your-project.supabase.co/functions/v1/monitor-game-timers \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -d '{}'
```

### Local Development

```bash
# Start Supabase services
npx supabase start

# Serve Edge Functions
npx supabase functions serve

# Run local timer monitor
node scripts/local-timer-monitor.js
```

## Testing

### Test Scripts

```bash
# Create test game with expired timer
node scripts/create-persistent-test-game.js

# Test database functions directly
node scripts/test-database-timer-functions.js

# Test specific game transitions
node scripts/test-specific-game.js

# Run continuous timer monitoring
node scripts/local-timer-monitor.js
```

### Validation

```bash
# Validate implementation
node scripts/validate-timer-implementation.js
```

## Performance Considerations

### Database Optimization

- **Indexes**: Critical indexes on timer fields for fast queries
- **Batch Processing**: Processes expired games in chunks of 5
- **Advisory Locking**: Prevents overlapping monitor executions
- **Efficient Queries**: Uses optimized RPC functions

### Concurrency Control

- **Race Condition Prevention**: Advisory locks and transition logging
- **Conflict Resolution**: Manual transitions take priority over timer
- **Idempotency**: Duplicate transitions are safely ignored

### Error Handling

- **Graceful Degradation**: Client fallback to database queries
- **Retry Logic**: Automatic retry for transient failures
- **Comprehensive Logging**: Detailed logs for debugging

## Monitoring

### Key Metrics

- **Processing Time**: ~160-200ms per monitor execution
- **Success Rate**: Games processed vs errors
- **Transition Accuracy**: Timer expiration precision

### Logs

Monitor function logs include:
- Games processed/skipped/errors
- Execution time and timestamp
- Individual game transition details
- Error messages and stack traces

## Security

### Authentication

- **Monitor Function**: Service role key + cron secret
- **Client Functions**: User authentication + game participation
- **Database Functions**: RLS policies enforced

### Validation

- **Input Validation**: UUID format, status validation
- **Game Participation**: Users can only access their games
- **Transition Logic**: Validates legal phase transitions

## Troubleshooting

### Common Issues

1. **"Missing authorization header"**: Ensure service role key is provided
2. **"Unauthorized cron execution"**: Check CRON_SECRET configuration
3. **Timer not updating**: Verify Edge Functions are running
4. **Sync errors**: Check network connectivity and fallback logic

### Debug Tools

```bash
# Check expired games
SELECT * FROM find_expired_games(10);

# View transition log
SELECT * FROM game_transition_log ORDER BY created_at DESC LIMIT 10;

# Test timer state
SELECT * FROM get_game_timer_state('game-uuid');
```

## Migration

The system was implemented via migration `20250626000001_server_side_timer_synchronization.sql` which includes:

- Timer field additions
- Transition log table creation
- Performance indexes
- Enhanced database functions
- Advisory locking functions

## Future Enhancements

- **Distributed Locking**: For multi-region deployments
- **Timer Precision**: Sub-second timer accuracy
- **Load Balancing**: Multiple monitor instances
- **Metrics Dashboard**: Real-time monitoring UI
