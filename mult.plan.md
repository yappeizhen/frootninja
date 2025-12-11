# Multiplayer Mode Plan

> Replaces the existing local "Versus" mode with real-time online multiplayer.

## Overview

Transform the current local-only versus mode (left hand = P1, right hand = P2 on same device) into a true online multiplayer experience where two players on separate devices compete head-to-head in real-time.

---

## Key Decisions

| Question | Decision |
|----------|----------|
| Opponent webcam feed? | ✅ Yes (WebRTC, post-MVP) |
| Spectator mode? | 📌 KIV (defer) |
| Ranked/ELO system? | ✅ Yes |
| Best-of-3 rounds? | ❌ No |
| Power-ups? | 📌 KIV (defer) |
| Backend | Firebase RTDB (state) + WebRTC (video, later) |
| Scoring model | Independent (both players score own fruits) |
| UI layout | Responsive: Split-screen (≥1024px) / PIP (<1024px) |

---

## Game Mode Design

### Core Experience

- **1v1 Remote Duels**: Two players, separate devices, same fruit spawns
- **Synchronized Gameplay**: Both players see identical fruit spawns at identical times
- **Split-Screen View**: Your play area + opponent's play area (showing their fruits & slices)
- **30-Second Rounds**: Same timed format as solo mode
- **Independent Scoring**: Both players slice their own instance of fruits, highest score wins

### Matchmaking Options

1. **Quick Match** — Random opponent from matchmaking queue
2. **Private Room** — Create/join with 4-character room code
3. **Challenge Friend** — Shareable link for direct invite

---

## Technical Architecture

### Backend Stack (Decided)

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT A                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  Game State │    │   Scores    │    │ Video Feed  │      │
│  │   (local)   │    │   (sync)    │    │  (stream)   │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │                  ▼                  │
          │         ┌───────────────┐           │
          │         │ Firebase RTDB │           │
          │         │  (game sync)  │           │
          │         └───────────────┘           │
          │                  │                  │
          │                  ▼                  ▼
          │         ┌───────────────┐    ┌───────────────┐
          └────────►│  Room State   │    │    WebRTC     │
                    │  Score Sync   │    │  (P2P Video)  │
                    │  Slice Events │    │  [Post-MVP]   │
                    └───────────────┘    └───────────────┘
```

#### Layer 1: Firebase RTDB (Game State)
- **Purpose**: Room management, score sync, slice events, ELO updates
- **Why**: Already using Firebase, real-time listeners built-in, no server to maintain
- **Latency**: ~50-150ms (acceptable for independent scoring)

#### Layer 2: WebRTC (Video Feed) — Post-MVP
- **Purpose**: Stream opponent's webcam feed
- **Why**: P2P = lowest latency, no video server costs
- **Signaling**: Use Firebase RTDB for WebRTC signaling (SDP/ICE exchange)
- **Fallback**: TURN server for restrictive NATs (use free Twilio/Xirsys tier)

### State Synchronization Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Firebase RTDB                          │
│                                                             │
│  /rooms/{roomId}                                            │
│    ├── code: "ABCD"                                         │
│    ├── state: 'waiting' | 'countdown' | 'playing' | 'finished'
│    ├── hostId: string                                       │
│    ├── seed: number (for deterministic spawns)              │
│    ├── createdAt: timestamp                                 │
│    ├── startedAt: timestamp                                 │
│    ├── winnerId: string (set when finished)                 │
│    └── players/                                             │
│        ├── {playerId1}/                                     │
│        │   ├── name: string                                 │
│        │   ├── elo: number                                  │
│        │   ├── ready: boolean                               │
│        │   ├── connected: boolean                           │
│        │   ├── score: number                                │
│        │   ├── combo: number                                │
│        │   └── slices/ (recent slice events for opponent view)
│        │       └── {sliceId}: { fruitId, x, y, timestamp }  │
│        └── {playerId2}/ ...                                 │
│                                                             │
│  /players/{playerId}                                        │
│    ├── username: string                                     │
│    ├── elo: number                                          │
│    ├── wins: number                                         │
│    ├── losses: number                                       │
│    └── lastPlayed: timestamp                                │
│                                                             │
│  /matchmaking/queue/                                        │
│    └── {playerId}: { elo, joinedAt }                        │
└─────────────────────────────────────────────────────────────┘
```

