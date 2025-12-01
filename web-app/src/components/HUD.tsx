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

  return (
    <div className="hud">
      <div>
        <span className="hud__label">Score</span>
        <strong className="hud__value">{score}</strong>
      </div>
      <div>
        <span className="hud__label">Combo</span>
        <strong className="hud__value">{combo}x</strong>
      </div>
      <div>
        <span className="hud__label">Lives</span>
        <strong className="hud__value">{lives}</strong>
      </div>
    </div>
  );
}

