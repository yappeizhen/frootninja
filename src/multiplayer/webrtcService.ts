/**
 * WebRTC Service for P2P Video Streaming
 * Handles peer-to-peer video connection between players
 */

import {
  doc,
  collection,
  setDoc,
  onSnapshot,
  deleteDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb, isFirebaseEnabled } from '@/services/firebase'

// ICE servers cache (with expiry to handle quota changes)
let cachedIceServers: RTCConfiguration | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes - allows quota status to refresh

// Clear ICE server cache (call when connection fails)
export function clearIceServerCache(): void {
  cachedIceServers = null
  cacheTimestamp = 0
  console.log('[WebRTC] ICE server cache cleared')
}

// Helper to normalize env booleans
const isTruthy = (value: string | undefined): boolean => {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

// Whether to force TURN relay (useful for restrictive networks)
const isForceRelayEnabled = (): boolean =>
  isTruthy(import.meta.env.VITE_WEBRTC_FORCE_RELAY ?? import.meta.env.VITE_FORCE_TURN_RELAY)

// Sort TURN servers to prefer tcp/443 (looks like normal HTTPS)
const prioritizeTurnServers = (servers: RTCIceServer[]): RTCIceServer[] => {
  const getPriority = (server: RTCIceServer): number => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
    const hasTurn = urls.some((u) => u.startsWith('turn'))
    if (!hasTurn) return 0
    // Highest priority: TLS or tcp on 443
    const prefersTcp443 = urls.some(
      (u) =>
        u.includes(':443') &&
        (u.includes('transport=tcp') || u.startsWith('turns:'))
    )
    if (prefersTcp443) return 3
    // Next: any explicit tcp transport
    const hasTcp = urls.some((u) => u.includes('transport=tcp'))
    if (hasTcp) return 2
    // Lowest TURN priority: UDP/other ports
    return 1
  }

  return [...servers].sort((a, b) => getPriority(b) - getPriority(a))
}

