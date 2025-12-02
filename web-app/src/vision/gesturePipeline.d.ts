import type { GestureTrail } from '@/state/gameStore';
export type PipelineStatus = 'idle' | 'initializing' | 'ready' | 'error';
export declare class GesturePipeline {
    private landmarker?;
    private video?;
    private rafId?;
    private status;
    private histories;
    private onGesture?;
    initialize(video: HTMLVideoElement, gestureHandler: (trail: GestureTrail) => void): Promise<void>;
    getStatus(): PipelineStatus;
    stop(): void;
    private detectLoop;
    private processResults;
    private emitGesture;
}
