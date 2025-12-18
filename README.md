# 🍉 Frootninja

**Slice fruits with your bare hands using computer vision!**

A browser-based Fruit Ninja clone that uses your webcam and AI-powered hand tracking to detect slicing gestures in real-time. No controllers needed—just wave your hand to play.

<p align="center">
  <img width="400" alt="Solo gameplay" src="https://github.com/user-attachments/assets/3eaa02d0-c029-4c23-b952-45658d075ba8" />
  <img width="400" alt="Multiplayer gameplay" src="https://github.com/user-attachments/assets/ffcf61ad-81b0-444c-947c-f75004c6b266" />
</p>

<p align="center">
  <a href="https://frootninja.vercel.app/">
    <img src="https://img.shields.io/badge/▶_Play_Now-frootninja.vercel.app-ff6b6b?style=for-the-badge&logo=vercel&logoColor=white" alt="Play Now" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Three.js-3D_Graphics-000000?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/MediaPipe-Hand_Tracking-4285F4?style=flat-square&logo=google&logoColor=white" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-F5820D?style=flat-square&logo=firebase&logoColor=white" alt="Firebase" />
  <img src="https://img.shields.io/badge/WebRTC-P2P_Video-FF6B6B?style=flat-square&logo=webrtc&logoColor=white" alt="WebRTC" />
</p>

---

## ✨ Features

### 🎮 Game Modes

- **Solo Mode** — Race against the clock! Score as many points as you can in 60 seconds
- **Versus Mode** — Two-player local multiplayer using left hand (P1) vs right hand (P2)
- **Online Multiplayer** — Head-to-head 30s matches with a friend. Create a 4-letter room code, share it, and play in sync with mirrored spawns.

### 🍓 Variety of Fruits

Slice through 7 beautifully rendered 3D fruits:
- 🍓 Strawberry
- 🍊 Orange  
- 🍎 Apple
- 🍉 Watermelon
- 🍇 Grape
- 🍋 Lemon
- 🥝 Kiwi

### 💣 Bombs

Watch out! Hitting a bomb will cost you points. The bombs feature a glowing fuse and realistic explosion effects.

### 🎨 Visual Effects

- **Realistic 3D fruit** with subsurface scattering, clearcoat materials, and environment reflections
- **Satisfying slice physics** — fruits split into halves that tumble away
- **Juice particles** spray on every successful slice
- **Smooth animations** with scale-in effects and dynamic lighting

### 🤝 Online Play & Leaderboards

- **Real-time multiplayer** using Firebase (signaling/state) + WebRTC (P2P video)
- **Seeded RNG** keeps fruit spawns identical for both players
- **Shared slice events** let you see the opponent’s swipes
- **Global leaderboard** (optional) backed by Firestore

### 📊 Live Analytics Panel

Track your performance in real-time:
- Speed and power meters
- Slice direction compass
- Combo counter and peak stats
- Hand tracking status

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A device with a webcam
- A modern browser (Chrome, Edge, or Firefox recommended)

### Environment (Firebase for multiplayer + leaderboard)

Solo and local play run without configuration. Online multiplayer and the global leaderboard require a Firebase project with Firestore enabled. Create `.env.local` in the repo root:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Firebase quickstart:
1. Create a project at https://console.firebase.google.com
2. Add a Web App to get the config above
3. Enable Firestore Database (test mode is fine for local dev)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/frootninja.git
cd frootninja

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and allow camera access to play!

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vite.dev/) | Build tool & dev server |
| [Firebase Firestore](https://firebase.google.com/) | Multiplayer signaling & leaderboard storage |
| [WebRTC](https://webrtc.org/) | Peer-to-peer opponent video |
| [Three.js](https://threejs.org/) | 3D graphics rendering |
| [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) | Real-time hand tracking |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [Vitest](https://vitest.dev/) | Testing framework |

---

## 🧠 How It Works

### Hand Tracking Pipeline

1. **Camera Capture** — Webcam feed is captured at up to 60fps
2. **Hand Detection** — MediaPipe Hand Landmarker identifies 21 landmarks per hand
3. **Gesture Recognition** — Custom algorithm tracks index fingertip velocity
4. **Slice Detection** — When fingertip speed exceeds threshold, a slice gesture is triggered
5. **Hit Testing** — 3D fruit positions are projected to screen space to check for collisions

### Gesture Detection

The gesture controller monitors finger movement and triggers a slice when:
- Movement speed exceeds **1.35 units/second**
- Distance traveled is at least **0.012 units**
- **250ms cooldown** between consecutive slices

### 3D Rendering

Fruits are rendered using Three.js with physically-based materials featuring:
- **Clearcoat** for waxy fruit skin appearance
- **Subsurface scattering** simulation via transmission
- **Environment mapping** for realistic reflections
- **Custom geometries** — LatheGeometry for strawberries, lemons, and apples

### Online Multiplayer Flow

1. Host creates a room (4-letter code) and shares it with a friend
2. Both players allow camera access; WebRTC shares video streams peer-to-peer
3. Firestore synchronizes lobby state, countdown, scores, and seeded fruit spawns
4. Host starts the match once video is connected; rematches reuse the same room

---

## 🧑‍🤝‍🧑 Multiplayer Quickstart

- Open Multiplayer from the main menu and create a room to get a 4-letter code.
- Share the code with your friend; they join from the same menu.
- Wait for the “video connected” status, then the host starts the match.
- Each round is 30 seconds with mirrored fruit spawns; hit rematch to play again without leaving the room.

---

## 📁 Project Structure

```
src/
├── cv/                        # Computer vision / hand tracking
│   ├── handTracker.ts         # MediaPipe integration
│   ├── HandTrackerProvider.tsx
│   └── useHandData.ts         # React hook for hand data
├── game/
│   └── FruitGame.ts           # Three.js game engine
├── services/
│   ├── firebase.ts            # Firebase app + Firestore bootstrap
│   ├── gestureController.ts   # Slice detection algorithm
│   ├── leaderboardService.ts  # Leaderboard + username checks
│   └── useGestureDetection.ts
├── multiplayer/               # Online multiplayer (Firestore + WebRTC)
│   ├── multiplayerService.ts  # Rooms, sync, rematch flow
│   ├── webrtcService.ts       # Peer connection + signaling helpers
│   ├── useMultiplayerRoom.ts  # React hook for lobby/game state
│   └── SeededRNG.ts           # Deterministic fruit spawns
├── state/
│   ├── gameStore.ts           # Game state (Zustand)
│   └── playerStore.ts         # Player scores for versus mode
├── types/
│   ├── cv.ts                  # Hand tracking types
│   └── game.ts                # Game types
└── ui/
    └── components/
        ├── FruitCanvas.tsx          # Three.js canvas wrapper
        ├── GameScreens.tsx          # Start/game over screens
        ├── GestureDebugPanel.tsx    # Analytics sidebar
        ├── Playfield.tsx            # Solo/local main game area
        ├── MultiplayerMenu.tsx      # Create/join flow
        ├── WaitingRoom.tsx          # Lobby + readiness
        └── MultiplayerPlayfield.tsx # Split-screen multiplayer arena
```

---

## 🎯 Tips for Best Experience

1. **Good lighting** — Ensure your hands are well-lit for accurate tracking
2. **Plain background** — A simple background helps hand detection
3. **Camera distance** — Position yourself so your hands are clearly visible
4. **Fast swipes** — Quick, decisive movements trigger slices best
5. **Use your index finger** — The game tracks your index fingertip

---

## 📄 License

MIT © 2025

---

<p align="center">
  <strong>Built with 🍉 and computer vision magic</strong>
</p>
