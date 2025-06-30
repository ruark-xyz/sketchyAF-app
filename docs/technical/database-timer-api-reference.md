# Database Timer Monitoring - API Reference

## Overview

This document provides a comprehensive API reference for the Database Timer Monitoring System, which replaced the previous Edge Function approach with a high-performance database solution.

## Database Functions

### `monitor_game_timers_db()`

**Purpose**: Main timer monitoring function that processes expired games and handles phase transitions.

**Type**: Database Function (PostgreSQL)

**Execution**: Called by Supabase cron job every 10 seconds in production

**Parameters**: None

**Returns**: Table with execution results

```sql
-- Function signature
monitor_game_timers_db() 
RETURNS TABLE(
  processed INTEGER,
  errors INTEGER,
  skipped INTEGER,
  execution_time_ms INTEGER,
  result_timestamp TIMESTAMP WITH TIME ZONE,
  details JSONB
)
```

**Example Usage**:
```sql
-- Execute timer monitoring
SELECT * FROM monitor_game_timers_db();
```

**Example Response**:
```sql
 processed | errors | skipped | execution_time_ms |      result_timestamp       |                    details                    
-----------+--------+---------+-------------------+-----------------------------+-----------------------------------------------
         1 |      0 |       0 |                 0 | 2025-06-30 07:43:34.206+00 | {"processed": 1, "errors": 0, "games": [...]}
```

**Response Fields**:
- `processed`: Number of games successfully transitioned
- `errors`: Number of games that encountered errors
- `skipped`: Number of games skipped (no valid transition)
- `execution_time_ms`: Database execution time in milliseconds
- `result_timestamp`: When the function completed execution
- `details`: JSON object with detailed processing information

**Details JSON Structure**:
```json
{
  "processed": 1,
  "errors": 0,
  "skipped": 0,
  "games": [
    {
      "game_id": "f26d6453-dd76-40bf-8ac8-9a726f664d2f",
      "action": "transitioned",
      "from_status": "briefing",
      "to_status": "drawing",
      "expired_at": "2025-06-30T07:43:29.206Z"
    }
  ],
  "lock_acquired": true,
  "function_version": "database_v1.0"
}
```

### `get_timer_monitoring_stats()`

**Purpose**: Retrieve current timer monitoring statistics and system health information.

**Parameters**: None

**Returns**: Table with system statistics

```sql
-- Function signature
get_timer_monitoring_stats()
RETURNS TABLE(
  active_games INTEGER,
  expired_games INTEGER,
  games_by_status JSONB,
  next_expiration TIMESTAMP WITH TIME ZONE,
  advisory_locks JSONB
)
```

**Example Usage**:
```sql
SELECT * FROM get_timer_monitoring_stats();
```

**Example Response**:
```sql
 active_games | expired_games |           games_by_status           |      next_expiration       | advisory_locks 
--------------+---------------+------------------------------------+----------------------------+----------------
            2 |             0 | {"drawing": 1, "voting": 1}       | 2025-06-30 08:15:00.000+00 | []
```

### `get_production_timer_stats()`

**Purpose**: Enhanced statistics function for production monitoring with additional system health metrics.

**Parameters**: None

**Returns**: Table with comprehensive production statistics

```sql
-- Function signature
get_production_timer_stats()
RETURNS TABLE(
  active_games INTEGER,
  expired_games INTEGER,
  games_by_status JSONB,
  next_expiration TIMESTAMP WITH TIME ZONE,
  advisory_locks JSONB,
  performance_metrics JSONB,
  system_health JSONB
)
```

**Example Usage**:
```sql
SELECT * FROM get_production_timer_stats();
```

## Configuration Functions

### `get_service_role_key()`

**Purpose**: Securely retrieve service role key from Supabase Vault for Edge Function authentication.

**Parameters**: None

**Returns**: TEXT (service role key or NULL if not available)

```sql
-- Function signature
get_service_role_key() RETURNS TEXT
```

**Example Usage**:
```sql
-- Check if vault key is available
SELECT get_service_role_key() IS NOT NULL as has_vault_key;
```

### `get_supabase_url()`

**Purpose**: Auto-detect environment and return appropriate Supabase URL for Edge Function calls.

**Parameters**: None

