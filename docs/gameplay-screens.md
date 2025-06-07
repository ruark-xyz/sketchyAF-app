# SketchyAF Gameplay UI/UX Documentation

This document outlines the user interface and user experience design for the core gameplay loop of SketchyAF.

---

## Overview

The core gameplay loop consists of **5 main screens** that players navigate through during a typical game session. Each screen has specific purposes, display requirements, and optional enhancements to improve player engagement.

---

## 🟢 1. Lobby Screen (Pre-Matchmaking)

**Primary Purpose:** Queue users and manage match readiness.

### Core Display Elements
- Estimated wait time  
- Your current queue position  
- Number of players currently in queue  
- Optional: "Accept match" popup when enough players are ready  
- Fun tip / prompt teaser / sketch trivia while waiting  
- Animated loading doodles to keep it playful  

### Optional Enhancements
- Chat bubble or emote reactions (very simple)  
- "Invite a friend" button (share code or link)  
- Display of most recent winning sketch or featured artwork  

### UX Considerations
- Keep players engaged during wait times  
- Provide clear feedback on queue status  
- Allow easy exit from queue if needed  

---

## 🎨 2. Drawing Game Screens

### a. Pre-Round Briefing

**Primary Purpose:** Give users context and choices before drawing begins.

#### Display Elements
- Prompt title and short theme explanation  
- Player avatars in your round  
- Countdown until canvas unlocks  
- Booster pack selector (pre-selection only)  
- "Ready up" button (optional)  
- Round time limit displayed  

#### UX Considerations
- Build anticipation for the drawing phase  
- Allow strategic booster pack selection  
- Clear indication of when drawing will begin  

### b. Drawing Canvas

**Primary Purpose:** Core drawing interface.

#### Core Features
- Drawing tools: pen/eraser, color selector, undo/redo  
- Booster pack stencils (toggle + drag onto canvas)  
- Canvas zoom/pan (on mobile, gestures if possible)  
- Submit button (disabled until basic stroke detected?)  
- Visible timer countdown  
- Exit/leave button (with confirmation)  

#### Optional UX Elements
- Small minimized panel with other players' avatars (grayed out or "drawing…" states)  
- Audio cue when timer hits last 10 seconds  

#### Mobile Optimizations
- Touch-friendly interface  
- Gesture support for zoom/pan  
- Optimal tool placement for thumb reach  

---

## 🗳️ 3. Voting Screen

**Primary Purpose:** Let players see submissions and vote on their favorite.

### Display Elements
- Prompt displayed at top  
- All sketches displayed (random order)  
- Tap to zoom in / expand sketch  
- One vote per player (required to proceed)  
- After voting: "Waiting for other players…" indicator  

### Optional Features
- Basic emoji reactions before voting (😆 🔥 🤯 – no scoring impact)  
- "Who voted for whom" revealed after all votes are cast  

### UX Considerations
- Fair presentation of all submissions  
- Clear voting mechanism  
- Prevent bias through randomized order  

---

## 🏆 4. Results Screen

**Primary Purpose:** Show the winner and voting outcomes.

### Display Elements
- Highlighted winner + podium display (1st/2nd/3rd)  
- Their sketch with vote count  
- "You came Xth" for personalized feedback  
- Voting breakdown (optional: who voted for who)  
- Achievement unlocks (if any)  

### Optional Flair
- Confetti animation for 1st place  
- MVP badge if player got majority of votes  
- "Next round" countdown or CTA to queue again  

### UX Considerations
- Celebrate winners appropriately  
- Provide encouraging feedback for all players  
- Clear path to next action  

---

## 🔁 5. Post Game Screen

**Primary Purpose:** Wrap-up and re-engagement.

### Display Elements
- Updated player leaderboard position  
- "View my sketch" with option to save/share  
- Quick access to:
  - Public profile  
  - Queue for another round  
  - Buy new booster packs (soft upsell)  
  - Achievements progress (if unlocked)  

### UX Considerations
- Encourage continued play  
- Provide sharing opportunities  
- Soft monetization through booster pack promotion  

---

## Design Principles

### 1. Mobile-First Approach
- Optimized for touch interaction  
- Thumb-friendly button placement  
- Clear visual hierarchy for small screens  

### 2. Playful and Engaging
- Consistent with SketchyAF's fun, chaotic brand  
- Hand-drawn aesthetic throughout  
- Delightful micro-interactions and animations  

### 3. Clear Information Architecture
- Essential information always visible  
- Progressive disclosure for advanced features  
- Consistent navigation patterns  

### 4. Performance Focused
- Fast transitions between screens  
- Minimal loading states  
- Optimized for various network conditions  

---

## Technical Considerations

### Real-time Features Required
- Live queue updates  
- Synchronized drawing timers  
- Real-time voting collection  
- Instant results display  

### State Management
- Player session state  
- Game round state  
- Real-time multiplayer synchronization  
- Offline capability for drawing tools  

### Data Flow
Lobby → Matchmaking → Game Session → Results → Re-engagement  
- Clear state transitions with loading indicators  
- Error handling for network issues  

---

## Success Metrics

### Engagement Metrics
- Average time spent in each screen  
- Player retention through complete gameplay loop  
- Re-engagement rate (queue again percentage)  

### UX Quality Indicators
- Time to first action on each screen  
- Error rate during critical actions (voting, submission)  
- Player satisfaction scores  

### Technical Performance
- Screen transition times  
- Drawing tool responsiveness  
- Network synchronization success rate  

---

## Implementation Priority

### Phase 1: Core Functionality
- Drawing Canvas (core feature)  
- Basic Lobby Screen  
- Simple Results Screen  

### Phase 2: Enhanced Experience
- Pre-Round Briefing  
- Enhanced Voting Screen  
- Post Game features  

### Phase 3: Polish & Optimization
- Animations and micro-interactions  
- Advanced booster pack integration  
- Social features and sharing  

---

_This document should be updated as gameplay features are implemented and tested with real users._