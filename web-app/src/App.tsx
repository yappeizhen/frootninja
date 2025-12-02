import './App.css'
import { AppLayout } from './components/layout/AppLayout'
import { VideoFeed } from './components/vision/VideoFeed'
import { FruitField } from './components/game/FruitField'
import { HudPanel } from './components/hud/HudPanel'
import { PerfPanel } from './components/metrics/PerfPanel'
import { useGameLoop } from './hooks/useGameLoop'
import { useGestureBridge } from './hooks/useGestureBridge'
import { useGameController } from './hooks/useGameController'

function App() {
  useGameLoop()
  const controller = useGameController()
  useGestureBridge(controller)

  return (
    <AppLayout
      left={<VideoFeed />}
      right={
        <>
          <FruitField />
          <HudPanel />
          <PerfPanel />
        </>
      }
    />
  )
}

export default App
