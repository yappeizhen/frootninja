import { useEffect, useState, useCallback } from 'react'
import { getTopScores, type LeaderboardEntry } from '@/services/leaderboardService'
import { isFirebaseEnabled } from '@/services/firebase'
import type { GameMode } from '@/types'

interface LeaderboardProps {
  onClose: () => void
  highlightScore?: number
  highlightRank?: number
  initialMode?: GameMode
  highlightMode?: GameMode
}

const MODE_TABS: { id: GameMode; label: string; icon: string }[] = [
  { id: 'solo', label: 'Solo', icon: '👤' },
  { id: 'multiplayer', label: 'Multiplayer', icon: '👥' },
]

export const Leaderboard = ({
  onClose,
  highlightScore,
  highlightRank,
  initialMode = 'solo',
  highlightMode,
}: LeaderboardProps) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScores = useCallback(async (mode: GameMode) => {
    if (!isFirebaseEnabled()) {
      setError('Leaderboard not configured')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setEntries([])
      const scores = await getTopScores(50, mode)
      setEntries(scores)
    } catch (err) {
      setError('Failed to load leaderboard')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScores(selectedMode)
  }, [fetchScores, selectedMode])

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard" onClick={(e) => e.stopPropagation()}>
        <header className="leaderboard__header">
          <h2 className="leaderboard__title">🏆 Leaderboard</h2>
          <button className="leaderboard__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="leaderboard__tabs" role="tablist" aria-label="Select leaderboard mode">
          {MODE_TABS.map((mode) => {
            const isActive = mode.id === selectedMode
            return (
              <button
                key={mode.id}
                className={`leaderboard__tab ${isActive ? 'leaderboard__tab--active' : ''}`}
                onClick={() => setSelectedMode(mode.id)}
                role="tab"
                aria-selected={isActive}
              >
                <span className="leaderboard__tab-icon" aria-hidden="true">
                  {mode.icon}
                </span>
                <span className="leaderboard__tab-label">{mode.label}</span>
              </button>
            )
          })}
        </div>

        <div className="leaderboard__content">
          {loading && (
            <div className="leaderboard__loading">
              <span className="leaderboard__spinner">🍉</span>
              <span>Loading scores...</span>
            </div>
          )}

          {error && !isFirebaseEnabled() && (
            <div className="leaderboard__setup">
              <span className="leaderboard__setup-icon">🔧</span>
              <h3 className="leaderboard__setup-title">Setup Required</h3>
              <p className="leaderboard__setup-text">
                To enable the global leaderboard, you need to configure Firebase.
              </p>
              <ol className="leaderboard__setup-steps">
                <li>Create a project at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
                <li>Enable Firestore Database</li>
                <li>Add your Firebase config to <code>.env.local</code></li>
              </ol>
            </div>
          )}

          {error && isFirebaseEnabled() && (
            <div className="leaderboard__error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="leaderboard__empty">
              <span>🎮</span>
              <span>No {selectedMode === 'solo' ? 'solo' : 'multiplayer'} scores yet. Be the first!</span>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="leaderboard__list">
              {entries.map((entry, index) => {
                const rank = index + 1
                const modeMatches = !highlightMode || highlightMode === selectedMode
                const isHighlighted =
                  highlightScore !== undefined &&
                  highlightRank !== undefined &&
                  modeMatches &&
                  rank === highlightRank

                return (
                  <div 
                    key={entry.id} 
                    className={`leaderboard__entry ${isHighlighted ? 'leaderboard__entry--highlighted' : ''}`}
                  >
                    <span className={`leaderboard__rank ${rank <= 3 ? `leaderboard__rank--${rank}` : ''}`}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </span>
                    <span className="leaderboard__username">{entry.username}</span>
                    <span className="leaderboard__score">{entry.score.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <footer className="leaderboard__footer">
          <button className="game-btn game-btn--secondary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}

