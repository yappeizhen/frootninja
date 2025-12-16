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

// ICE servers for NAT traversal (STUN + TURN)
// Using multiple free STUN servers for better connectivity
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // OpenRelay public TURN server (free, no credentials required for STUN)
    { urls: 'stun:openrelay.metered.ca:80' },
    // Free TURN servers - these may have rate limits
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
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

  const pc = new RTCPeerConnection(ICE_SERVERS)
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
    // Attempt ICE restart if connection fails
    if (pc.iceConnectionState === 'failed') {
      console.log('[WebRTC] ICE failed, attempting restart...')
      pc.restartIce()
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
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log('[WebRTC] Local ICE candidate:', event.candidate.type, event.candidate.protocol, event.candidate.address)
      try {
        const candidateDoc = doc(iceCandidatesCol, Date.now().toString())
        await setDoc(candidateDoc, event.candidate.toJSON())
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
  const unsubIce = onSnapshot(remoteIceCol, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data() as RTCIceCandidateInit
        console.log('[WebRTC] Remote ICE candidate received:', candidateData.candidate?.substring(0, 50))
        addIceCandidate(candidateData)
      }
    })
  })
  unsubscribes.push(unsubIce)

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

