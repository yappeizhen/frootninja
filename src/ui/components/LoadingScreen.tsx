import { useEffect, useState } from 'react'
import type { HandTrackingStatus } from '@/types'
import { useInputModeStore } from '@/state/inputModeStore'

interface LoadingScreenProps {
  status: HandTrackingStatus
  error: string | null
  onRetry: () => void
}

const FALLBACK_DELAY_MS = 3000 // Show fallback option after 3 seconds

export const LoadingScreen = ({ status, error, onRetry }: LoadingScreenProps) => {
  const isLoading = status === 'idle' || status === 'initializing'
  const isError = status === 'error' || status === 'permission-denied' || !!error
  const { enableFallbackMode } = useInputModeStore()
  const [showFallbackOption, setShowFallbackOption] = useState(false)

  // Show fallback option after a delay or immediately on error
  useEffect(() => {
    if (isError) {
      setShowFallbackOption(true)
      return
    }

    if (isLoading) {
      const timer = setTimeout(() => {
        setShowFallbackOption(true)
      }, FALLBACK_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [isLoading, isError])

  const handleSkipCamera = () => {
    enableFallbackMode()
  }

  const getStatusMessage = () => {
    if (error) return error
    switch (status) {
      case 'permission-denied':
        return 'Camera permission denied'
      case 'error':
        return 'Failed to initialize camera'
      case 'initializing':
        return 'Preparing hand tracking model...'
      default:
        return 'Waiting for camera...'
    }
  }

  return (
    <div className="loading-screen">
      <div className="loading-screen__content">
        {/* Animated fruit icons */}
        <div className="loading-screen__fruits">
          <span className="loading-screen__fruit" style={{ animationDelay: '0s' }}>🍎</span>
          <span className="loading-screen__fruit" style={{ animationDelay: '0.2s' }}>🍊</span>
          <span className="loading-screen__fruit" style={{ animationDelay: '0.4s' }}>🍋</span>
          <span className="loading-screen__fruit" style={{ animationDelay: '0.6s' }}>🥝</span>
          <span className="loading-screen__fruit" style={{ animationDelay: '0.8s' }}>🍇</span>
        </div>

        {/* Title */}
        <h2 className="loading-screen__title">
          {isError ? 'Camera Issue' : 'Loading'}
        </h2>
        <p className="loading-screen__subtitle">{getStatusMessage()}</p>

        {/* Loading indicator */}
        {isLoading && !isError && (
          <div className="loading-screen__progress">
            <div className="loading-screen__progress-bar">
              <div className="loading-screen__progress-fill" />
            </div>
          </div>
        )}

        {/* Error retry button */}
        {isError && (
          <button className="loading-screen__retry-btn" onClick={onRetry}>
            Try Again
          </button>
        )}

        {/* Fallback option */}
        {showFallbackOption && (
          <div className="loading-screen__fallback">
            <div className="loading-screen__divider">
              <span>or</span>
            </div>
            <button 
              className="loading-screen__fallback-btn"
              onClick={handleSkipCamera}
            >
              🖱️ Play with Mouse/Touch
            </button>
            <p className="loading-screen__fallback-hint">
              No camera needed — slice fruits with your mouse or finger!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
