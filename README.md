<div align="center">

# 🍉 Frootninja

### Slice fruits with your bare hands using computer vision

[![Play Now](https://img.shields.io/badge/▶_Play_Now-frootninja.vercel.app-ff6b6b?style=for-the-badge&logo=vercel&logoColor=white)](https://frootninja.vercel.app/)

A browser-based Fruit Ninja clone that uses your webcam and AI-powered hand tracking to detect slicing gestures in real-time. No controllers needed—just wave your hand to play.

<br />

<img width="600" alt="Frootninja Home Screen" src="https://github.com/user-attachments/assets/3eaa02d0-c029-4c23-b952-45658d075ba8" />

<sub>✨ Neon-drenched home screen with solo, versus, and online multiplayer modes</sub>

<br /><br />

<table>
<tr>
<td align="center">
<img width="400" alt="Solo gameplay" src="https://github.com/user-attachments/assets/ffcf61ad-81b0-444c-947c-f75004c6b266" />
<br />
<sub><b>Solo Mode</b> — 60 seconds of fruit-slicing mayhem</sub>
</td>
<td align="center">
<img width="400" alt="Multiplayer gameplay" src="https://github.com/user-attachments/assets/c61f7a10-cb54-4cb5-967c-42289f110cc7" />
<br />
<sub><b>Online Multiplayer</b> — Head-to-head with live video</sub>
</td>
</tr>
</table>

<br />

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D_Graphics-000000?style=flat-square&logo=threedotjs&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand_Tracking-4285F4?style=flat-square&logo=google&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-F5820D?style=flat-square&logo=firebase&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Video-FF6B6B?style=flat-square&logo=webrtc&logoColor=white)

</div>

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎮 Game Modes

- **Solo Mode** — Race against the clock! Score as many points as you can in 60 seconds
- **Versus Mode** — Two-player local multiplayer using left hand (P1) vs right hand (P2)
- **Online Multiplayer** — Head-to-head 30s matches with a friend via WebRTC

</td>
<td width="50%">

### 🍓 Slice Through 7 Fruits

🍓 Strawberry • 🍊 Orange • 🍎 Apple  
🍉 Watermelon • 🍇 Grape • 🍋 Lemon • 🥝 Kiwi

Each fruit is beautifully rendered in 3D with physically-based materials, subsurface scattering, and environment reflections.

</td>
</tr>
</table>

### 💣 Watch Out for Bombs!

Hitting a bomb costs you points. Features a glowing fuse and realistic explosion effects.

### 🎨 Visual Effects

- **Realistic 3D fruit** with clearcoat materials and environment reflections
- **Satisfying slice physics** — fruits split into halves that tumble away
- **Juice particles** spray on every successful slice
- **Smooth animations** with scale-in effects and dynamic lighting

### 🤝 Online Play & Leaderboards

- **Real-time multiplayer** using Firebase (signaling/state) + WebRTC (P2P video)
- **Seeded RNG** keeps fruit spawns identical for both players
- **Shared slice events** let you see the opponent's swipes
- **Global leaderboard** backed by Firestore

### 📊 Live Analytics Panel

Track your performance in real-time with speed/power meters, slice direction compass, combo counter, and hand tracking status.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A device with a webcam
- A modern browser (Chrome, Edge, or Firefox recommended)

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

> **Note:** Solo and local play work without any configuration. Online multiplayer and the global leaderboard require Firebase—see below.

### Firebase Setup (Optional — for Online Multiplayer)

Create `.env.local` in the repo root with your Firebase config:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Add a Web App to get the config above
3. Enable Firestore Database (test mode is fine for local dev)

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
| [Three.js](https://threejs.org/) | 3D graphics rendering |
| [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) | Real-time hand tracking |
| [Firebase Firestore](https://firebase.google.com/) | Multiplayer signaling & leaderboard |
| [WebRTC](https://webrtc.org/) | Peer-to-peer video streaming |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [Vitest](https://vitest.dev/) | Testing framework |

---

## 🧠 How It Works

### Hand Tracking Pipeline

```
📷 Camera Capture    →    🖐️ Hand Detection    →    ✋ Gesture Recognition
   (60fps webcam)         (21 landmarks/hand)        (fingertip velocity)
                                                            ↓
   🎯 Hit Testing    ←    ⚡ Slice Detection   ←    🔪 Threshold Check
   (3D → 2D project)      (speed > 1.6 u/s)         (distance > 0.015)
```

### Gesture Detection Thresholds

| Parameter | Value | Description |
|-----------|-------|-------------|
| Speed | >1.6 units/sec | Minimum fingertip velocity |
| Distance | >0.015 units | Minimum travel distance |
| Cooldown | 250ms | Delay between consecutive slices |

### 3D Rendering

Fruits use Three.js with physically-based materials:
- **Clearcoat** for waxy fruit skin appearance
- **Subsurface scattering** simulation via transmission
- **Environment mapping** for realistic reflections
- **Custom geometries** — LatheGeometry for strawberries, lemons, and apples

### Online Multiplayer Flow

1. 🏠 **Create Room** — Host generates a 4-letter code
2. 📤 **Share Code** — Friend joins with the same code
3. 📹 **Video Connect** — WebRTC establishes peer-to-peer streams
4. 🎮 **Play** — 30-second match with mirrored fruit spawns
5. 🔄 **Rematch** — Play again without leaving the room

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

| Tip | Why |
|-----|-----|
| 💡 **Good lighting** | Well-lit hands track more accurately |
| 🖼️ **Plain background** | Reduces false positives in detection |
| 📏 **Proper distance** | Keep hands clearly visible in frame |
| ⚡ **Fast swipes** | Quick, decisive movements trigger best |
| ☝️ **Use index finger** | The game tracks your index fingertip |

---

## 📄 License

MIT © 2025

---

<div align="center">

**Built with 🍉 and computer vision magic**

[Play Now](https://frootninja.vercel.app/) • [Report Bug](https://github.com/yourusername/frootninja/issues) • [Request Feature](https://github.com/yourusername/frootninja/issues)

</div>
