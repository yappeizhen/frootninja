# Testing Guide

## Automated checks

- `npm run lint` – ESLint with TypeScript + React Hooks rules.
- `npm run test` – Vitest unit suite (passes with no tests flagged when UI-only changes occur).
- `npm run coverage` – Vitest plus V8 coverage (text + lcov reports).

## Manual webcam verification

1. `npm run dev` and open the local URL in Chrome/Edge.
2. Grant camera permissions when prompted. Reload if the browser blocks the request.
3. Confirm the left information panel renders and the webcam feed appears on the right.
4. Move one hand inside the frame:
   - Green skeleton and cyan/orange joints should follow your fingers closely.
   - HUD chips should show `Status: Tracking active`, hand count ≥ 1, and FPS near your camera frame rate (typically 30–60).
5. Bring the second hand into frame and verify the counter reads `2/2` while both skeletons render simultaneously.
6. Move out of frame and ensure the banner changes to “Show your hand to verify tracking”.
7. The Gesture Telemetry card should update whenever a slice is detected, showing hand, speed, strength (percentage), and direction. If it stays idle, increase swipe speed or lighting.
8. Watch the Fruit Playground canvas for periodic spawns; perform a slice whose hand position overlaps an on-screen fruit (move your hand to where the fruit appears in the webcam feed). Only those aligned gestures should remove the fruit and trigger the burst animation. The next fruit should spawn within ~1s.
9. Click the “Retry” button after revoking permissions in browser settings to validate recovery.

### Gesture detection sanity

1. With both hands visible, perform a quick slicing motion diagonally across the frame.
2. Watch the gesture chip in the bottom-left corner of the preview:
   - It should update to `Left slice` or `Right slice` depending on the hand.
   - The percentage should spike above 40% for deliberate swipes.
3. Repeat rapidly to verify the cooldown—only one slice should register roughly every 250 ms per hand.

### Troubleshooting tips

- If the feed remains black: verify no other app uses the webcam and restart the browser.
- Poor landmark accuracy often means low lighting—point a light source toward your hand or increase screen brightness.
- On macOS Safari, MediaPipe’s WASM path may be blocked when using `file://`. Always test via `npm run dev`.

