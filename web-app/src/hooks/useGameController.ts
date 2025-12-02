import { useEffect, useState } from 'react'
import { GameController } from '../game/GameController'

export const useGameController = () => {
  const [controller] = useState(() => new GameController())

  useEffect(() => {
    controller.start()
    return () => controller.stop()
  }, [controller])

  return controller
}