### Sync Flow

1. **Room Creation**: Host generates seed, creates room with code
2. **Join**: Guest joins by code, both see each other in lobby
3. **Ready Up**: Both players toggle ready, host can start
4. **Countdown**: 3-2-1-GO synced via room state
5. **Playing**: Each client runs local game with same seed
   - Scores synced every 500ms or on slice
   - Slice events pushed for opponent visualization
6. **Finished**: Compare scores, declare winner, update ELO

### Deterministic Fruit Spawning

To ensure both players see the same fruits:

```typescript
// Seeded random number generator
class SeededRNG {
  private seed: number
  
  constructor(seed: number) {
    this.seed = seed
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }
}

// Both clients use same seed from room creation
const rng = new SeededRNG(room.seed)
```

- Room creator generates seed on room creation
- Both clients use same seed for spawn timing, fruit types, positions
- Drift protection: sync checkpoints every 5 seconds

---

## UI/UX Flow

### Start Screen Changes

```
┌─────────────────────────────────────────┐
│          🍉 Froot Ninja                 │
│                                         │
│   ┌──────────┐    ┌──────────┐          │
│   │   👤     │    │   👥     │          │
│   │   Solo   │    │Multiplayer│          │
│   └──────────┘    └──────────┘          │
│                                         │
│         [ Start Game ]                  │
└─────────────────────────────────────────┘
```

### Multiplayer Mode Submenu

```
┌─────────────────────────────────────────┐
│        👥 Multiplayer                   │
│                                         │
│   [ 🎲 Quick Match ]                    │
│                                         │
│   [ 🏠 Create Room ]                    │
│                                         │
│   [ 🚪 Join Room: ____ ]                │
│                                         │
│            [ Back ]                     │
└─────────────────────────────────────────┘
```

### Waiting Room

```
┌─────────────────────────────────────────┐
│         Room: ABCD                      │
│   (Share this code with a friend!)      │
│                                         │
│   ┌────────────────────────────────┐    │
│   │  👤 You           ✓ Ready      │    │
│   │  🕐 Waiting for opponent...    │    │
│   └────────────────────────────────┘    │
│                                         │
│         [ Ready / Not Ready ]           │
│         [ Leave Room ]                  │
└─────────────────────────────────────────┘
```

### In-Game Layout (Responsive)

Use **CSS breakpoints** to switch between layouts based on screen size:

| Breakpoint | Layout | Reason |
|------------|--------|--------|
| `≥1024px` (desktop/tablet landscape) | Split-Screen | Enough real estate for equal halves |
| `<1024px` (mobile/tablet portrait) | PIP | Preserve playable area, opponent in corner |

#### Desktop: Split-Screen (Equal Halves)

Both players get equal screen real estate. Opponent side shows their synced fruits, slice effects, and score.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│     YOU: 1,250 x3              ⏱ 0:24              OPPONENT: 980 x1         │
├────────────────────────────────────┬────────────────────────────────────────┤
│                                    │                                        │
│         YOUR PLAY AREA             │         OPPONENT PLAY AREA             │
│        (Your webcam BG)            │      (Synced fruits & slices)          │
│                                    │                                        │
│       🍎        🍊                 │            🍎        🍊                │
│                       💣           │                            💣          │
│               🍓                   │    ✨ SLICED ✨     🍓                 │
│                                    │                                        │
│    [ Your hand tracking ]          │    [ Their slice effects ]             │
│                                    │                                        │
└────────────────────────────────────┴────────────────────────────────────────┘
```

#### Mobile/Tablet: Picture-in-Picture (PIP)

Your play area full-screen, opponent as smaller overlay in corner.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  YOU: 1,250  x3                 ⏱ 0:24               OPPONENT: 980  x1      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                    ┌──────────────────────┐ │
│                                                    │   OPPONENT (PIP)     │ │
│             YOUR FULL PLAY AREA                    │    🍎    ✨          │ │
│              (Your webcam BG)                      │        🍓   💣       │ │
│                                                    │    Score: 980 x1     │ │
│       🍎              🍊                           └──────────────────────┘ │
│                               💣                                            │
│                    🍓                                                       │
│                                                                             │
│         [ Your hand tracking across full screen ]                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### CSS Implementation

```css
/* Default: PIP for smaller screens */
.multiplayer-playfield {
  display: grid;
  grid-template-columns: 1fr;
  position: relative;
}

