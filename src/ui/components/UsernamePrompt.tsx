import { useState, useCallback } from 'react'
import { useUserStore } from '@/state/userStore'
import { checkUsername } from '@/services/leaderboardService'

interface UsernamePromptProps {
  onSubmit: (username: string) => void
  onSkip?: () => void
}

export const UsernamePrompt = ({ onSubmit, onSkip }: UsernamePromptProps) => {
  const { username: savedUsername } = useUserStore()
  const [inputValue, setInputValue] = useState(savedUsername)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    
    if (trimmed.length > 20) {
      setError('Name must be 20 characters or less')
      return
    }

    // Check if username is available
    setIsChecking(true)
    setError('')
    
    const result = await checkUsername(trimmed)
    setIsChecking(false)
    
    if (result === 'taken') {
      setError('This name is already taken. Try another!')
      return
    }
    
    if (result === 'error') {
      setError('Could not verify name. Try again.')
      return
    }
    
    // 'available' or 'owned' - proceed
    onSubmit(trimmed)
  }, [inputValue, onSubmit])

  return (
    <div className="username-prompt">
      <div className="username-prompt__icon">🏆</div>
      <h2 className="username-prompt__title">Enter Your Name</h2>
      <p className="username-prompt__subtitle">
        Join the global leaderboard!
      </p>
      
      <form onSubmit={handleSubmit} className="username-prompt__form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError('')
          }}
          placeholder="Your name..."
          maxLength={20}
          autoFocus
          disabled={isChecking}
          className="username-prompt__input"
        />
        {error && <span className="username-prompt__error">{error}</span>}
        
        <div className="username-prompt__actions">
          <button type="submit" className="game-btn" disabled={isChecking}>
            {isChecking ? 'Checking...' : 'Submit Score'}
          </button>
          {onSkip && (
            <button 
              type="button" 
              className="game-btn game-btn--secondary"
              onClick={onSkip}
              disabled={isChecking}
            >
              Skip
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

