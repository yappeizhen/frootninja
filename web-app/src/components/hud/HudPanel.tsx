import { selectCombo, selectScore, useGameStore } from '../../state/useGameStore'
import './HudPanel.css'

export const HudPanel = () => {
  const score = useGameStore(selectScore)
  const combo = useGameStore(selectCombo)

  return (
    <div className="hud-panel">
      <div className="hud-panel__item">
        <p>Score</p>
        <strong>{score}</strong>
      </div>
      <div className="hud-panel__item">
        <p>Combo</p>
        <strong>{combo}x</strong>
      </div>
    </div>
  )
}

