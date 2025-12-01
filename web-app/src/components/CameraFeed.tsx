import { RefObject } from 'react';

import type { PipelineStatus } from '@/vision/gesturePipeline';

type CameraFeedProps = {
  status: PipelineStatus;
  videoRef: RefObject<HTMLVideoElement>;
};

export function CameraFeed({ status, videoRef }: CameraFeedProps) {
  return (
    <div className="panel">
      <div className="panel__header">
        <h3>Hand Tracking</h3>
        <span className={`badge badge--${status}`}>{status}</span>
      </div>
      <div className="panel__body">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-feed"
        />
      </div>
    </div>
  );
}