.opponent-view {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 30%;
  max-width: 280px;
  aspect-ratio: 4/3;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

/* Desktop: Split-screen */
@media (min-width: 1024px) {
  .multiplayer-playfield {
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  
  .opponent-view {
    position: static;
    width: 100%;
    max-width: none;
    aspect-ratio: auto;
    border-radius: 0;
    box-shadow: none;
  }
}
```

#### MVP Essential Features

✅ **Must have in MVP**:
- Responsive layout (split-screen ↔ PIP via breakpoints)
- Opponent's synced fruits (same spawn timing/positions)
- Opponent's slice effects (visual feedback when they slice)
- Real-time opponent score & combo display

📌 **Post-MVP**:
- Opponent's webcam video feed (WebRTC)

### Game Over Screen

```
┌─────────────────────────────────────────┐
│              🏆 YOU WIN!                │
│           (or 😢 YOU LOSE)              │
│                                         │
│   ┌─────────────┐   ┌─────────────┐     │
│   │     YOU     │   │  OPPONENT   │     │
│   │   1,250     │   │    980      │     │
│   │  Best: x5   │   │  Best: x3   │     │
│   └─────────────┘   └─────────────┘     │
│                                         │
│   [ Rematch ]   [ New Opponent ]        │
│             [ Back to Menu ]            │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Core Networking)
- [ ] Add Firebase RTDB to project (already have Firestore)
- [ ] Create `multiplayerService.ts` with room CRUD operations
- [ ] Implement room code generation (4-char alphanumeric)
- [ ] Create `useMultiplayerRoom` hook for room state subscription
- [ ] Add `multiplayerStore.ts` (Zustand) for multiplayer state

### Phase 2: Lobby System
- [ ] Create `MultiplayerMenu.tsx` component (Create / Join)
- [ ] Create `WaitingRoom.tsx` component
- [ ] Implement ready-up system
- [ ] Add room expiry (auto-delete after 5 min inactive)
- [ ] Handle disconnection/reconnection gracefully

### Phase 3: Game Synchronization
- [ ] Implement `SeededRNG` class for deterministic spawns
- [ ] Modify `FruitGame.ts` to accept external spawn control
- [ ] Sync slice events (fruitId + timestamp + playerId)
- [ ] Add countdown sync before game starts (3-2-1-GO)

### Phase 4: Opponent Visualization (MVP Essential)
- [ ] Create split-screen layout component
- [ ] Render opponent's game instance (synced fruits)
- [ ] Show opponent slice effects in real-time
- [ ] Add opponent score/combo to HUD
- [ ] Winner/loser announcement screen

### Phase 5: Ranked System & Matchmaking
- [ ] Design ELO calculation formula
- [ ] Store player ELO in Firebase (per-device or per-account)
- [ ] Display ELO on profile/leaderboard
- [ ] Quick Match queue implementation
- [ ] Match players by similar ELO range

### Phase 6: Video Feed (Post-MVP)
- [ ] Set up WebRTC signaling via Firebase RTDB
- [ ] Implement P2P video connection
- [ ] Display opponent webcam on their split-screen side
- [ ] Fallback handling (no camera, connection failed)

---

## File Structure Changes

```
src/
├── multiplayer/                      # NEW MODULE
│   ├── index.ts
│   ├── multiplayerService.ts         # Firebase RTDB room CRUD
│   ├── useMultiplayerRoom.ts         # Room state subscription hook
│   ├── SeededRNG.ts                  # Deterministic random generator
│   ├── eloService.ts                 # ELO calculation & storage
│   ├── webrtcService.ts              # P2P video (post-MVP)
│   └── types.ts                      # Multiplayer types
│
├── state/
│   ├── gameStore.ts                  # MODIFY: remove 'versus' mode
│   ├── playerStore.ts                # DELETE (replaced by multiplayer)
│   ├── userStore.ts
│   └── multiplayerStore.ts           # NEW: room state, opponent data
│
├── ui/components/
│   ├── GameScreens.tsx               # MODIFY: Solo/Multiplayer mode select
│   ├── MultiplayerMenu.tsx           # NEW: Create/Join room UI
│   ├── WaitingRoom.tsx               # NEW: Ready-up lobby
│   ├── MultiplayerPlayfield.tsx      # NEW: Split-screen layout
│   ├── OpponentGameView.tsx          # NEW: Opponent's synced game
│   ├── MultiplayerHUD.tsx            # NEW: Both players' scores
│   ├── MultiplayerGameOver.tsx       # NEW: Winner/loser screen
│   ├── PlayerScores.tsx              # DELETE (replaced)
│   └── VersusGameOverScreen          # DELETE (in GameScreens.tsx)
│
├── game/
│   ├── FruitGame.ts                  # MODIFY: add seed support, events
│   └── index.ts
│
└── types/
    └── game.ts                       # MODIFY: GameMode = 'solo' | 'multiplayer'
```

---

## Type Definitions

```typescript
// src/multiplayer/types.ts

export type RoomState = 'waiting' | 'countdown' | 'playing' | 'finished'

export interface RoomPlayer {
  id: string
  name: string
  elo: number
  ready: boolean
  score: number
  combo: number
  maxCombo: number
  connected: boolean
  lastActivity: number
}

export interface Room {
  id: string
  code: string           // 4-char join code (e.g., "ABCD")
  state: RoomState
  hostId: string
  seed: number           // For deterministic fruit spawns
  createdAt: number
  startedAt?: number
  endedAt?: number
  winnerId?: string
  players: Record<string, RoomPlayer>
}

export interface SliceEvent {
  fruitId: string
  playerId: string
  timestamp: number
  position: { x: number; y: number }
}

export interface PlayerProfile {
  id: string
  username: string
  elo: number
  wins: number
  losses: number
  gamesPlayed: number
  lastPlayed: number
}

export type GameMode = 'solo' | 'multiplayer' // Remove 'versus'
```

```typescript
// src/state/multiplayerStore.ts

interface MultiplayerStore {
  // Connection state
  roomId: string | null
  roomCode: string | null
  isHost: boolean
  isConnected: boolean
  
  // Players
  localPlayerId: string
  opponentId: string | null
  opponent: RoomPlayer | null
  
  // Game state
  roomState: RoomState
  seed: number | null
  
  // Opponent's game view
  opponentSlices: SliceEvent[]
  
  // Actions
  createRoom: () => Promise<string>
  joinRoom: (code: string) => Promise<boolean>
  leaveRoom: () => void
  setReady: (ready: boolean) => void
  syncScore: (score: number, combo: number) => void
  reportSlice: (event: SliceEvent) => void
}
```

---

## Migration from Versus Mode

### What Gets Removed
- `playerStore.ts` — player1/player2 logic becomes multiplayer-aware
- Left/Right hand → P1/P2 mapping
- `VersusGameOverScreen` local comparison
- `gameMode: 'versus'` enum value

### What Gets Replaced
- Local versus → Real-time multiplayer
- Single-device 2-player → Multi-device 1v1
- Hardcoded P1/P2 → Dynamic player IDs

### Backward Compatibility
- **Solo mode**: Unchanged
- **High scores**: Unchanged
- **Leaderboards**: Add filter for multiplayer wins (optional)

---

## Firebase Security Rules

```javascript
// firestore.rules (or database.rules.json for RTDB)
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": "auth != null || true", // Allow anonymous for MVP
        "players": {
          "$playerId": {
            ".write": "$playerId === auth.uid || true"
          }
        }
      }
    }
  }
}
```

---

## Scoring Model (Decided: Independent)

Both players slice their **own instance** of the same fruits:

```
┌────────────────────────┐     ┌────────────────────────┐
│     PLAYER A VIEW      │     │     PLAYER B VIEW      │
│                        │     │                        │
│   🍎 spawns at (0.3)   │     │   🍎 spawns at (0.3)   │
│   Player A slices it   │     │   Player B slices it   │
│   → Player A +100      │     │   → Player B +100      │
│                        │     │                        │
│   Same fruit, both     │     │   can score            │
│   independently        │     │   independently        │
└────────────────────────┘     └────────────────────────┘
```

**Why Independent Scoring?**
- ✅ Simpler sync (no race conditions)
- ✅ Firebase latency is acceptable
- ✅ Both players have agency (not punished for network lag)
- ✅ Still competitive (who scores more in same time wins)

**What Gets Synced?**
- Fruit spawn timing & positions (deterministic via seed)
- Slice events (for opponent visualization)
- Scores & combos (real-time display)
- Game state (countdown, playing, finished)

---

## Open Questions (Remaining)

1. **Global Matchmaking?** — Region-based or global queue for Quick Match?
2. **ELO Decay?** — Should inactive players lose rating over time?
3. **Rank Tiers?** — Visual ranks (Bronze, Silver, Gold, etc.) based on ELO?

---

## MVP Scope

### Essential (Must Have)

| Feature | Status | Notes |
|---------|--------|-------|
| Room creation with 4-char code | 🔲 | Share code with friend |
| Join room by code | 🔲 | Enter code to join |
| Ready-up and countdown | 🔲 | Both players ready → 3-2-1-GO |
| Synchronized fruit spawns | 🔲 | Deterministic via seeded RNG |
| Independent scoring | 🔲 | Both score own fruits |
| **Responsive layout (split/PIP)** | 🔲 | Split ≥1024px, PIP <1024px |
| **Opponent slice effects** | 🔲 | Visual feedback on their side |
| Real-time score/combo display | 🔲 | Both scores in HUD |
| Winner announcement | 🔲 | Game over with results |
| Rematch option | 🔲 | Play again same opponent |

### Post-MVP

| Feature | Priority | Notes |
|---------|----------|-------|
| Quick Match queue | High | Random matchmaking |
| ELO/MMR ranking | High | Competitive ladder |
| Opponent webcam feed | Medium | WebRTC P2P video |
| Rank tiers (Bronze→Diamond) | Medium | Visual progression |
| Spectator mode | Low | KIV |
| Power-ups | Low | KIV |

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1 | 2-3 days | Core networking, room service |
| Phase 2 | 2 days | Lobby UI, waiting room |
| Phase 3 | 2-3 days | Game sync, deterministic spawns |
| Phase 4 | 3-4 days | Split-screen, opponent visualization |
| Phase 5 | 2-3 days | ELO system, Quick Match |
| Phase 6 | 2-3 days | WebRTC video feed |

**MVP (Phases 1-4)**: ~10-12 days
**With Ranked (Phases 1-5)**: ~2 weeks
**Full Feature (All Phases)**: ~2.5 weeks

---

## ELO System Design

### Formula

Standard ELO calculation:

```typescript
const K = 32 // Rating change sensitivity

function calculateNewElo(
  playerElo: number,
  opponentElo: number,
  won: boolean
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const actualScore = won ? 1 : 0
  return Math.round(playerElo + K * (actualScore - expectedScore))
}
```

### Starting Rating

- New players start at **1000 ELO**
- Minimum ELO: 100 (can't go lower)
- No maximum (but practical ceiling ~2500+)

### Storage

```
/players/{playerId}
  ├── username: string
  ├── elo: number
  ├── wins: number
  ├── losses: number
  ├── gamesPlayed: number
  └── lastPlayed: timestamp
```

### Quick Match Matching

1. Player joins queue with their ELO
2. Search for opponents within ±200 ELO range
3. Expand range by 50 every 10 seconds if no match
4. After 60s, match with anyone available

---

## Next Steps

1. ✅ Finalize backend decision (Firebase RTDB)
2. ✅ Confirm scoring model (independent)
3. ✅ Define MVP scope (split-screen with opponent view)
4. Set up Firebase RTDB in project
5. Prototype `SeededRNG` class
6. Create `multiplayerService.ts` with room operations
7. Build split-screen layout component
8. Implement opponent game view sync

