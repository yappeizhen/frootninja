import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  getCountFromServer,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { getDb, isFirebaseEnabled } from './firebase'
import type { GameMode } from '@/types'

export interface LeaderboardEntry {
  id: string
  username: string
  score: number
  gameMode: GameMode
  timestamp: Date
}

interface ScoreDocument {
  username: string
  score: number
  gameMode: GameMode
  timestamp: Timestamp
  sessionId: string
}

const COLLECTION_NAME = 'scores'

// Generate a session ID to prevent duplicate submissions
const getSessionId = (): string => {
  const key = 'frootninja_session_id'
  let sessionId = sessionStorage.getItem(key)
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem(key, sessionId)
  }
  return sessionId
}

export const submitScore = async (
  username: string,
  score: number,
  gameMode: GameMode
): Promise<boolean> => {
  if (!isFirebaseEnabled()) {
    console.warn('Firebase not configured, score not submitted')
    return false
  }

  const db = getDb()
  if (!db) return false

  try {
    const sessionId = getSessionId()
    await addDoc(collection(db, COLLECTION_NAME), {
      username: username.trim().slice(0, 20),
      score: Math.max(0, Math.min(score, 10000)),
      gameMode,
      timestamp: serverTimestamp(),
      sessionId,
    } satisfies Omit<ScoreDocument, 'timestamp'> & { timestamp: ReturnType<typeof serverTimestamp> })
    return true
  } catch (error) {
    console.error('Failed to submit score:', error)
    return false
  }
}

export const getTopScores = async (
  limitCount: number = 50,
  gameMode?: GameMode
): Promise<LeaderboardEntry[]> => {
  if (!isFirebaseEnabled()) {
    return []
  }

  const db = getDb()
  if (!db) return []

  try {
    const scoresRef = collection(db, COLLECTION_NAME)
    
    // Build query based on whether gameMode filter is needed
    const q = gameMode
      ? query(scoresRef, where('gameMode', '==', gameMode), orderBy('score', 'desc'), limit(limitCount))
      : query(scoresRef, orderBy('score', 'desc'), limit(limitCount))
    
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => {
      const data = doc.data() as ScoreDocument
      return {
        id: doc.id,
        username: data.username,
        score: data.score,
        gameMode: data.gameMode,
        timestamp: data.timestamp?.toDate() ?? new Date(),
      }
    })
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return []
  }
}

export const getPlayerRank = async (
  score: number,
  gameMode?: GameMode
): Promise<number> => {
  if (!isFirebaseEnabled() || score <= 0) {
    return 0
  }

  const db = getDb()
  if (!db) return 0

  try {
    const scoresRef = collection(db, COLLECTION_NAME)
    
    // Build query based on whether gameMode filter is needed
    const q = gameMode
      ? query(scoresRef, where('score', '>', score), where('gameMode', '==', gameMode))
      : query(scoresRef, where('score', '>', score))
    
    const snapshot = await getCountFromServer(q)
    return snapshot.data().count + 1
  } catch (error) {
    console.error('Failed to get player rank:', error)
    return 0
  }
}

