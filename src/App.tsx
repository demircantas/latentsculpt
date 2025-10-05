import React from 'react'
import XRDemo from './components/XRDemo'

export default function App() {
  const year = new Date().getFullYear()
  return (
    <main className="wrap">
      <header>
        <h1>latentsculpt</h1>
        <p className="tag">generative design × HCI × fabrication</p>
      </header>

      <section className="card">
        <h2>Augmented reality drawings</h2>
        <p>
          A work‑in‑progress research project exploring spatial sketching in AR. This
          demo site will host small prototypes and notes as the work evolves.
        </p>
      </section>

      <section className="card">
        <h3>Status</h3>
        <p>Early scaffold. First interactive XR experiment coming soon.</p>
        <h3>Next steps</h3>
        <ul>
          <li>Bootstrap a WebXR session and scene</li>
          <li>Prototype 3D stroke capture and rendering</li>
          <li>Experiment with touch/pen/gesture input</li>
          <li>Export and share sketches</li>
        </ul>
      </section>

      <XRDemo />

      <footer>
        <p>© {year} latentsculpt</p>
      </footer>
    </main>
  )
}
