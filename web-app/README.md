# CV Fruit Ninja Prototype

A browser-first prototype of a gesture-controlled Fruit Ninja experience powered by MediaPipe Hands, TensorFlow.js, and Three.js. The project renders gameplay in WebGL while keeping computer-vision inference fully on-device for low-latency slices.

## Getting Started

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev` – start Vite dev server with hot reload
- `npm run build` – type-check and bundle for production
- `npm run preview` – preview the production bundle locally
- `npm run test` / `npm run test:watch` – execute Vitest suites
- `npm run test:playwright` – smoke-test webcam + gameplay flows
- `npm run lint` / `npm run format` – ensure code quality

## Project Structure

- `src/vision` – MediaPipe Hands wrapper, gesture classification, smoothing utilities
- `src/game` – Three.js scene, physics, slicing collision hooks
- `src/components` – React UI including HUD, camera preview, dev telemetry
- `tests` – Vitest unit suites and Playwright end-to-end smoke tests

## Next Steps

1. Collect gesture samples to fine-tune the slicing classifier
2. Expand fruit types, combo logic, and add bomb hazards
3. Wire optional telemetry storage/leaderboards via a lightweight backend

