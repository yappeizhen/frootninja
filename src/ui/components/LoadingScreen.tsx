import type { HandTrackingStatus } from '@/types'

interface LoadingScreenProps {
  status: HandTrackingStatus
  error: string | null
  onRetry: () => void
}

export const LoadingScreen = ({ status }: LoadingScreenProps) => {
  const isLoading = status === 'idle' || status === 'initializing'

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
        <h2 className="loading-screen__title">Loading</h2>
        <p className="loading-screen__subtitle">Preparing hand tracking model...</p>

        {/* Loading indicator */}
        {isLoading && (
          <div className="loading-screen__progress">
            <div className="loading-screen__progress-bar">
              <div className="loading-screen__progress-fill" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

