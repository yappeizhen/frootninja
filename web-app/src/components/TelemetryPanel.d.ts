import type { PipelineStatus } from '@/vision/gesturePipeline';
type TelemetryPanelProps = {
    status: PipelineStatus;
    error?: string | null;
};
export declare function TelemetryPanel({ status, error }: TelemetryPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
