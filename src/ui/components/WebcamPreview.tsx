import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHandData } from '@/cv'
import type { HandLandmark } from '@/types'

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
]

const STATUS_COPY: Record<string, string> = {
  idle: 'Waiting for camera...',
  initializing: 'Loading MediaPipe Hands...',
  ready: 'Tracking active',
  'permission-denied': 'Camera permission denied',
  error: 'Tracking error - check console',
}

const drawLandmarks = (
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  width: number,
  height: number,
) => {
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  HAND_CONNECTIONS.forEach(([start, end]) => {
    const a = landmarks[start]
    const b = landmarks[end]
    if (!a || !b) return
    ctx.beginPath()
    ctx.moveTo(a.x * width, a.y * height)
    ctx.lineTo(b.x * width, b.y * height)
    ctx.stroke()
  })

  landmarks.forEach((landmark, index) => {
    ctx.beginPath()
    ctx.fillStyle = index <= 4 ? '#f97316' : '#22d3ee'
    const radius = index === 0 ? 6 : 4
    ctx.arc(landmark.x * width, landmark.y * height, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}

export const WebcamPreview = () => {
  const { frame, status, error, videoRef, restart, maxHands } = useHandData()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [localVideo, setLocalVideo] = useState<HTMLVideoElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 })

  const handsDetected = frame?.hands.length ?? 0
  const fpsLabel = frame ? frame.fps.toFixed(0) : '0'

  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef(node)
      setLocalVideo(node)
      if (node && node.videoWidth && node.videoHeight) {
        setDimensions({ width: node.videoWidth, height: node.videoHeight })
      }
    },
    [videoRef],
  )

  useEffect(() => {
    if (!localVideo) return
    const updateSize = () => {
      if (!localVideo.videoWidth || !localVideo.videoHeight) return
      setDimensions({
        width: localVideo.videoWidth,
        height: localVideo.videoHeight,
      })
    }
    localVideo.addEventListener('loadedmetadata', updateSize)
    localVideo.addEventListener('resize', updateSize)
    return () => {
      localVideo.removeEventListener('loadedmetadata', updateSize)
      localVideo.removeEventListener('resize', updateSize)
    }
  }, [localVideo])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = dimensions.width
    canvas.height = dimensions.height
  }, [dimensions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!frame || frame.hands.length === 0) {
      return
    }
    frame.hands.forEach((hand) => {
      drawLandmarks(ctx, hand.landmarks, canvas.width, canvas.height)
    })
  }, [frame])

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
    <section className="preview-card">
      <div className="preview-video-wrapper">
        <video
          ref={handleVideoRef}
          className="preview-video"
          autoPlay
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="preview-canvas" />
        {banner ? (
          <div className={`preview-banner preview-banner--${banner.tone}`}>
            <span>{banner.message}</span>
            {banner.action ? (
              <button type="button" onClick={restart}>
                {banner.action}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="preview-status-pill">Hand detected</div>
        )}
      </div>
      <footer className="preview-footer">
        <div>
          <span className="preview-label">Status</span>
          <strong>{STATUS_COPY[status] ?? status}</strong>
        </div>
        <div>
          <span className="preview-label">FPS</span>
          <strong>{fpsLabel}</strong>
        </div>
        <div>
          <span className="preview-label">Hands</span>
          <strong>
            {handsDetected}/{maxHands}
          </strong>
        </div>
      </footer>
    </section>
  )
}

