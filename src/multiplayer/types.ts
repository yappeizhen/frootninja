/**
 * Multiplayer Types
 * Types for real-time online multiplayer mode
 */

export type RoomState = 'waiting' | 'countdown' | 'playing' | 'finished'

export interface RoomPlayer {
  id: string
  name: string
  elo: number
  ready: boolean
  score: number
  combo: number
  maxCombo: number
  connected: boolean
  lastActivity: number
}

export interface SliceEventMP {
  id: string
  fruitId: string
  playerId: string
  timestamp: number
  position: { x: number; y: number }
}

export interface Room {
  id: string
  code: string // 4-char join code (e.g., "ABCD")
  state: RoomState
  hostId: string
  seed: number // For deterministic fruit spawns
  createdAt: number
  startedAt?: number
  endedAt?: number
  winnerId?: string
  players: Record<string, RoomPlayer>
}

export interface PlayerProfile {
  id: string
  username: string
  elo: number
  wins: number
  losses: number
  gamesPlayed: number
  lastPlayed: number
}

// Room data as stored in Firebase RTDB
export interface RoomData {
  code: string
  state: RoomState
  hostId: string
  seed: number
  createdAt: number
  startedAt?: number
  endedAt?: number
  winnerId?: string
  players: Record<string, RoomPlayer>
}

// Matchmaking queue entry
export interface QueueEntry {
  playerId: string
  playerName: string
  elo: number
  joinedAt: number
}