**Returns**: TEXT (Supabase URL for current environment)

```sql
-- Function signature
get_supabase_url() RETURNS TEXT
```

**Example Usage**:
```sql
-- Check detected environment
SELECT get_supabase_url() as detected_environment;
```

### Vault Configuration Setup

**Purpose**: Configure production environment using Supabase Vault for secure key storage.

**CLI Command**:
```bash
# Store service role key in vault
npx supabase secrets set DATABASE_SERVICE_ROLE_KEY="your-production-service-role-key"
```

**Verification**:
```sql
-- Verify vault configuration
SELECT get_service_role_key() IS NOT NULL as vault_configured;
SELECT get_supabase_url() as environment_detected;
```

### `configure_local_pubnub_testing()`

**Purpose**: Configure local development settings for PubNub testing.

**Parameters**: None

**Returns**: BOOLEAN (success/failure)

```sql
-- Function signature
configure_local_pubnub_testing() RETURNS BOOLEAN
```

**Example Usage**:
```sql
SELECT configure_local_pubnub_testing();
```

## Verification Functions

### `verify_production_deployment()`

**Purpose**: Verify that all components of the timer monitoring system are properly deployed.

**Parameters**: None

**Returns**: Table with deployment verification results

```sql
-- Function signature
verify_production_deployment()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
)
```

**Example Usage**:
```sql
SELECT * FROM verify_production_deployment();
```

**Example Response**:
```sql
     check_name      | status |                    details                    
--------------------+--------+-----------------------------------------------
 monitor_function   | PASS   | Database timer monitoring function availability
 advisory_locks     | PASS   | Enhanced advisory lock system availability
 broadcast_function | PASS   | PubNub broadcasting function availability
 phase_change_trigger| PASS   | Phase change trigger installation
 timer_indexes      | PASS   | Timer monitoring performance indexes
 production_config  | CONFIGURED | Production configuration settings
```

### `test_local_pubnub_broadcasting()`

**Purpose**: Test PubNub broadcasting functionality in local development.

**Parameters**: None

**Returns**: Table with test results

```sql
-- Function signature
test_local_pubnub_broadcasting()
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  details TEXT
)
```

**Example Usage**:
```sql
SELECT * FROM test_local_pubnub_broadcasting();
```

## Advisory Lock Functions

### `acquire_advisory_lock_enhanced()`

**Purpose**: Acquire an enhanced advisory lock with metadata tracking.

**Parameters**:
- `p_lock_key` (TEXT): Unique lock identifier
- `p_timeout_seconds` (INTEGER): Lock timeout in seconds (default: 10)
- `p_acquired_by` (TEXT): Identifier of the lock acquirer (default: 'unknown')

**Returns**: BOOLEAN (lock acquired/not acquired)

```sql
-- Function signature
acquire_advisory_lock_enhanced(
  p_lock_key TEXT,
  p_timeout_seconds INTEGER DEFAULT 10,
  p_acquired_by TEXT DEFAULT 'unknown'
) RETURNS BOOLEAN
```

**Example Usage**:
```sql
SELECT acquire_advisory_lock_enhanced('monitor_game_timers', 60, 'cron_job');
```

### `release_advisory_lock_enhanced()`

**Purpose**: Release an enhanced advisory lock and clean up metadata.

**Parameters**:
- `p_lock_key` (TEXT): Lock identifier to release

**Returns**: BOOLEAN (lock released/not found)

```sql
-- Function signature
release_advisory_lock_enhanced(p_lock_key TEXT) RETURNS BOOLEAN
```

**Example Usage**:
```sql
SELECT release_advisory_lock_enhanced('monitor_game_timers');
```

### `get_advisory_lock_status()`

**Purpose**: Get status of all active advisory locks.

**Parameters**: None

**Returns**: Table with lock status information

```sql
-- Function signature
get_advisory_lock_status()
RETURNS TABLE(
  lock_key TEXT,
  acquired_at TIMESTAMP WITH TIME ZONE,
  acquired_by TEXT,
  age_seconds INTEGER,
  is_stuck BOOLEAN
)
```

**Example Usage**:
```sql
SELECT * FROM get_advisory_lock_status();
```

### `cleanup_stuck_advisory_locks()`

