# 🍉 Frootninja

**Slice fruits with your bare hands using computer vision!**

A browser-based Fruit Ninja clone that uses your webcam and AI-powered hand tracking to detect slicing gestures in real-time. No controllers needed—just wave your hand to play.

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
</p>

---

## ✨ Features

### 🎮 Game Modes

- **Solo Mode** — Race against the clock! Score as many points as you can in 60 seconds
- **Versus Mode** — Two-player local multiplayer using left hand (P1) vs right hand (P2)

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

---

## 📁 Project Structure

```
src/
├── cv/                    # Computer vision / hand tracking
│   ├── handTracker.ts     # MediaPipe integration
│   ├── HandTrackerProvider.tsx
│   └── useHandData.ts     # React hook for hand data
├── game/
│   └── FruitGame.ts       # Three.js game engine
├── services/
│   ├── gestureController.ts    # Slice detection algorithm
│   └── useGestureDetection.ts
├── state/
│   ├── gameStore.ts       # Game state (Zustand)
│   └── playerStore.ts     # Player scores for versus mode
├── types/
│   ├── cv.ts              # Hand tracking types
│   └── game.ts            # Game types
└── ui/
    └── components/
        ├── FruitCanvas.tsx      # Three.js canvas wrapper
        ├── GameScreens.tsx      # Start/game over screens
        ├── GestureDebugPanel.tsx # Analytics sidebar
        └── Playfield.tsx        # Main game area
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
