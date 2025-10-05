import React from 'react'

export default function App() {
  const year = new Date().getFullYear()
  return (
    <main className="wrap">
      <header>
        <h1>latentsculpt</h1>
        <p className="tag">generative design × HCI × fabrication</p>
      </header>
      <section className="card">
        <h2>hello 👋</h2>
        <p>
          This site is powered by <strong>React + TypeScript</strong> and deployed via{' '}
          <strong>GitHub Pages</strong> at <strong>latentsculpt.com</strong>.
        </p>
        <p>
          Edit <code>src/App.tsx</code> to make it yours. Add assets under <code>public/</code>.
        </p>
      </section>
      <footer>
        <p>© {year} latentsculpt</p>
      </footer>
    </main>
  )
}

