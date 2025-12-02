import type { SliceEvent } from '../gestures/sliceDetector'
import { useGameStore } from '../state/useGameStore'

export class GameController {
  private spawnHandle?: number

  start() {
    if (this.spawnHandle) {
      return
    }
    const spawnFruit = useGameStore.getState().spawnFruit
    this.spawnHandle = window.setInterval(() => {
      spawnFruit()
    }, 2200)
  }

  stop() {
    if (this.spawnHandle) {
      window.clearInterval(this.spawnHandle)
      this.spawnHandle = undefined
    }
  }

  handleSlice(event: SliceEvent) {
    useGameStore.getState().sliceAt(event.point, event.magnitude)
  }
}

