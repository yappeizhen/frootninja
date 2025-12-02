# Testing Guide

## Automated checks

- `npm run lint` – ESLint with TypeScript + React Hooks rules.
- `npm run test` – Vitest unit suite (passes with no tests flagged when UI-only changes occur).
- `npm run coverage` – Vitest plus V8 coverage (text + lcov reports).

## Manual webcam verification

1. `npm run dev` and open the local URL in Chrome/Edge.
2. Grant camera permissions when prompted. Reload if the browser blocks the request.
3. Confirm the left information panel renders and the webcam feed appears on the right.
4. Move your dominant hand inside the frame:
   - Green skeleton and cyan/orange joints should follow your fingers closely.
   - HUD chips should show `Status: Tracking active`, handshake count ≥ 1, and FPS around your camera frame rate (typically 30–60).
5. Move out of frame and ensure the banner changes to “Show your hand to verify tracking”.
6. Click the “Retry” button after revoking permissions in browser settings to validate recovery.

### Troubleshooting tips

- If the feed remains black: verify no other app uses the webcam and restart the browser.
- Poor landmark accuracy often means low lighting—point a light source toward your hand or increase screen brightness.
- On macOS Safari, MediaPipe’s WASM path may be blocked when using `file://`. Always test via `npm run dev`.

