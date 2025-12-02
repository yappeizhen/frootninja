import { useEffect, useRef, useState } from 'react'
import { MediaPipeHandTracker, HAND_CONNECTIONS } from '../../cv/mediapipe'
import { useVisionStore } from '../../state/useVisionStore'
import type { VisionHand } from '../../types/vision'
import './VideoFeed.css'

const tracker = new MediaPipeHandTracker()

export const VideoFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setFrame = useVisionStore((state) => state.setFrame)
  const setReady = useVisionStore((state) => state.setReady)
  const setStreaming = useVisionStore((state) => state.setStreaming)
  const setError = useVisionStore((state) => state.setError)
  const hands = useVisionStore((state) => state.hands)
  const isStreaming = useVisionStore((state) => state.isStreaming)
  const [status, setStatus] = useState('Waiting for camera')

  useEffect(() => {
    let stream: MediaStream | null = null
    let rafId = 0
    let lastTimestamp = performance.now()

    const start = async () => {
      try {
        setStatus('Requesting camera')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        })
        if (!videoRef.current) {
          return
        }
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStreaming(true)
        setStatus('Loading hand tracker')
        await tracker.ensureLoaded()
        setReady(true)
        setStatus('Live')
        const loop = async () => {
          if (!videoRef.current || !canvasRef.current) {
            return
          }
          if (videoRef.current.readyState < 2) {
            rafId = requestAnimationFrame(loop)
            return
          }
          const now = performance.now()
          const inferenceStart = performance.now()
          const handsResult = await tracker.detect(videoRef.current, now)
          const inferenceMs = performance.now() - inferenceStart
          const fps = 1000 / Math.max(16, now - lastTimestamp)
          lastTimestamp = now
          drawHands(canvasRef.current, videoRef.current, handsResult)
          setFrame({
            hands: handsResult,
            inferenceMs,
            fps,
            timestamp: now,
          })
          rafId = requestAnimationFrame(loop)
        }
        resizeCanvas(videoRef.current, canvasRef.current)
        rafId = requestAnimationFrame(loop)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setError(message)
        setStatus('Camera blocked')
      }
    }

    const handleResize = () => {
      if (videoRef.current && canvasRef.current) {
        resizeCanvas(videoRef.current, canvasRef.current)
      }
    }
    window.addEventListener('resize', handleResize)
    start()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      cancelAnimationFrame(rafId)
      tracker.close()
      setStreaming(false)
      setReady(false)
      window.removeEventListener('resize', handleResize)
    }
  }, [setError, setFrame, setReady, setStreaming])

  return (
    <div className="video-feed">
      <div className="video-feed__viewport">
        <video ref={videoRef} className="video-feed__video" muted playsInline />
        <canvas ref={canvasRef} className="video-feed__canvas" />
        <div className="video-feed__status-pill">{status}</div>
      </div>
      <div className="video-feed__footer">
        <span className={isStreaming ? 'pill pill--live' : 'pill'}>{isStreaming ? 'Live' : 'Idle'}</span>
        <span className="pill">Hands: {hands.length}</span>
      </div>
    </div>
  )
}

const drawHands = (canvas: HTMLCanvasElement, video: HTMLVideoElement, hands: VisionHand[]) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  resizeCanvas(video, canvas)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#38bdf8'

  hands.forEach((hand) => {
    ctx.strokeStyle = hand.handedness === 'Left' ? '#f472b6' : '#38bdf8'
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const a = hand.landmarks[start]
      const b = hand.landmarks[end]
      if (!a || !b) {
        return
      }
      ctx.beginPath()
      ctx.moveTo((1 - a.x) * canvas.width, a.y * canvas.height)
      ctx.lineTo((1 - b.x) * canvas.width, b.y * canvas.height)
      ctx.stroke()
    })
    hand.landmarks.forEach((point, index) => {
      ctx.fillStyle = index === 8 ? '#facc15' : 'white'
      ctx.beginPath()
      ctx.arc((1 - point.x) * canvas.width, point.y * canvas.height, index === 8 ? 6 : 4, 0, Math.PI * 2)
      ctx.fill()
    })
  })
}

const resizeCanvas = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
  const { videoWidth, videoHeight } = video
  if (canvas.width !== videoWidth) {
    canvas.width = videoWidth
  }
  if (canvas.height !== videoHeight) {
    canvas.height = videoHeight
  }
}