// Fetch TURN credentials from Metered REST API
async function fetchIceServers(): Promise<RTCConfiguration> {
  // Return cached if available and not expired
  const now = Date.now()
  if (cachedIceServers && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedIceServers
  }
  
  // Clear expired cache
  cachedIceServers = null

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const forceRelay = isForceRelayEnabled()

  // Try Metered REST API first (uses custom domain that may bypass firewall)
  const apiKey = import.meta.env.VITE_METERED_API_KEY
  const appName = import.meta.env.VITE_METERED_APP_NAME || 'frootninja'

  if (apiKey) {
    try {
      console.log('[WebRTC] Fetching TURN credentials from Metered API...')
      const response = await fetch(
        `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
      )
      
      if (response.ok) {
        const turnServers = await response.json()
        iceServers.push(...turnServers)
        console.log('[WebRTC] Fetched TURN servers from API ✓', turnServers.length, 'servers')
      } else if (response.status === 402 || response.status === 429) {
        // Quota exceeded or rate limited - fall back to STUN only
        console.warn('[WebRTC] TURN quota exceeded (status', response.status, ') - using STUN only')
      } else {
        console.error('[WebRTC] API response error:', response.status)
      }
    } catch (error) {
      console.error('[WebRTC] Failed to fetch from API:', error)
      console.log('[WebRTC] Falling back to STUN only')
    }
  } else {
    // Fallback to static credentials
    const turnUsername = import.meta.env.VITE_TURN_USERNAME
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL
    
    if (turnUsername && turnCredential) {
      iceServers.push(
        {
          urls: 'turns:global.relay.metered.ca:443?transport=tcp',
          username: turnUsername,
          credential: turnCredential,
        },
        {
          urls: 'turn:global.relay.metered.ca:443?transport=tcp',
          username: turnUsername,
          credential: turnCredential,
        },
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: turnUsername,
          credential: turnCredential,
        }
      )
      console.log('[WebRTC] Using static TURN credentials ✓')
    } else {
      console.log('[WebRTC] No TURN configured - STUN only')
    }
  }

  const finalIceServers = forceRelay ? prioritizeTurnServers(iceServers) : iceServers
  const config: RTCConfiguration = {
    iceServers: finalIceServers,
    iceCandidatePoolSize: 10,
  }

  if (forceRelay) {
    config.iceTransportPolicy = 'relay'
    console.warn('[WebRTC] Force relay enabled - TURN only (prefers tcp/443)')
  } else {
    console.log('[WebRTC] ICE policy: all (host/STUN/TURN)')
  }

  cachedIceServers = config
  cacheTimestamp = Date.now()
  return cachedIceServers
}

export interface WebRTCConnection {
  peerConnection: RTCPeerConnection
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  unsubscribes: Unsubscribe[]
}

/**
 * Create a WebRTC peer connection for a room
 */
export async function createPeerConnection(
  roomId: string,
  playerId: string,
  isHost: boolean,
  localStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void
): Promise<WebRTCConnection | null> {
  if (!isFirebaseEnabled()) {
    console.warn('[WebRTC] Firebase not enabled')
    return null
  }

  const db = getDb()
  if (!db) {
    console.error('[WebRTC] No database instance')
    return null
  }

  // Fetch ICE servers (includes TURN if configured)
  const iceConfig = await fetchIceServers()
  const pc = new RTCPeerConnection(iceConfig)
  const unsubscribes: Unsubscribe[] = []
  let remoteStream: MediaStream | null = null
  
  // Queue for ICE candidates that arrive before remote description is set
  const pendingIceCandidates: RTCIceCandidateInit[] = []
  let remoteDescriptionSet = false

  // Add local tracks to connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream)
  })

  // Handle incoming remote tracks
  pc.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream()
    }
    remoteStream.addTrack(event.track)
    onRemoteStream(remoteStream)
  }

  // Signaling paths in Firestore
  const signalingDoc = doc(db, 'rooms', roomId, 'signaling', playerId)
  const remoteSigDoc = doc(db, 'rooms', roomId, 'signaling', isHost ? 'guest' : 'host')
  const iceCandidatesCol = collection(db, 'rooms', roomId, 'signaling', playerId, 'iceCandidates')
  const remoteIceCol = collection(db, 'rooms', roomId, 'signaling', isHost ? 'guest' : 'host', 'iceCandidates')

  // Clean up stale signaling data before starting
  try {
    await deleteDoc(signalingDoc)
    console.log('[WebRTC] Cleaned up old signaling data for', playerId)
  } catch {
    // Ignore - doc might not exist
  }
  
  // Also try to clean up old ICE candidates for this player
  // This helps when reconnecting after a failed attempt
  try {
    const { getDocs, deleteDoc: delDoc } = await import('firebase/firestore')
    const oldCandidates = await getDocs(iceCandidatesCol)
    const deletePromises = oldCandidates.docs.map(d => delDoc(d.ref))
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises)
      console.log('[WebRTC] Cleaned up', deletePromises.length, 'old ICE candidates for', playerId)
    }
  } catch {
    // Ignore - collection might not exist
  }

  // Debug logging for connection states
  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state:', pc.connectionState)
    if (pc.connectionState === 'failed') {
      console.error('[WebRTC] Connection failed - may need to restart signaling')
    }
  }
  pc.oniceconnectionstatechange = () => {
    console.log('[WebRTC] ICE state:', pc.iceConnectionState)
    // Attempt ICE restart if connection fails or disconnects
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      console.log('[WebRTC] ICE failed/disconnected, clearing cache and attempting restart in 2s...')
      // Clear ICE server cache so next connection attempt gets fresh servers
      clearIceServerCache()
      setTimeout(() => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.log('[WebRTC] Restarting ICE...')
          pc.restartIce()
        }
      }, 2000)
    }
  }
  pc.onsignalingstatechange = () => {
    console.log('[WebRTC] Signaling state:', pc.signalingState)
  }

  // Helper to add ICE candidate (queues if remote description not set)
  const addIceCandidate = async (candidateData: RTCIceCandidateInit) => {
    if (!remoteDescriptionSet) {
      pendingIceCandidates.push(candidateData)
      return
    }
    try {
      const candidate = new RTCIceCandidate(candidateData)
      await pc.addIceCandidate(candidate)
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error)
    }
  }

  // Helper to flush queued ICE candidates after remote description is set
  const flushPendingIceCandidates = async () => {
    remoteDescriptionSet = true
    for (const candidateData of pendingIceCandidates) {
      try {
        const candidate = new RTCIceCandidate(candidateData)
        await pc.addIceCandidate(candidate)
      } catch (error) {
        console.error('[WebRTC] Failed to add queued ICE candidate:', error)
      }
    }
    pendingIceCandidates.length = 0
  }

  // Handle ICE candidates
  console.log('[WebRTC] Will store ICE candidates at:', `rooms/${roomId}/signaling/${playerId}/iceCandidates`)
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      const c = event.candidate
      console.log('[WebRTC] Local ICE candidate:', c.type, c.protocol, c.address, c.relatedAddress ? `(relay via ${c.relatedAddress})` : '')
      if (c.type === 'relay') {
        console.log('[WebRTC] ✓ TURN relay candidate generated!')
      }
      try {
        const candidateId = Date.now().toString()
        const candidateDoc = doc(iceCandidatesCol, candidateId)
        await setDoc(candidateDoc, event.candidate.toJSON())
        console.log('[WebRTC] Stored ICE candidate:', candidateId)
      } catch (error) {
        console.error('[WebRTC] Failed to send ICE candidate:', error)
      }
    } else {
      console.log('[WebRTC] ICE candidate gathering complete')
    }
  }

  // Log ICE gathering state changes
  pc.onicegatheringstatechange = () => {
    console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState)
  }

  // Listen for remote ICE candidates
  const remoteIcePath = `rooms/${roomId}/signaling/${isHost ? 'guest' : 'host'}/iceCandidates`
  console.log('[WebRTC] Setting up listener for remote ICE candidates at:', remoteIcePath)
  
  // Track which candidates we've already processed to avoid duplicates
  const processedCandidates = new Set<string>()
  
  // Helper to process candidates from either listener or polling
  const processCandidateDoc = (docId: string, candidateData: RTCIceCandidateInit) => {
    if (processedCandidates.has(docId)) return
    processedCandidates.add(docId)
    console.log('[WebRTC] Processing remote ICE candidate:', docId, candidateData.candidate?.substring(0, 50))
    addIceCandidate(candidateData)
  }
  
  // Poll the collection directly as a fallback for listener issues
  const pollRemoteCandidates = async () => {
    try {
      const { getDocs } = await import('firebase/firestore')
      const snapshot = await getDocs(remoteIceCol)
      console.log('[WebRTC] Polling remote ICE candidates:', snapshot.size, 'docs found,', processedCandidates.size, 'already processed')
      snapshot.docs.forEach(doc => {
        processCandidateDoc(doc.id, doc.data() as RTCIceCandidateInit)
      })
    } catch (e) {
      console.error('[WebRTC] Failed to poll remote candidates:', e)
    }
  }
  
  // Poll periodically as fallback for real-time listener
  const pollInterval = setInterval(pollRemoteCandidates, 1500)
  setTimeout(() => clearInterval(pollInterval), 15000) // Stop polling after 15s
  
  // Also set up real-time listener
  const unsubIce = onSnapshot(remoteIceCol, (snapshot) => {
    console.log('[WebRTC] Remote ICE snapshot received, docs:', snapshot.size, 'changes:', snapshot.docChanges().length)
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data() as RTCIceCandidateInit
        processCandidateDoc(change.doc.id, candidateData)
      }
    })
  }, (error) => {
    console.error('[WebRTC] Error listening for remote ICE candidates:', error)
  })
  
  unsubscribes.push(unsubIce)
  unsubscribes.push(() => clearInterval(pollInterval))

  try {
    if (isHost) {
      // Host creates offer
      console.log('[WebRTC] Host creating offer...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      await setDoc(signalingDoc, {
        type: 'offer',
        sdp: offer.sdp,
        timestamp: Date.now(),
      })
      console.log('[WebRTC] Host sent offer')

      // Wait for answer
      const unsubAnswer = onSnapshot(remoteSigDoc, async (snapshot) => {
        const data = snapshot.data()
        console.log('[WebRTC] Host received data:', data?.type, 'signalingState:', pc.signalingState)
        if (data?.type === 'answer' && pc.signalingState === 'have-local-offer') {
          try {
            console.log('[WebRTC] Host processing answer...')
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: data.sdp,
            }))
            console.log('[WebRTC] Host set remote description, flushing ICE candidates...')
            await flushPendingIceCandidates()
            console.log('[WebRTC] Host ready!')
          } catch (error) {
            console.error('[WebRTC] Host failed to set remote description:', error)
          }
        }
      })
      unsubscribes.push(unsubAnswer)
    } else {
      // Guest waits for offer, then creates answer
      console.log('[WebRTC] Guest waiting for offer...')
      const unsubOffer = onSnapshot(remoteSigDoc, async (snapshot) => {
        const data = snapshot.data()
        console.log('[WebRTC] Guest received data:', data?.type, 'signalingState:', pc.signalingState)
        if (data?.type === 'offer' && pc.signalingState === 'stable') {
          try {
            console.log('[WebRTC] Guest processing offer...')
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'offer',
              sdp: data.sdp,
            }))
            await flushPendingIceCandidates()
            
            console.log('[WebRTC] Guest creating answer...')
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            
            await setDoc(signalingDoc, {
              type: 'answer',
              sdp: answer.sdp,
              timestamp: Date.now(),
            })
            console.log('[WebRTC] Guest sent answer!')
          } catch (error) {
            console.error('[WebRTC] Guest failed to process offer:', error)
          }
        }
      })
      unsubscribes.push(unsubOffer)
    }
  } catch (error) {
    console.error('[WebRTC] Signaling failed:', error)
    pc.close()
    return null
  }

  return {
    peerConnection: pc,
    localStream,
    remoteStream,
    unsubscribes,
  }
}

/**
 * Close and cleanup WebRTC connection
 */
export async function closePeerConnection(
  connection: WebRTCConnection | null,
  roomId: string,
  playerId: string
): Promise<void> {
  if (!connection) return

  // Unsubscribe from all listeners
  connection.unsubscribes.forEach((unsub) => unsub())

  // Close peer connection
  connection.peerConnection.close()

  // Cleanup signaling data
  if (isFirebaseEnabled()) {
    const db = getDb()
    if (db) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId, 'signaling', playerId))
      } catch (error) {
        console.error('[WebRTC] Failed to cleanup signaling:', error)
      }
    }
  }
}

