import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { computeVelocity, normalizeLandmark, smoothPoint } from '@/utils/smoothing';
const MEDIAPIPE_ASSETS = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.13/wasm';
const HAND_LANDMARKER_TASK = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const createId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 11);
};
export class GesturePipeline {
    landmarker;
    video;
    rafId;
    status = 'idle';
    histories = new Map();
    onGesture;
    async initialize(video, gestureHandler) {
        try {
            this.status = 'initializing';
            this.video = video;
            this.onGesture = gestureHandler;
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            video.srcObject = stream;
            await video.play();
            const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_ASSETS);
            this.landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: HAND_LANDMARKER_TASK
                },
                runningMode: 'VIDEO',
                numHands: 1
            });
            this.status = 'ready';
            this.detectLoop();
        }
        catch (error) {
            this.status = 'error';
            this.stop();
            throw error;
        }
    }
    getStatus() {
        return this.status;
    }
    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.video?.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
        }
        this.landmarker?.close();
        this.histories.clear();
        this.status = 'idle';
    }
    detectLoop = () => {
        if (!this.video || !this.landmarker) {
            return;
        }
        const result = this.landmarker.detectForVideo(this.video, performance.now());
        if (result?.landmarks?.length) {
            this.processResults(result);
        }
        this.rafId = requestAnimationFrame(this.detectLoop);
    };
    processResults(result) {
        result.landmarks?.forEach((landmarks, index) => {
            const referencePoint = landmarks[0];
            const normalized = normalizeLandmark(referencePoint.x, referencePoint.y);
            const history = this.histories.get(index) ?? {
                id: createId(),
                points: [],
                lastTimestamp: performance.now()
            };
            const smoothed = smoothPoint(history.points.at(-1) ?? null, normalized);
            const points = [...history.points, smoothed].slice(-12);
            const now = performance.now();
            const delta = (now - history.lastTimestamp) / 1000 || 1 / 60;
            history.lastTimestamp = now;
            const velocity = computeVelocity(points, delta);
            if (velocity > 2.3 && points.length >= 4) {
                this.emitGesture({ id: history.id, points, velocity });
                history.points = [];
                history.id = createId();
            }
            else {
                history.points = points;
            }
            this.histories.set(index, history);
        });
    }
    emitGesture(trail) {
        this.onGesture?.(trail);
    }
}
