import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useGameStore } from '@/state/gameStore';
export function HUD() {
    const { score, combo, lives, spawnWave } = useGameStore((state) => ({
        score: state.score,
        combo: state.combo,
        lives: state.lives,
        spawnWave: state.spawnWave
    }));
    useEffect(() => {
        const interval = setInterval(() => spawnWave(), 8000);
        return () => clearInterval(interval);
    }, [spawnWave]);
    return (_jsxs("div", { className: "hud", children: [_jsxs("div", { children: [_jsx("span", { className: "hud__label", children: "Score" }), _jsx("strong", { className: "hud__value", children: score })] }), _jsxs("div", { children: [_jsx("span", { className: "hud__label", children: "Combo" }), _jsxs("strong", { className: "hud__value", children: [combo, "x"] })] }), _jsxs("div", { children: [_jsx("span", { className: "hud__label", children: "Lives" }), _jsx("strong", { className: "hud__value", children: lives })] })] }));
}
