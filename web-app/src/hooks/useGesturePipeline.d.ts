import { type PipelineStatus } from '@/vision/gesturePipeline';
export declare function useGesturePipeline(): {
    status: PipelineStatus;
    error: string | null;
    videoRef: import("react").MutableRefObject<HTMLVideoElement | null>;
};
