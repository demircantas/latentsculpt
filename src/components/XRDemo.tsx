import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import { OrbitControls } from '@react-three/drei'

type Support = { ar: boolean; vr: boolean }

export default function XRDemo() {
  const [support, setSupport] = useState<Support>({ ar: false, vr: false })
  const [rendererReady, setRendererReady] = useState(false)
  const [inXR, setInXR] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const store = useMemo(
    () =>
      createXRStore({
        offerSession: false,
        // Keep features optional; let the runtime pick what's available
        domOverlay: true,
      }),
    []
  )

  useEffect(() => {
    let mounted = true
    async function check() {
      const xr: any = (navigator as any).xr
      if (!xr || !xr.isSessionSupported) return
      try {
        const [ar, vr] = await Promise.all([
          xr.isSessionSupported('immersive-ar').catch(() => false),
          xr.isSessionSupported('immersive-vr').catch(() => false),
        ])
        if (mounted) setSupport({ ar: !!ar, vr: !!vr })
      } catch {
        // ignore
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [])

  // reflect session state for UI
  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setInXR(state.session != null)
    })
    return unsub
  }, [store])

  return (
    <section className="card">
      <h2>Try the XR demo</h2>
      <p>Open in the Meta Quest Browser and tap a button below.</p>
      <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        {support.ar && (
          <button
            disabled={!rendererReady}
            onClick={() => store.enterAR().then(() => setErr(null)).catch((e: any) => setErr(String(e?.message ?? e)))}
          >
            {rendererReady ? 'Enter AR' : 'Initializing…'}
          </button>
        )}
        {support.vr && (
          <button
            disabled={!rendererReady}
            onClick={() => store.enterVR().then(() => setErr(null)).catch((e: any) => setErr(String(e?.message ?? e)))}
          >
            {rendererReady ? 'Enter VR' : 'Initializing…'}
          </button>
        )}
        {inXR && (
          <button onClick={() => store.getState().session?.end()}>Exit</button>
        )}
        {!support.ar && !support.vr && <button disabled>XR not supported</button>}
      </div>
      {err && <p style={{ color: '#ff7a7a' }}>XR error: {err}</p>}

      <Canvas
        style={{ height: 420 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          // Ensure the WebXRManager is enabled before attempting to enter a session
          gl.xr.enabled = true
          setRendererReady(true)
        }}
      >
        <XR store={store}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 2, 1]} intensity={0.8} />

          <mesh position={[0, 1.2, -1]}>
            <boxGeometry args={[0.25, 0.25, 0.25]} />
            <meshStandardMaterial color="#6ee7ff" />
          </mesh>
        </XR>
        <OrbitControls enablePan={false} />
      </Canvas>
    </section>
  )
}
