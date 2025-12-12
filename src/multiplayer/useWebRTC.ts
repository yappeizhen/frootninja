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
  const [reconnectTrigger, setReconnectTrigger] = useState(0)
  const connectionRef = useRef<WebRTCConnection | null>(null)

  // Handle remote stream callback
  const handleRemoteStream = useCallback((stream: MediaStream) => {
    setRemoteStream(stream)
  }, [])

  // Force reconnection (useful for rematch when connection was lost)
  const reconnect = useCallback(() => {
    // Close existing connection if any
    if (connectionRef.current && roomId) {
      closePeerConnection(connectionRef.current, roomId, isHost ? 'host' : 'guest')
      connectionRef.current = null
      setRemoteStream(null)
      setConnectionState('idle')
    }
    // Trigger effect to create new connection
    setReconnectTrigger(prev => prev + 1)
  }, [roomId, isHost])

  // Setup WebRTC connection when conditions are met
  useEffect(() => {
    if (!enabled || !roomId || !localStream) {
      return
    }

    // Don't create new connection if one already exists and is healthy
    if (connectionRef.current) {
      const state = connectionRef.current.peerConnection.connectionState
      if (state === 'connected' || state === 'connecting') {
        return
      }
      // Connection exists but is unhealthy, close it first
      closePeerConnection(connectionRef.current, roomId, isHost ? 'host' : 'guest')
      connectionRef.current = null
    }

    let mounted = true

    const setupConnection = async () => {
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
  }, [enabled, roomId, isHost, localStream, handleRemoteStream, reconnectTrigger])

  return {
    remoteStream,
    connectionState,
    isConnected: connectionState === 'connected',
    reconnect,
  }
}

