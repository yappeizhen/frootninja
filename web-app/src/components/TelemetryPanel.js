import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useGameStore } from '@/state/gameStore';
export function TelemetryPanel({ status, error }) {
    const { score, combo, lives } = useGameStore((state) => ({
        score: state.score,
        combo: state.combo,
        lives: state.lives
    }));
    const statusCopy = useMemo(() => {
        if (error) {
            return error;
        }
        if (status === 'initializing') {
            return 'Loading MediaPipe and TF.js...';
        }
        if (status === 'ready') {
            return 'Slice away! High velocity gestures score more.';
        }
        return 'Camera permissions required to begin.';
    }, [status, error]);
    return (_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel__header", children: [_jsx("h3", { children: "Telemetry" }), _jsx("span", { children: new Date().toLocaleTimeString() })] }), _jsxs("div", { className: "panel__body", children: [_jsxs("ul", { className: "telemetry-list", children: [_jsxs("li", { children: [_jsx("span", { children: "Score" }), _jsx("strong", { children: score })] }), _jsxs("li", { children: [_jsx("span", { children: "Combo" }), _jsxs("strong", { children: [combo, "x"] })] }), _jsxs("li", { children: [_jsx("span", { children: "Lives" }), _jsx("strong", { children: lives })] }), _jsxs("li", { children: [_jsx("span", { children: "CV Pipeline" }), _jsx("strong", { children: status })] })] }), _jsx("p", { className: "telemetry-copy", children: statusCopy })] })] }));
}
