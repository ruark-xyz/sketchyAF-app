# Timer System API Reference

## Edge Functions

### `monitor-game-timers`

**Purpose**: Background timer monitoring for automatic phase transitions

**Method**: `POST`

**URL**: `/functions/v1/monitor-game-timers`

**Authentication**: Service Role + Cron Secret

**Headers**:
```http
Authorization: Bearer <SERVICE_ROLE_KEY>
x-cron-secret: <CRON_SECRET>
Content-Type: application/json
```

**Request Body**:
```json
{}
```

**Response**:
```json
{
  "processed": 1,
  "errors": 0,
  "skipped": 2,
  "executionTime": 245,
  "timestamp": "2025-06-26T10:33:42.969Z",
  "message": "No expired games found"
}
```

**Response Fields**:
- `processed`: Number of games successfully transitioned
- `errors`: Number of games that failed to transition
- `skipped`: Number of games skipped (already processed, invalid state, etc.)
- `executionTime`: Execution time in milliseconds
- `timestamp`: ISO timestamp of execution
- `message`: Optional status message

**Error Responses**:

```json
// 401 - Unauthorized
{
  "error": "Unauthorized cron execution",
  "debug": {
    "receivedSecret": "missing",
    "expectedSecret": "present"
  }
}

// 500 - Internal Error
{
  "processed": 0,
  "errors": 1,
  "skipped": 0,
  "executionTime": 1234,
  "timestamp": "2025-06-26T10:33:42.969Z",
  "error": "Database query failed"
}
```

**Example Usage**:
```bash
curl -X POST http://localhost:54321/functions/v1/monitor-game-timers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-cron-secret: local-dev-secret-123" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### `get-game-timer`

**Purpose**: Get current timer state for client synchronization

**Method**: `POST`

**URL**: `/functions/v1/get-game-timer`

**Authentication**: User Token + Game Participation

**Headers**:
```http
Authorization: Bearer <USER_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000"
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

**Response Fields**:
- `timeRemaining`: Seconds remaining in current phase (null if no active timer)
- `phaseDuration`: Total duration of current phase in seconds
- `phaseExpiresAt`: ISO timestamp when phase expires
- `serverTime`: Current server time (ISO timestamp)
- `phase`: Current game phase/status

**Error Responses**:

```json
// 400 - Invalid Request
{
  "error": "Invalid gameId format"
}

// 401 - Unauthorized
{
  "error": "Authentication required"
}

// 403 - Forbidden
{
  "error": "Access denied: not a participant in this game"
}

// 404 - Not Found
{
  "error": "Game not found"
}

// 500 - Internal Error
{
  "error": "Failed to fetch timer data"
}
```

**Example Usage**:
```bash
curl -X POST http://localhost:54321/functions/v1/get-game-timer \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"gameId": "550e8400-e29b-41d4-a716-446655440000"}'
```

---

### `handle-timer-expiration`

**Purpose**: Process individual timer expiration (internal use)

**Method**: `POST`

**URL**: `/functions/v1/handle-timer-expiration`

**Authentication**: Service Role

**Headers**:
```http
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json
```

