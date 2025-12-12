import {
  collection,
  doc,
  setDoc,
  getDoc,
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
  deviceId: string
}

const COLLECTION_NAME = 'scores'

// Generate a persistent device ID to identify returning players
const getDeviceId = (): string => {
  const key = 'frootninja_device_id'
  let deviceId = localStorage.getItem(key)
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(key, deviceId)
  }
  return deviceId
}

// Generate a session ID to prevent duplicate submissions within a session
const getSessionId = (): string => {
  const key = 'frootninja_session_id'
  let sessionId = sessionStorage.getItem(key)
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem(key, sessionId)
  }
  return sessionId
}

export type UsernameCheckResult = 'available' | 'taken' | 'owned' | 'error'

export const checkUsername = async (username: string): Promise<UsernameCheckResult> => {
  if (!isFirebaseEnabled()) {
    return 'available' // Allow if Firebase not configured
  }

  const db = getDb()
  if (!db) return 'error'

  try {
    const deviceId = getDeviceId()
    
    // Check if this username exists in the database
    const scoresRef = collection(db, COLLECTION_NAME)
    const q = query(scoresRef, where('username', '==', username.trim()), limit(1))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return 'available'
    }
    
    // Username exists - check if it belongs to this device
    const existingDoc = snapshot.docs[0].data() as ScoreDocument
    if (existingDoc.deviceId === deviceId) {
      return 'owned' // Same device, can reuse
    }
    
    return 'taken' // Different device owns this username
  } catch (error) {
    console.error('Failed to check username:', error)
    return 'error'
  }
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
    const deviceId = getDeviceId()
    const sanitizedScore = Math.max(0, Math.min(score, 10000))
    
    // Use a deterministic document ID based on deviceId and gameMode
    // This ensures only one highscore per player per game mode
    const docId = `${deviceId}_${gameMode}`
    const docRef = doc(db, COLLECTION_NAME, docId)
    
    // Check if player already has a score for this game mode
    const existingDoc = await getDoc(docRef)
    
    if (existingDoc.exists()) {
      const existingData = existingDoc.data() as ScoreDocument
      // Only update if new score is higher
      if (sanitizedScore <= existingData.score) {
        return true // Still return true since this isn't an error
      }
    }
    
    // Save the new highscore
    await setDoc(docRef, {
      username: username.trim().slice(0, 20),
      score: sanitizedScore,
      gameMode,
      timestamp: serverTimestamp(),
      sessionId,
      deviceId,
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
    
    // Each player only has one entry per game mode, so no deduplication needed
    const q = gameMode
      ? query(scoresRef, where('gameMode', '==', gameMode), orderBy('score', 'desc'), limit(limitCount))
      : query(scoresRef, orderBy('score', 'desc'), limit(limitCount))
    
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as ScoreDocument
      return {
        id: docSnap.id,
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

// Get the current device's personal best score from Firebase
export const getPersonalBest = async (gameMode?: GameMode): Promise<number> => {
  if (!isFirebaseEnabled()) {
    return 0
  }

  const db = getDb()
  if (!db) return 0

  try {
    const deviceId = getDeviceId()
    
    if (gameMode) {
      // Direct document lookup when gameMode is specified
      const docId = `${deviceId}_${gameMode}`
      const docRef = doc(db, COLLECTION_NAME, docId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data() as ScoreDocument
        return data.score
      }
      return 0
    }
    
    // If no gameMode specified, check all game modes for this device
    const scoresRef = collection(db, COLLECTION_NAME)
    const q = query(
      scoresRef, 
      where('deviceId', '==', deviceId),
      limit(10)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return 0
    }
    
    // Find the highest score across all game modes
    let highestScore = 0
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as ScoreDocument
      if (data.score > highestScore) {
        highestScore = data.score
      }
    }
    
    return highestScore
  } catch (error) {
    console.error('Failed to get personal best:', error)
    return 0
  }
}

