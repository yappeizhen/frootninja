import { useEffect, useRef } from 'react';

import { useGameStore } from '@/state/gameStore';

export function useSliceAudio() {
  const score = useGameStore((state) => state.score);
  const previousScore = useRef(score);
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (score <= previousScore.current) {
      previousScore.current = score;
      return;
    }

    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
    }
    const ctx = audioCtx.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = 380 + (score % 120);

    gain.gain.value = 0.001;

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.25);
    oscillator.stop(ctx.currentTime + 0.26);

    previousScore.current = score;
  }, [score]);
}

