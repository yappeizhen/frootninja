## CV Fruit Ninja Prototype — Architecture & Incremental Plan

### Vision & Success Criteria
- Deliver a browser-based “Fruit Ninja” clone that can be driven entirely through real-time hand gestures.
- Keep the stack web-friendly (no native installs) so playtesting is as simple as opening a URL.
- Use the collidingScopes/fruit-ninja repository for pretrained slicing logic, assets, and gameplay references wherever it makes sense to avoid reinventing art/game assets.

### High-Level Architecture
```
Camera Stream → Gesture Inference → Interaction Layer → Game Engine → UI/Audio
```
- **Camera Stream**: `navigator.mediaDevices.getUserMedia` feeding a `<video>` element plus an `<canvas>` for overlays. Back-pressure handled via RAF to keep video at display FPS.
- **Gesture Inference**: Starts with MediaPipe Hands/Holistic (`@mediapipe/tasks-vision`) for 2D keypoints. Later, swap/augment with the reference repo’s pretrained slicing classifier (converted to TF.js/ONNX or executed via WebAssembly) for richer gestures.
- **Interaction Layer**: Converts raw keypoints into game-friendly primitives (blade trail splines, swipe velocity, zoning). Lives in a Web Worker to isolate CPU spikes.
- **Game Engine**: Three.js + React Three Fiber scene responsible for fruit spawning, physics (cannon-es or rapier) and slicing interactions. State shared through Zustand to keep render logic and CV pipeline decoupled.
- **UI/Audio**: React components + Tailwind for HUD and feedback; Web Audio for slicing sounds.

### Tech Stack (initially)
- **Build tooling**: Vite + React 18 + TypeScript + PNPM. Vitest + Testing Library + Playwright for unit/e2e coverage. ESLint + Prettier for quality gates.
- **Rendering**: React Three Fiber, Drei helpers, canonical Fruit Ninja-like shader effects (GLSL or postprocessing bloom). Canvas fallback for early MVP.
- **State**: Zustand for global slices (camera, CV, game). Immer middleware for ergonomic updates.
- **Computer Vision**: 
  - Phase 1: MediaPipe Hands/Holistic in the main thread (or Worker once stable) with GPU/WebGL backend.
  - Phase 2+: Import collidingScopes pretrained slicing model (PyTorch) → convert to ONNX → run via `onnxruntime-web` or `tensorflowjs` for more nuanced gestures (multi-finger combos).
- **Dev ergonomics**: Storybook (optional) for HUD widgets, Lighthouse/Perf budgets baked into CI.

### Leveraging collidingScopes/fruit-ninja
- Reuse their fruit assets, sounds, and slicing trail logic (ported to Three.js materials).
- Study their model weights & dataset to understand gesture labeling; keep a conversion script (Python) in `/tools/model-conversion`.
- Align gameplay parameters (spawn cadence, scoring rules) with their tuning to reduce balancing work.

### Incremental MVP Roadmap
1. **Phase 0 – Project Skeleton**
   - Initialize `web-app/` with Vite React TS template, configure PNPM workspaces, ESLint, Prettier.
   - Add basic layout + HUD placeholder, install MediaPipe + Zustand + React Three Fiber dependencies.
2. **Phase 1 – Live Video + Keypoints (Current Focus)**
   - Implement `useCameraStream` hook that acquires and cleans up `MediaStream`.
   - Implement `useHandTracking` hook backed by MediaPipe Hands; expose normalized keypoints, detection confidence, FPS metrics.
   - Render `VideoDebugPanel` that combines the `<video>` feed and a `<canvas>` overlay drawing keypoints/connection lines.
   - Acceptance: Keypoints stay aligned with user hands at ≥20 FPS on an M-series MacBook; fallback UI if permissions denied.
3. **Phase 2 – Basic Game Loop**
   - Create Three.js scene with gravity-driven fruit meshes and simple slicing detection (line-segment vs. mesh intersection) using hand trajectory.
   - Track score/combo state in Zustand; render minimal HUD.
4. **Phase 3 – Gesture Semantics & Physics Polish**
   - Move CV inference into a Worker; introduce blade smoothing, multi-hand detection, and depth estimation (z from MediaPipe or stereo heuristics).
   - Integrate converted pretrained slicing classifier for gesture confidence gating.
5. **Phase 4 – Content & QA**
   - Port high-fidelity assets/audio, add menus, calibrations, session recording, and deploy preview builds.

### Phase 1 (Video Feed + Keypoints) Build Notes
- **Layout**: `CameraDebugger` component owning `<video>` (hidden but playing) and `<canvas>` overlay sized via `ResizeObserver`.
- **Hooks**:
  - `useCameraStream({ facingMode: 'user' })` to manage permissions, errors, cleanup.
  - `useHandTracking(videoRef, { maxHands: 2 })` to instantiate MediaPipe `HandLandmarker`, throttle inference to animation frames, and emit normalized keypoints.
- **Rendering Loop**: Use `requestAnimationFrame` to sync inference + drawing; draw skeleton onto the canvas to validate tracking drift.
- **State**: Publish keypoints + derived velocities into a Zustand slice so the eventual game loop can subscribe without tight coupling.
- **Instrumentation**: HUD overlay for FPS, detection confidence, permission status; log warnings if inference falls below threshold.
- **Testing**: Storybook story or Vitest DOM test ensuring hooks request permissions, plus mock keypoint snapshot for regression tests.

This plan keeps the first milestone narrowly scoped to validating hand tracking quality before investing in full gameplay, while setting up a foundation that can absorb the reference repo’s pretrained assets and models later.

