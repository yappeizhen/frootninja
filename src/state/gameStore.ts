import { create } from 'zustand'
import type { GameMode, GamePhase, GameState, GestureEvent, SliceEvent } from '@/types'
import { getPersonalBest } from '@/services/leaderboardService'

const HIGH_SCORE_KEY = 'frootninja_highscore'
const DEFAULT_ROUND_DURATION = 30

const loadHighScore = (): number => {
  try {
    const stored = localStorage.getItem(HIGH_SCORE_KEY)
    return stored ? parseInt(stored, 10) : 0
  } catch {
    return 0
  }
}

const saveHighScore = (score: number): void => {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, score.toString())
  } catch {
    // localStorage not available
  }
}

const initialState: GameState = {
  phase: 'idle',
  gameMode: 'solo',
  score: 0,
  combo: 0,
  lives: 5,
  level: 1,
  activeFruits: [],
  timeRemaining: DEFAULT_ROUND_DURATION,
  roundDuration: DEFAULT_ROUND_DURATION,
  highScore: loadHighScore(),
  isPlaying: false,
  challengeTarget: null,
}

interface GameStore extends GameState {
  setPhase: (phase: GamePhase) => void
  setGameMode: (mode: GameMode) => void
  setLives: (lives: number) => void
  registerSlice: (event: SliceEvent) => void
  registerGesture: (event: GestureEvent) => void
  resetCombo: () => void
  setChallengeTarget: (target: number | null) => void
  setHighScore: (score: number) => void
  syncHighScore: () => Promise<void>
  startRound: () => void
  endRound: () => void
  tickTimer: () => void
  reset: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,
  
  setPhase: (phase) => set({ phase }),
  
  setGameMode: (gameMode) => set({ gameMode }),
  
  setLives: (lives) => set({ lives }),
  
  registerSlice: (event) =>
    set((state) => ({
      score: Math.max(0, state.score + event.scoreDelta),
      combo: event.scoreDelta > 0 ? state.combo + 1 : 0,
      recentSlice: event,
    })),
  
  registerGesture: (event) => set({ lastGesture: event }),
  
  resetCombo: () => set({ combo: 0 }),
  
  setChallengeTarget: (target) => set({ challengeTarget: target }),
  
  setHighScore: (score) => {
    const current = get().highScore
    if (score > current) {
      saveHighScore(score)
      set({ highScore: score })
    }
  },
  
  syncHighScore: async () => {
    try {
      // Fetch personal best from Firebase
      const firebaseHighScore = await getPersonalBest('solo')
      const localHighScore = loadHighScore() // Re-read from localStorage to ensure fresh
      const currentStoreHighScore = get().highScore
      
      // Find the maximum across all sources
      const bestScore = Math.max(firebaseHighScore, localHighScore, currentStoreHighScore)
      
      // Update localStorage and store if we found a higher score
      if (bestScore > 0) {
        if (bestScore !== localHighScore) {
          saveHighScore(bestScore)
        }
        if (bestScore !== currentStoreHighScore) {
          set({ highScore: bestScore })
        }
      }
      
      console.log(`High score sync: Firebase=${firebaseHighScore}, Local=${localHighScore}, Best=${bestScore}`)
    } catch (error) {
      console.error('Failed to sync high score:', error)
    }
  },
  
  startRound: () => set({
    phase: 'running',
    isPlaying: true,
    score: 0,
    combo: 0,
    lives: 5,
    timeRemaining: get().roundDuration,
    activeFruits: [],
    recentSlice: undefined,
  }),
  
  endRound: () => {
    const state = get()
    const isNewHighScore = state.score > state.highScore
    if (isNewHighScore) {
      saveHighScore(state.score)
    }
    set({
      phase: 'game-over',
      isPlaying: false,
      highScore: isNewHighScore ? state.score : state.highScore,
    })
  },
  
  tickTimer: () => {
    const state = get()
    if (!state.isPlaying || state.timeRemaining <= 0) return
    
    const newTime = state.timeRemaining - 1
    if (newTime <= 0) {
      get().endRound()
    } else {
      set({ timeRemaining: newTime })
    }
  },
  
  reset: () => set({
    ...initialState,
    highScore: loadHighScore(),
  }),
}))
