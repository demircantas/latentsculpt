import React from 'react'

type Props = {
  fallback?: React.ReactNode
  children: React.ReactNode
}

type State = { hasError: boolean; error?: unknown }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 16, border: '1px solid #232631', borderRadius: 8, background: '#15171c' }}>
          <p>Something went wrong while rendering the 3D scene.</p>
          <p style={{ opacity: 0.7 }}>Try reloading the page or exiting XR.</p>
        </div>
      )
    }
    return this.props.children
  }
}

