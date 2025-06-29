# Phase Transition Debugging Guide

## Overview
This guide helps debug the automatic phase transition from pre-round (briefing) to drawing phase in SketchyAF.

## Added Debug Logging

### 1. useUnifiedGameState Hook (`src/hooks/useUnifiedGameState.ts`)

**Key Log Points:**
- `🔄 Loading game` - When loadGame is called
- `✅ Game loaded successfully` - When game data is fetched
- `🔧 Setting up phase change listener` - PubNub subscription setup
- `🎯 Game event received via PubNub` - When PubNub events arrive
- `🔄 Processing phase change` - When phase_changed events are processed
- `🚀 Calling handleGameUpdate` - When game state updates trigger navigation
- `🧭 useUnifiedGameState: Navigating to` - When navigation is triggered

**What to Look For:**
1. Are PubNub events being received?
2. Is the game object included in phase_changed events?
3. Is handleGameUpdate being called?
4. Is navigation being triggered?

### 2. PreRoundBriefingScreen Component (`src/pages/uiux/PreRoundBriefingScreen.tsx`)

**Key Log Points:**
- `🎮 PreRoundBriefingScreen: Game state changed` - When game state updates

**What to Look For:**
1. Is the component receiving game state updates?
2. Does the game status change from 'briefing' to 'drawing'?

### 3. PubNub Service (`src/services/PubNubService.ts`)

**Key Log Points:**
- `📨 PubNub message received` - Raw PubNub messages
- `🎯 Processing PubNub game event` - Parsed game events
- `🔄 PubNub handleGameMessage called` - Event handler execution
- `🚀 Calling event handler for game` - When events are passed to subscribers

**What to Look For:**
1. Are PubNub messages being received?
2. Are event handlers being called?
3. Are there any errors in event processing?

## Debugging Steps

### Step 1: Create Test Game
```bash
node scripts/game/pre-round-phase.js
```

This creates a game in briefing phase that should automatically transition to drawing.

### Step 2: Open Browser Console
1. Navigate to the pre-round URL provided by the script
2. Open browser developer tools (F12)
3. Go to Console tab
4. Watch for the debug logs

### Step 3: Monitor Database (Optional)
```bash
node scripts/debug/test-phase-transition.js
```

This monitors the database for status changes.

### Step 4: Check Server Logs
Monitor the Supabase Edge Functions logs for:
- `monitor-game-timers` function execution
- PubNub event broadcasting
- Database triggers

## Expected Log Flow

### Normal Flow:
1. **Game Loading:**
   ```
   🔄 Loading game {gameId}
   ✅ Game loaded successfully
   ```

2. **PubNub Setup:**
   ```
   🔧 Setting up phase change listener
   🔗 Joining game channel
   ✅ Successfully subscribed to game events
   ```

3. **Phase Transition (Server-side):**
   ```
   📨 PubNub message received
   🎯 Processing PubNub game event: type: phase_changed
   🔄 Processing phase change: briefing → drawing
   ```

4. **Navigation:**
   ```
   🚀 Calling handleGameUpdate with game object
   🧭 useUnifiedGameState: Navigating to /uiux/draw?gameId={id}
   ```

## Common Issues & Solutions

### Issue 1: No PubNub Events Received
**Symptoms:** No `📨 PubNub message received` logs
**Check:**
- PubNub configuration in environment variables
- Network connectivity
- Server-side timer function execution

### Issue 2: Events Received But No Navigation
**Symptoms:** PubNub events logged but no navigation
**Check:**
- Is `autoNavigate` enabled in useUnifiedGameState?
- Is navigation lock preventing multiple navigations?
- Are there JavaScript errors preventing navigation?

### Issue 3: Game Object Missing from Events
**Symptoms:** `🔄 No game object in event, reloading from database`
**Check:**
- Server-side event broadcasting includes full game object
- Database query in monitor-game-timers function

### Issue 4: Navigation Lock Issues
**Symptoms:** `Navigation already in progress, skipping`
**Check:**
- Navigation lock timeout (1000ms)
- Multiple rapid events causing conflicts

## Manual Testing Commands

### Check Game Status in Database:
```sql
SELECT id, status, phase_expires_at, updated_at 
FROM games 
WHERE id = 'your-game-id';
```

### Check PubNub Configuration:
```bash
echo "Publish Key: $PUBNUB_PUBLISH_KEY"
echo "Subscribe Key: $PUBNUB_SUBSCRIBE_KEY"
```

### Force Phase Transition:
```sql
UPDATE games 
SET status = 'drawing', 
    phase_expires_at = NOW() + INTERVAL '3 minutes'
WHERE id = 'your-game-id';
```

## Log Filtering

To focus on specific components, filter console logs:
- **PubNub:** Filter by `PubNub` or `📨`
- **Game State:** Filter by `useUnifiedGameState` or `🎮`
- **Navigation:** Filter by `Navigating` or `🧭`
- **Phase Changes:** Filter by `phase_changed` or `🔄`

## Next Steps

If issues persist after reviewing logs:
1. Check server-side Edge Function logs
2. Verify database triggers are firing
3. Test PubNub connectivity directly
4. Check for browser console errors
5. Verify user authentication state
