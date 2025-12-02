import { RefObject } from 'react';
import type { PipelineStatus } from '@/vision/gesturePipeline';
type CameraFeedProps = {
    status: PipelineStatus;
    videoRef: RefObject<HTMLVideoElement>;
};
export declare function CameraFeed({ status, videoRef }: CameraFeedProps): import("react/jsx-runtime").JSX.Element;
export {};
