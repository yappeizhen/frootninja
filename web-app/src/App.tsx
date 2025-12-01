import { Suspense } from 'react';

import { CameraFeed } from './components/CameraFeed';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TelemetryPanel } from './components/TelemetryPanel';
import { useGesturePipeline } from './hooks/useGesturePipeline';
import { useSliceAudio } from './hooks/useSliceAudio';
import './app.css';

function App() {
  const { status, error, videoRef } = useGesturePipeline();
  useSliceAudio();

  return (
    <div className="app-shell">
      <main className="stage">
        <section className="stage__canvas">
          <Suspense fallback={<div className="stage__loading">Loading scene...</div>}>
            <GameCanvas />
          </Suspense>
          <HUD />
        </section>
        <aside className="stage__sidebar">
          <CameraFeed status={status} videoRef={videoRef} />
          <TelemetryPanel status={status} error={error} />
        </aside>
      </main>
    </div>
  );
}

export default App;

