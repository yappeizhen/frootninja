import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TelemetryPanel } from './components/TelemetryPanel';
import { useGesturePipeline } from './hooks/useGesturePipeline';
import { useSliceAudio } from './hooks/useSliceAudio';
import './index.css';
function App() {
    const { status, error, videoRef } = useGesturePipeline();
    useSliceAudio();
    return (_jsx("div", { className: "app-shell", children: _jsxs("main", { className: "stage", children: [_jsxs("section", { className: "stage__canvas", children: [_jsx(Suspense, { fallback: _jsx("div", { className: "stage__loading", children: "Loading scene..." }), children: _jsx(GameCanvas, {}) }), _jsx(HUD, {})] }), _jsxs("aside", { className: "stage__sidebar", children: [_jsx(CameraFeed, { status: status, videoRef: videoRef }), _jsx(TelemetryPanel, { status: status, error: error })] })] }) }));
}
export default App;
