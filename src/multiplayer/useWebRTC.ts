/**
 * useWebRTC Hook
 * React hook for managing WebRTC video connection
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPeerConnection, closePeerConnection, type WebRTCConnection } from './webrtcService'

interface UseWebRTCOptions {
  roomId: string | null
  isHost: boolean
  localStream: MediaStream | null
  enabled: boolean
}

export function useWebRTC({ roomId, isHost, localStream, enabled }: UseWebRTCOptions) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'idle'>('idle')
  const connectionRef = useRef<WebRTCConnection | null>(null)

  // Handle remote stream callback
  const handleRemoteStream = useCallback((stream: MediaStream) => {
    console.log('[useWebRTC] Received remote stream')
    setRemoteStream(stream)
  }, [])

  // Setup WebRTC connection when conditions are met
  useEffect(() => {
    if (!enabled || !roomId || !localStream) {
      return
    }

    let mounted = true

    const setupConnection = async () => {
      console.log('[useWebRTC] Setting up WebRTC connection...')
      
      const connection = await createPeerConnection(
        roomId,
        isHost ? 'host' : 'guest',
        isHost,
        localStream,
        handleRemoteStream
      )

      if (!mounted) {
        if (connection) {
          closePeerConnection(connection, roomId, isHost ? 'host' : 'guest')
        }
        return
      }

      if (connection) {
        connectionRef.current = connection
        
        // Monitor connection state
        connection.peerConnection.onconnectionstatechange = () => {
          const state = connection.peerConnection.connectionState
          console.log('[useWebRTC] Connection state changed:', state)
          setConnectionState(state)
        }
        
        setConnectionState(connection.peerConnection.connectionState)
      }
    }

    setupConnection()

    return () => {
      mounted = false
      if (connectionRef.current) {
        closePeerConnection(connectionRef.current, roomId, isHost ? 'host' : 'guest')
        connectionRef.current = null
        setRemoteStream(null)
        setConnectionState('idle')
      }
    }
  }, [enabled, roomId, isHost, localStream, handleRemoteStream])

  return {
    remoteStream,
    connectionState,
    isConnected: connectionState === 'connected',
  }
}

