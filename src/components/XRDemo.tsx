import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import { OrbitControls } from '@react-three/drei'

type Support = { ar: boolean; vr: boolean }

export default function XRDemo() {
  const [support, setSupport] = useState<Support>({ ar: false, vr: false })
  const store = useMemo(
    () =>
      createXRStore({
        offerSession: false,
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers', 'dom-overlay'],
        domOverlay: { root: document.body },
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

  return (
    <section className="card">
      <h2>Try the XR demo</h2>
      <p>Open in the Meta Quest Browser and tap a button below.</p>
      <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        {support.ar && (
          <button onClick={() => store.enterAR().catch(console.error)}>Enter AR</button>
        )}
        {support.vr && (
          <button onClick={() => store.enterVR().catch(console.error)}>Enter VR</button>
        )}
        {!support.ar && !support.vr && <button disabled>XR not supported</button>}
      </div>

      <Canvas style={{ height: 420 }} gl={{ antialias: true }}>
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
