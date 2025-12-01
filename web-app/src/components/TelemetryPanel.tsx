import { useMemo } from 'react';

import { useGameStore } from '@/state/gameStore';
import type { PipelineStatus } from '@/vision/gesturePipeline';

type TelemetryPanelProps = {
  status: PipelineStatus;
  error?: string | null;
};

export function TelemetryPanel({ status, error }: TelemetryPanelProps) {
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

  return (
    <div className="panel">
      <div className="panel__header">
        <h3>Telemetry</h3>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
      <div className="panel__body">
        <ul className="telemetry-list">
          <li>
            <span>Score</span>
            <strong>{score}</strong>
          </li>
          <li>
            <span>Combo</span>
            <strong>{combo}x</strong>
          </li>
          <li>
            <span>Lives</span>
            <strong>{lives}</strong>
          </li>
          <li>
            <span>CV Pipeline</span>
            <strong>{status}</strong>
          </li>
        </ul>
        <p className="telemetry-copy">{statusCopy}</p>
      </div>
    </div>
  );
}

