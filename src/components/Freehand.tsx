import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFrame } from '@react-three/fiber'
import { Line, Text } from '@react-three/drei'
import { Vector3, Quaternion } from 'three'
import { useXR, useXRStore } from '@react-three/xr'

type Stroke = {
  id: number
  points: Vector3[]
  color: string
  width: number
}

// Utility: get the primary controller state from XR input sources
function usePrimaryController() {
  return useXR((xr: any) => xr.inputSourceStates.find((s: any) => s.type === 'controller' && s.isPrimary)) as any
}

export default function Freehand() {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [active, setActive] = useState<Stroke | null>(null)
  const [inXR, setInXR] = useState(false)
  const controller = usePrimaryController()
  const idRef = useRef(1)
  const tmp = useMemo(() => new Vector3(), [])
  const lastBPressed = useRef(false)
  const lastTriggerPressed = useRef(false)
  const reticleRef = useRef<any>(null)

  // reflect session presence for UI/env decisions
  const store = useXRStore()
  useEffect(() => {
    const unsub = store.subscribe((s: any) => setInXR(s.session != null))
    setInXR(store.getState().session != null)
    return unsub
  }, [store])

  // Per-frame drawing logic
  useFrame(() => {
    if (!inXR || !controller) return

    // Controller object world transform
    const obj = controller.object ?? controller
    if (!obj) return

    // Compute a pen-tip offset in front of controller (−Z is forward)
    obj.updateWorldMatrix(true, false)
    obj.getWorldPosition(tmp)
    const forward = new Vector3(0, 0, -1)
    forward.applyQuaternion(obj.getWorldQuaternion(new Quaternion()))
    const tip = tmp.clone().add(forward.multiplyScalar(0.06))

    // Move reticle
    if (reticleRef.current) {
      reticleRef.current.position.copy(tip)
    }

    // Gamepad states
    const gamepad = controller.gamepad as Record<string, { state: string } | undefined>
    const triggerPressed = gamepad?.['xr-standard-trigger']?.state === 'pressed'
    const bPressed = gamepad?.['b-button']?.state === 'pressed' || gamepad?.['y-button']?.state === 'pressed'

    // Handle undo via B button (edge)
    if (bPressed && !lastBPressed.current) {
      setStrokes((prev) => prev.slice(0, -1))
    }
    lastBPressed.current = !!bPressed

    // Start stroke on trigger down
    if (triggerPressed && !lastTriggerPressed.current) {
      const id = idRef.current++
      setActive({ id, points: [tip.clone()], color: '#6ee7ff', width: 3 })
    }

    // Continue stroke while holding
    if (triggerPressed && active) {
      const last = active.points[active.points.length - 1]
      if (last.distanceTo(tip) > 0.01) {
        // Append point with simple decimation threshold
        setActive((s) => (s ? { ...s, points: [...s.points, tip.clone()] } : s))
      }
    }

    // End stroke on trigger up
    if (!triggerPressed && lastTriggerPressed.current && active) {
      // finalize if has enough points
      setStrokes((prev) => (active.points.length > 1 ? [...prev, active] : prev))
      setActive(null)
    }

    lastTriggerPressed.current = !!triggerPressed
  })

  return (
    <group>
      {/* Reticle at pen tip */}
      <mesh ref={reticleRef} visible={inXR}>
        <sphereGeometry args={[0.007, 16, 16]} />
        <meshStandardMaterial color="#6ee7ff" emissive="#6ee7ff" emissiveIntensity={0.4} />
      </mesh>

      {/* Existing strokes */}
      {strokes.map((s) => (
        <Line key={s.id} points={s.points} color={s.color} linewidth={s.width} transparent opacity={0.95} />
      ))}

      {/* Active stroke preview */}
      {active && <Line points={active.points} color={active.color} linewidth={active.width} transparent opacity={0.85} />}

      {/* Instruction board near the user */}
      <group position={[0, 1.35, -0.8]}>
        <mesh>
          <planeGeometry args={[0.6, 0.2]} />
          <meshStandardMaterial color="#15171c" opacity={0.9} transparent />
        </mesh>
        <Text
          position={[0, 0, 0.005]}
          fontSize={0.06}
          color="#e8eef2"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.55}
        >
          Hold Trigger to draw • Press B to undo
        </Text>
      </group>

      {/* DOM overlay controls (visible in-headset when overlay is available) */}
      {inXR && (store.getState().domOverlayRoot as Element | undefined) &&
        createPortal(
          <div style={{ position: 'absolute', inset: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #232631', background: '#15171c', color: '#e8eef2' }}
              onClick={() => setStrokes((prev) => prev.slice(0, -1))}
            >
              Undo
            </button>
          </div>,
          store.getState().domOverlayRoot as Element
        )}
    </group>
  )
}
