import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { GesturePipeline } from '@/vision/gesturePipeline';
export function useGesturePipeline() {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    useEffect(() => {
        const pipeline = new GesturePipeline();
        let mounted = true;
        const boot = async () => {
            if (!videoRef.current) {
                return;
            }
            try {
                setStatus('initializing');
                await pipeline.initialize(videoRef.current, (trail) => {
                    useGameStore.getState().registerGesture(trail);
                });
                if (!mounted) {
                    return;
                }
                setStatus(pipeline.getStatus());
            }
            catch (err) {
                console.error('Gesture pipeline failed', err);
                if (!mounted) {
                    return;
                }
                setStatus('error');
                setError(err instanceof Error ? err.message : 'Failed to start gesture pipeline');
            }
        };
        boot();
        return () => {
            mounted = false;
            pipeline.stop();
        };
    }, []);
    return {
        status,
        error,
        videoRef
    };
}
