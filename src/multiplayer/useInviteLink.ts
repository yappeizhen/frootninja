/**
 * useInviteLink Hook
 * Handles invite link URL parameters for multiplayer room joining
 */

import { useEffect, useCallback } from 'react'
import { useMultiplayerStore } from '@/state/multiplayerStore'

const INVITE_PARAM = 'join'

/**
 * Parse room code from current URL
 */
export function getRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const code = params.get(INVITE_PARAM)
  return code?.toUpperCase() || null
}

/**
 * Generate invite link for a room code
 */
export function generateInviteLink(roomCode: string): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(INVITE_PARAM, roomCode)
  return url.toString()
}

/**
 * Clear the invite code from URL without refreshing
 */
export function clearInviteFromUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete(INVITE_PARAM)
  window.history.replaceState({}, '', url.toString())
}

/**
 * Hook to manage invite link state
 */
export function useInviteLink() {
  const { pendingRoomCode, setPendingRoomCode, clearPendingRoomCode } = useMultiplayerStore()

  // Check for invite code on mount
  useEffect(() => {
    const code = getRoomCodeFromUrl()
    if (code && code.length === 4) {
      setPendingRoomCode(code)
      // Clear from URL to prevent re-triggering on refresh
      clearInviteFromUrl()
    }
  }, [setPendingRoomCode])

  const copyInviteLink = useCallback(async (roomCode: string): Promise<boolean> => {
    try {
      const link = generateInviteLink(roomCode)
      await navigator.clipboard.writeText(link)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    pendingRoomCode,
    clearPendingRoomCode,
    copyInviteLink,
    generateInviteLink,
  }
}

