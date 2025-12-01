import { useRef } from 'react';

import { useGameRenderer } from '@/game/useGameRenderer';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useGameRenderer(canvasRef);

  return <canvas ref={canvasRef} className="game-canvas" />;
}