**Request Body**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "currentStatus": "drawing",
  "executionId": "1640995200000-abc123def"
}
```

**Response**:
```json
{
  "success": true,
  "transitioned": "drawing -> voting",
  "executionId": "1640995200000-abc123def"
}
```

**Skipped Response**:
```json
{
  "success": true,
  "skipped": true,
  "reason": "already_transitioned",
  "transitioned": "drawing -> voting (already done)"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Cannot transition to voting: no submissions found",
  "details": { /* error details */ }
}
```

**Response Fields**:
- `success`: Whether the operation succeeded
- `transitioned`: Description of transition performed
- `skipped`: Whether the operation was skipped
- `reason`: Reason for skipping (if applicable)
- `executionId`: Execution ID for tracking
- `error`: Error message (if failed)

---

## Database Functions

### `get_game_timer_state(game_uuid)`

**Purpose**: Get current timer state for a specific game

**Parameters**:
- `game_uuid`: UUID of the game

**Returns**:
```sql
TABLE(
  time_remaining INTEGER,
  phase_duration INTEGER,
  phase_expires_at TIMESTAMP WITH TIME ZONE,
  server_time TIMESTAMP WITH TIME ZONE,
  phase game_status
)
```

**Example**:
```sql
SELECT * FROM get_game_timer_state('550e8400-e29b-41d4-a716-446655440000');
```

---

### `find_expired_games(limit_count)`

**Purpose**: Find games with expired timers

**Parameters**:
- `limit_count`: Maximum number of games to return (default: 50)

**Returns**:
```sql
TABLE(
  game_id UUID,
  current_status game_status,
  phase_expires_at TIMESTAMP WITH TIME ZONE,
  phase_duration INTEGER
)
```

**Example**:
```sql
SELECT * FROM find_expired_games(10);
```

---

### `transition_game_status(game_uuid, new_status)`

**Purpose**: Transition game to new status with timer updates

**Parameters**:
- `game_uuid`: UUID of the game
- `new_status`: New game status to transition to

**Returns**: `BOOLEAN` (success/failure)

**Example**:
```sql
SELECT transition_game_status('550e8400-e29b-41d4-a716-446655440000', 'drawing');
```

---

### `acquire_advisory_lock(lock_key, timeout_seconds)`

**Purpose**: Acquire advisory lock for concurrency control

**Parameters**:
- `lock_key`: String key for the lock
- `timeout_seconds`: Timeout in seconds (default: 10)

**Returns**: `BOOLEAN` (lock acquired/failed)

**Example**:
```sql
SELECT acquire_advisory_lock('timer_monitoring_lock', 5);
```

---

### `release_advisory_lock(lock_key)`

**Purpose**: Release advisory lock

**Parameters**:
- `lock_key`: String key for the lock

**Returns**: `BOOLEAN` (lock released/failed)

**Example**:
```sql
SELECT release_advisory_lock('timer_monitoring_lock');
```

---

## Real-time Events

### `server_timer_sync`

**Purpose**: Broadcast server-authoritative timer state

**Event Data**:
```json
{
  "type": "server_timer_sync",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "server",
  "timestamp": 1640995200000,
  "version": "1.0.0",
  "data": {
    "phaseStartedAt": "2025-06-26T10:33:00.000Z",
    "phaseDuration": 60,
    "serverTime": "2025-06-26T10:34:15.000Z",
    "timeRemaining": 45,
    "phase": "drawing",
    "phaseExpiresAt": "2025-06-26T10:35:00.000Z"
  }
}
```

---

### `timer_expired`

**Purpose**: Notify clients of timer expiration and phase transition

**Event Data**:
```json
{
  "type": "timer_expired",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "server",
  "timestamp": 1640995200000,
  "version": "1.0.0",
  "data": {
    "expiredPhase": "drawing",
    "nextPhase": "voting",
    "expiredAt": "2025-06-26T10:35:00.000Z",
    "transitionTriggeredBy": "server_timer",
    "executionId": "1640995200000-abc123def"
  }
}
```

---

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 400 | Invalid request format | Check request body and parameters |
| 401 | Missing/invalid authentication | Provide valid Authorization header |
| 403 | Access denied | Ensure user is game participant |
| 404 | Game not found | Verify game ID exists |
| 405 | Method not allowed | Use POST method |
| 500 | Internal server error | Check logs and retry |

---

## Rate Limits

- **monitor-game-timers**: No rate limit (cron job)
- **get-game-timer**: 60 requests/minute per user
- **handle-timer-expiration**: No rate limit (internal use)

---

## Testing

### Local Testing URLs

```bash
# Monitor function
http://localhost:54321/functions/v1/monitor-game-timers

# Get timer function  
http://localhost:54321/functions/v1/get-game-timer

# Handle expiration function
http://localhost:54321/functions/v1/handle-timer-expiration
```

### Production URLs

```bash
# Monitor function
https://your-project.supabase.co/functions/v1/monitor-game-timers

# Get timer function
https://your-project.supabase.co/functions/v1/get-game-timer

# Handle expiration function
https://your-project.supabase.co/functions/v1/handle-timer-expiration
```
