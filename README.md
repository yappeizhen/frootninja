<div align="center">

# 🍉 Frootninja

### Slice fruits with your bare hands using computer vision

<a href="https://frootninja.vercel.app/">
  <picture>
    <img src="https://img.shields.io/badge/🍉_PLAY_IN_BROWSER-22c55e?style=for-the-badge" alt="Play in Browser" height="36" />
  </picture>
</a>

<sup><a href="https://frootninja.vercel.app/">frootninja.vercel.app</a> — works on desktop with webcam</sup>

A browser-based Fruit Ninja clone that uses your webcam and AI-powered hand tracking to detect slicing gestures in real-time. No controllers needed, just wave your hand to play.

<br />

<img width="600" alt="Frootninja Home Screen" src="https://github.com/user-attachments/assets/3eaa02d0-c029-4c23-b952-45658d075ba8" />
<table>
<tr>
<td align="center">
<img width="500" alt="Solo gameplay" src="https://github.com/user-attachments/assets/ffcf61ad-81b0-444c-947c-f75004c6b266" />
<br />
<sub><b>Solo Mode</b></sub>
</td>
<td align="center">
<img width="500" alt="Multiplayer gameplay" src="https://github.com/user-attachments/assets/6ac886b2-60fb-4909-8679-c6fd44841dd5" />
<br />
<sub><b>Live Online Multiplayer</b></sub>
</td>
</tr>
</table>
</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎮 Game Modes

- **Solo Mode** — 30 seconds to score as high as you can
- **Online Multiplayer** — 30s head-to-head via WebRTC

</td>
<td width="50%">

### 🍓 7 Sliceable Fruits

🍓 Strawberry • 🍊 Orange • 🍎 Apple  
🍉 Watermelon • 🍇 Grape • 🍋 Lemon • 🥝 Kiwi

</td>
</tr>
<tr>
<td width="50%">

### 💣 Bombs

Watch out! Hitting a bomb costs you a life.

</td>
<td width="50%">

### 🏆 Leaderboard

Compete for the top spot on the global leaderboard.

</td>
</tr>
<tr>
<td width="50%">

### 🤝 Live Online Multiplayer

Real-time multiplayer with seeded RNG for identical spawns. See your opponent's slices in real time.

</td>
<td width="50%">

### 📊 Analytics Panel

Speed/power meters, slice direction compass, combo counter, and hand tracking status.

</td>
</tr>
</table>

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

## 🛠️ Built With

<p>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js" /></a>
  <a href="https://developers.google.com/mediapipe"><img src="https://img.shields.io/badge/MediaPipe-4285F4?style=flat-square&logo=google&logoColor=white" alt="MediaPipe" /></a>
  <a href="https://firebase.google.com/"><img src="https://img.shields.io/badge/Firebase-F5820D?style=flat-square&logo=firebase&logoColor=white" alt="Firebase" /></a>
  <a href="https://webrtc.org/"><img src="https://img.shields.io/badge/WebRTC-333333?style=flat-square&logo=webrtc&logoColor=white" alt="WebRTC" /></a>
  <a href="https://zustand-demo.pmnd.rs/"><img src="https://img.shields.io/badge/Zustand-443E38?style=flat-square&logo=react&logoColor=white" alt="Zustand" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" /></a>
</p>

---

## 📄 License

MIT © 2025

---

<div align="center">

**Built with 🍉 and computer vision magic**

[Play Now](https://frootninja.vercel.app/) • [Report Bug](https://github.com/yourusername/frootninja/issues) • [Request Feature](https://github.com/yourusername/frootninja/issues)

</div>
