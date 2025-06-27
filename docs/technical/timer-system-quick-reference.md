# Timer System Quick Reference

## 🚀 Quick Start

### Local Development Setup

```bash
# 1. Start Supabase
npx supabase start

# 2. Serve Edge Functions  
npx supabase functions serve

# 3. Test timer system
node scripts/create-persistent-test-game.js
node scripts/local-timer-monitor.js
```

### Environment Variables Required

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=local-dev-secret-123
```

## 📋 Key Functions

### Database Functions

```sql
-- Get timer state for a game
SELECT * FROM get_game_timer_state('game-uuid');

-- Find expired games
SELECT * FROM find_expired_games(10);

-- Transition game status
SELECT transition_game_status('game-uuid', 'new_status');
```

### Edge Functions

```bash
# Monitor expired timers (cron job)
curl -X POST /functions/v1/monitor-game-timers \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "x-cron-secret: CRON_SECRET" \
  -d '{}'

# Get timer for client sync
curl -X POST /functions/v1/get-game-timer \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"gameId": "uuid"}'
```

## 🔧 Client Integration

### Using useServerTimer Hook

```typescript
import { useServerTimer } from '../hooks/useServerTimer';

const MyComponent = ({ gameId }) => {
  const {
    timeRemaining,
    isActive,
    isExpired,
    syncError,
    forceSync
  } = useServerTimer({
    gameId,
    syncInterval: 10,
    onTimerExpired: () => console.log('Time up!'),
    onSyncError: (error) => console.error('Sync failed:', error)
  });

  return (
    <div>
      <div>Time: {timeRemaining}s</div>
      <div>Status: {isActive ? 'Active' : 'Inactive'}</div>
      {syncError && <div>Sync Error</div>}
      <button onClick={forceSync}>Force Sync</button>
    </div>
  );
};
```

### GameTimer Component

```typescript
<GameTimer
  gameId={gameId}
  phase={currentPhase}
  duration={phaseDuration}
  onTimeUp={() => console.log('Timer expired')}
  onTimerSync={(timeRemaining) => console.log('Synced:', timeRemaining)}
/>
```

## 🧪 Testing Commands

```bash
# Create test game with expired timer
node scripts/create-persistent-test-game.js

# Test database functions
node scripts/test-database-timer-functions.js

# Test specific game
node scripts/test-specific-game.js

# Run timer monitor locally
node scripts/local-timer-monitor.js

# Validate entire system
node scripts/validate-timer-implementation.js
```

## 📊 Monitoring

### Expected Monitor Output

```json
{
  "processed": 1,     // Games transitioned
  "errors": 0,        // Failed transitions  
  "skipped": 2,       // Games not ready/already processed
  "executionTime": 245, // Milliseconds
  "timestamp": "2025-06-26T10:33:42.969Z"
}
```

### Database Queries for Debugging

```sql
-- Check recent transitions
SELECT * FROM game_transition_log 
ORDER BY created_at DESC LIMIT 10;

-- Find games with active timers
SELECT id, status, phase_expires_at, current_phase_duration 
FROM games 
WHERE phase_expires_at IS NOT NULL;

-- Check expired games
SELECT * FROM find_expired_games(5);
```

## ⚠️ Troubleshooting

### Common Issues

| Error | Solution |
|-------|----------|
| "Missing authorization header" | Add `Authorization: Bearer SERVICE_ROLE_KEY` |
| "Unauthorized cron execution" | Check `CRON_SECRET` in config.toml |
| Timer not syncing | Verify Edge Functions are running |
| Transition failed | Check game has required data (submissions for voting) |

### Debug Steps

1. **Check Environment**: Verify all env vars are set
2. **Test Database**: Run `node scripts/test-database-timer-functions.js`
3. **Check Functions**: Ensure `npx supabase functions serve` is running
4. **Monitor Logs**: Watch function logs for errors
5. **Validate Data**: Check game state in database

## 🔄 Phase Transitions

### Automatic Transitions

```
briefing (10s) → drawing (60s) → voting (30s) → results (15s) → completed
```

### Transition Requirements

- **briefing → drawing**: At least 1 participant
- **drawing → voting**: At least 1 submission
- **voting → results**: No special requirements
- **results → completed**: No special requirements

## 📈 Performance

### Typical Metrics

- **Monitor Execution**: 160-200ms
- **Sync Interval**: 10 seconds
- **Batch Size**: 5 games per batch
- **Concurrency**: 5 parallel transitions

### Optimization Tips

- Use indexes on timer fields
- Batch process expired games
- Implement advisory locking
- Cache timer states when possible

## 🚀 Production Deployment

### Cron Job Setup

```bash
# Every 10 seconds
*/10 * * * * curl -X POST https://your-project.supabase.co/functions/v1/monitor-game-timers \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{}'
```

### Required Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
CRON_SECRET=your-secure-cron-secret
```

### Health Check

```bash
# Test monitor function
curl -X POST https://your-project.supabase.co/functions/v1/monitor-game-timers \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{}'
```

## 📚 Related Documentation

- [Full Technical Documentation](./server-side-timer-synchronization.md)
- [Database Schema](../database/schema.md)
- [Edge Functions](../api/edge-functions.md)
- [Real-time Events](../realtime/events.md)
