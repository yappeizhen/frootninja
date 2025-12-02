import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from 'react';
import { useGameRenderer } from '@/game/useGameRenderer';
export function GameCanvas() {
    const canvasRef = useRef(null);
    useGameRenderer(canvasRef);
    return _jsx("canvas", { ref: canvasRef, className: "game-canvas" });
}
