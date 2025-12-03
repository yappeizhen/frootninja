import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHandData } from '@/cv'
import { FruitLayer } from '@/ui/components/FruitCanvas'

const STATUS_COPY: Record<string, string> = {
  idle: 'Waiting for camera...',
  initializing: 'Loading MediaPipe Hands...',
  ready: 'Tracking active',
  'permission-denied': 'Camera permission denied',
  error: 'Tracking error - check console',
}

export const Playfield = () => {
  const { frame, status, error, videoRef, restart, maxHands } = useHandData()
  const [localVideo, setLocalVideo] = useState<HTMLVideoElement | null>(null)

  const handsDetected = frame?.hands.length ?? 0
  const fpsLabel = frame ? frame.fps.toFixed(0) : '0'

  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef(node)
      setLocalVideo(node)
    },
    [videoRef],
  )

  useEffect(() => {
    if (!localVideo) return
    const updateSize = () => {
      // no-op placeholder if future sizing logic needed
    }
    localVideo.addEventListener('loadedmetadata', updateSize)
    return () => {
      localVideo.removeEventListener('loadedmetadata', updateSize)
    }
  }, [localVideo])

  const banner = useMemo(() => {
    if (error) {
      return {
        tone: 'warning' as const,
        message: error,
        action: 'Retry',
      }
    }
    if (status !== 'ready') {
      return {
        tone: 'muted' as const,
        message: STATUS_COPY[status] ?? 'Initializing...',
      }
    }
    if (handsDetected === 0) {
      return {
        tone: 'info' as const,
        message: 'Show your hand to verify tracking',
      }
    }
    return null
  }, [status, error, handsDetected])

  return (
    <section className="playfield-card">
      <div className="playfield-stage">
        <video
          ref={handleVideoRef}
          className="playfield-video"
          autoPlay
          muted
          playsInline
        />
        <FruitLayer />
        {banner ? (
          <div className={`playfield-banner playfield-banner--${banner.tone}`}>
            <span>{banner.message}</span>
            {banner.action ? (
              <button type="button" onClick={restart}>
                {banner.action}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="playfield-status-pill">Hands detected</div>
        )}
      </div>
      <footer className="playfield-footer">
        <div>
          <span className="playfield-label">Status</span>
          <strong>{STATUS_COPY[status] ?? status}</strong>
        </div>
        <div>
          <span className="playfield-label">FPS</span>
          <strong>{fpsLabel}</strong>
        </div>
        <div>
          <span className="playfield-label">Hands</span>
          <strong>
            {handsDetected}/{maxHands}
          </strong>
        </div>
      </footer>
    </section>
  )
}