**Purpose**: Clean up advisory locks that have been held for too long (stuck locks).

**Parameters**: None

**Returns**: INTEGER (number of locks cleaned up)

```sql
-- Function signature
cleanup_stuck_advisory_locks() RETURNS INTEGER
```

**Example Usage**:
```sql
SELECT cleanup_stuck_advisory_locks();
```

## Game Transition Functions

### `transition_game_status()`

**Purpose**: Transition a game to a new status with proper validation and logging.

**Parameters**:
- `game_uuid` (UUID): Game identifier
- `new_status` (game_status): Target status

**Returns**: BOOLEAN (transition successful/failed)

```sql
-- Function signature
transition_game_status(
  game_uuid UUID,
  new_status game_status
) RETURNS BOOLEAN
```

**Example Usage**:
```sql
SELECT transition_game_status(
  'f26d6453-dd76-40bf-8ac8-9a726f664d2f'::uuid,
  'drawing'::game_status
);
```

## PubNub Broadcasting Functions

### `broadcast_game_event()`

**Purpose**: Database trigger function that broadcasts game events to PubNub via Edge Functions.

**Type**: Trigger Function (called automatically by database triggers)

**Parameters**: Trigger context (OLD/NEW records)

**Returns**: TRIGGER

```sql
-- Function signature (trigger function)
broadcast_game_event() RETURNS TRIGGER
```

**Trigger Usage**:
```sql
-- Automatically called by triggers, e.g.:
CREATE TRIGGER trigger_broadcast_phase_change
  AFTER UPDATE OF status ON games
  FOR EACH ROW 
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION broadcast_game_event('phase_changed');
```

### `broadcast_timer_event()`

**Purpose**: Manual function to broadcast timer-specific events to PubNub.

**Parameters**:
- `p_game_id` (UUID): Game identifier
- `p_event_type` (TEXT): Event type
- `p_previous_phase` (TEXT): Previous game phase
- `p_new_phase` (TEXT): New game phase

**Returns**: BOOLEAN (broadcast successful/failed)

```sql
-- Function signature
broadcast_timer_event(
  p_game_id UUID,
  p_event_type TEXT,
  p_previous_phase TEXT,
  p_new_phase TEXT
) RETURNS BOOLEAN
```

**Example Usage**:
```sql
SELECT broadcast_timer_event(
  'f26d6453-dd76-40bf-8ac8-9a726f664d2f'::uuid,
  'phase_changed',
  'briefing',
  'drawing'
);
```

## Performance Metrics

### Execution Time Benchmarks

| Function | Typical Execution Time | Use Case |
|----------|----------------------|----------|
| `monitor_game_timers_db()` | 0-16ms | Production cron job |
| `get_timer_monitoring_stats()` | 1-5ms | Health monitoring |
| `verify_production_deployment()` | 5-15ms | Deployment verification |
| `acquire_advisory_lock_enhanced()` | 1-3ms | Concurrency control |

### Performance Comparison

| Approach | Execution Time | Reliability | Overhead |
|----------|---------------|-------------|----------|
| **Database Function** | 0-16ms | 100% | None |
| **Previous Edge Function** | 349ms | ~85% | ~30ms boot time |

## Error Handling

All functions include comprehensive error handling:

- **Graceful degradation**: Functions continue operation even if non-critical components fail
- **Detailed logging**: Error messages include context and recovery suggestions
- **Transaction safety**: Database operations are properly wrapped in transactions
- **Advisory lock protection**: Prevents concurrent executions that could cause conflicts

## Integration with npm Scripts

The database functions can be tested locally using npm scripts:

```bash
# Test core timer monitoring
npm run monitor:test

# Get current statistics
npm run monitor:stats

# Run end-to-end test with PubNub
npm run monitor:e2e-test

# Simulate production cron job
npm run monitor:continuous
```

## Conclusion

The Database Timer Monitoring API provides a comprehensive, high-performance solution for game timer management with:

- **Ultra-fast execution** (0-16ms vs 349ms)
- **100% reliability** (no timeout issues)
- **Comprehensive monitoring** and health checking
- **Production-ready deployment** verification
- **Seamless PubNub integration** for real-time updates

All functions are designed for production use with extensive error handling, performance optimization, and monitoring capabilities.
