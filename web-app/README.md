# CV Fruit Ninja Prototype

This Vite + React + TypeScript app is an incremental prototype for a computer-vision powered Fruit Ninja experience. It streams webcam frames into MediaPipe Hands, draws the detected keypoints, converts gestures into slice events, and feeds those into a light react-three-fiber fruit field.

## Stack

- **UI shell:** React 18, Vite, CSS modules.
- **State:** Zustand slices (`useVisionStore`, `useGameStore`).
- **Computer vision:** `@mediapipe/tasks-vision` hand landmarker with a thin wrapper in `src/cv/mediapipe.ts`.
- **Rendering:** `three` via `@react-three/fiber`.
- **Tooling:** ESLint flat config, Vitest + Testing Library, GitHub Actions CI.

## Getting started

```bash
cd web-app
PATH=/Users/peizhen/Desktop/frootninja/node-v22.12.0-darwin-arm64/bin:$PATH npm install
PATH=/Users/peizhen/Desktop/frootninja/node-v22.12.0-darwin-arm64/bin:$PATH npm run dev
```

Allow camera access in the browser tab, then wave your hand to see keypoints and slice gestures reflected in the 3D fruit field.

## Project layout

- `src/cv/` – MediaPipe glue code & drawing helpers.
- `src/components/vision/` – Webcam viewport + overlays.
- `src/gestures/` – Swipe / slice heuristics adapted for the MVP.
- `src/game/` + `src/state/` – Fruit state machine, physics tick, HUD.

## Testing & linting

```bash
PATH=/Users/peizhen/Desktop/frootninja/node-v22.12.0-darwin-arm64/bin:$PATH npm run lint
PATH=/Users/peizhen/Desktop/frootninja/node-v22.12.0-darwin-arm64/bin:$PATH npm test
```

Vitest covers gesture math and store reducers. CI (see `.github/workflows/ci.yml`) runs lint + tests on every push.
