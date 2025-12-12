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

// STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
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

  console.log('[WebRTC] Creating peer connection, isHost:', isHost)

  const pc = new RTCPeerConnection(ICE_SERVERS)
  const unsubscribes: Unsubscribe[] = []
  let remoteStream: MediaStream | null = null
  
  // Queue for ICE candidates that arrive before remote description is set
  const pendingIceCandidates: RTCIceCandidateInit[] = []
  let remoteDescriptionSet = false

  // Add local tracks to connection
  localStream.getTracks().forEach((track) => {
    console.log('[WebRTC] Adding local track:', track.kind)
    pc.addTrack(track, localStream)
  })

  // Handle incoming remote tracks
  pc.ontrack = (event) => {
    console.log('[WebRTC] Received remote track:', event.track.kind)
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

  // Helper to add ICE candidate (queues if remote description not set)
  const addIceCandidate = async (candidateData: RTCIceCandidateInit) => {
    if (!remoteDescriptionSet) {
      console.log('[WebRTC] Queuing ICE candidate (remote description not set yet)')
      pendingIceCandidates.push(candidateData)
      return
    }
    try {
      const candidate = new RTCIceCandidate(candidateData)
      await pc.addIceCandidate(candidate)
      console.log('[WebRTC] Added ICE candidate')
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error)
    }
  }

  // Helper to flush queued ICE candidates after remote description is set
  const flushPendingIceCandidates = async () => {
    console.log('[WebRTC] Flushing', pendingIceCandidates.length, 'pending ICE candidates')
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
      console.log('[WebRTC] Sending ICE candidate')
      try {
        const candidateDoc = doc(iceCandidatesCol, Date.now().toString())
        await setDoc(candidateDoc, event.candidate.toJSON())
      } catch (error) {
        console.error('[WebRTC] Failed to send ICE candidate:', error)
      }
    }
  }

  // Listen for remote ICE candidates
  const unsubIce = onSnapshot(remoteIceCol, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        console.log('[WebRTC] Received remote ICE candidate')
        addIceCandidate(change.doc.data() as RTCIceCandidateInit)
      }
    })
  })
  unsubscribes.push(unsubIce)

  // Connection state logging
  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state:', pc.connectionState)
  }

  pc.oniceconnectionstatechange = () => {
    console.log('[WebRTC] ICE connection state:', pc.iceConnectionState)
  }

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

      // Wait for answer
      const unsubAnswer = onSnapshot(remoteSigDoc, async (snapshot) => {
        const data = snapshot.data()
        if (data?.type === 'answer' && pc.signalingState === 'have-local-offer') {
          console.log('[WebRTC] Received answer')
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: data.sdp,
            }))
            // Now flush any ICE candidates that arrived early
            await flushPendingIceCandidates()
          } catch (error) {
            console.error('[WebRTC] Failed to set remote description:', error)
          }
        }
      })
      unsubscribes.push(unsubAnswer)
    } else {
      // Guest waits for offer, then creates answer
      console.log('[WebRTC] Guest waiting for offer...')
      const unsubOffer = onSnapshot(remoteSigDoc, async (snapshot) => {
        const data = snapshot.data()
        if (data?.type === 'offer' && pc.signalingState === 'stable') {
          console.log('[WebRTC] Received offer, creating answer...')
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'offer',
              sdp: data.sdp,
            }))
            // Now flush any ICE candidates that arrived early
            await flushPendingIceCandidates()
            
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            
            await setDoc(signalingDoc, {
              type: 'answer',
              sdp: answer.sdp,
              timestamp: Date.now(),
            })
          } catch (error) {
            console.error('[WebRTC] Failed to process offer:', error)
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

  console.log('[WebRTC] Closing peer connection')

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

