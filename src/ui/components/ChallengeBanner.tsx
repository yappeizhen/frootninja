import { useGameStore } from '@/state/gameStore'

export const ChallengeBanner = () => {
  const { challengeTarget, score } = useGameStore()

  if (challengeTarget === null) return null

  const isAhead = score > challengeTarget
  const diff = Math.abs(score - challengeTarget)

  return (
    <div className="challenge-banner">
      <span>🎯</span>
      <span>Beat</span>
      <span className="challenge-banner__target">{challengeTarget.toLocaleString()}</span>
      <span>pts</span>
      {score > 0 && (
        <span className={`challenge-banner__status ${isAhead ? 'challenge-banner__status--ahead' : 'challenge-banner__status--behind'}`}>
          ({isAhead ? '+' : '-'}{diff})
        </span>
      )}
    </div>
  )
}

