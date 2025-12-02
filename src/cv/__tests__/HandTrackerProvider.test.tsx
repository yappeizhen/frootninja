import { act, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { HandTrackerProvider, useHandData } from '@/cv'
import type { HandFrame, HandTrackingStatus } from '@/types'
import type {
  HandFrameListener,
  HandTracker,
  StatusListener,
} from '@/cv/handTracker'

class MockTracker implements HandTracker {
  private frameListeners = new Set<HandFrameListener>()
  private statusListeners = new Set<StatusListener>()
  private _status: HandTrackingStatus = 'idle'

  getStatus = () => this._status

  start = vi.fn(async () => {})

  stop = vi.fn()

  subscribe = (listener: HandFrameListener) => {
    this.frameListeners.add(listener)
    return () => this.frameListeners.delete(listener)
  }

  onStatusChange = (listener: StatusListener) => {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  emitFrame(frame: HandFrame | null) {
    this.frameListeners.forEach((listener) => listener(frame))
  }

  emitStatus(status: HandTrackingStatus) {
    this.setStatus(status)
  }

  hasStatusSubscribers() {
    return this.statusListeners.size > 0
  }

  private setStatus(status: HandTrackingStatus) {
    if (this._status === status) return
    this._status = status
    this.statusListeners.forEach((listener) => listener(status))
  }
}

const TestHarness = () => {
  const { status, frame, videoRef } = useHandData()

  useEffect(() => {
    const video = document.createElement('video')
    videoRef(video)
  }, [videoRef])

  return (
    <>
      <span data-testid="status">{status}</span>
      <span data-testid="hands">{frame?.hands.length ?? 0}</span>
    </>
  )
}

describe('HandTrackerProvider', () => {
  it('propagates status and frame updates from the tracker', async () => {
    const tracker = new MockTracker()
    render(
      <HandTrackerProvider factory={() => tracker}>
        <TestHarness />
      </HandTrackerProvider>,
    )

    await act(async () => {})

    expect(screen.getByTestId('status').textContent).toBe('idle')

    await waitFor(() => expect(tracker.hasStatusSubscribers()).toBe(true))

    await act(async () => {
      tracker.emitStatus('ready')
    })

    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('ready'),
    )

    act(() => {
      tracker.emitFrame({
        hands: [
          {
            handedness: 'Right',
            score: 0.9,
            landmarks: [
              { x: 0.1, y: 0.2, z: 0 },
              { x: 0.2, y: 0.3, z: 0 },
            ],
          },
        ],
        timestamp: 123,
        fps: 60,
      })
    })

    await waitFor(() =>
      expect(screen.getByTestId('hands').textContent).toBe('1'),
    )
  })
})

