import type { ReactNode } from 'react'
import './AppLayout.css'

interface Props {
  left: ReactNode
  right: ReactNode
}

export const AppLayout = ({ left, right }: Props) => {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="app-shell__eyebrow">Prototype</p>
          <h1>CV Fruit Ninja</h1>
        </div>
        <div className="app-shell__badge">MVP</div>
      </header>
      <main className="app-shell__body">
        <section className="app-shell__column">{left}</section>
        <section className="app-shell__column">{right}</section>
      </main>
    </div>
  )
}

