import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Text } from '@react-three/drei'
import { Vector3, Quaternion, DoubleSide } from 'three'
import { useXR, useXRStore, XRSpace } from '@react-three/xr'

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
  const forwardRef = useMemo(() => new Vector3(), [])
  const quatRef = useMemo(() => new Quaternion(), [])
  const lastBPressed = useRef(false)
  const lastTriggerPressed = useRef(false)
  const reticleRef = useRef<any>(null)
  const lastSampleTime = useRef(0)
  const MAX_POINTS = 2000
  const MAX_STROKES = 200
  const MIN_DT_MS = 16
  const EPS = 0.02

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
    obj.getWorldQuaternion(quatRef)
    forwardRef.set(0, 0, -1).applyQuaternion(quatRef)
    const tip = tmp.clone().add(forwardRef.multiplyScalar(0.06))

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
      lastSampleTime.current = performance.now()
      setActive({ id, points: [tip.clone()], color: '#6ee7ff', width: 3 })
    }

    // Continue stroke while holding
    if (triggerPressed && active) {
      const now = performance.now()
      const dt = now - lastSampleTime.current
      const last = active.points[active.points.length - 1]
      if (dt >= MIN_DT_MS && last.distanceTo(tip) > EPS) {
        lastSampleTime.current = now
        setActive((s) => (s ? { ...s, points: s.points.length < MAX_POINTS ? [...s.points, tip.clone()] : s.points } as Stroke : s))
      }
      if (active.points.length >= MAX_POINTS) {
        // finalize early if too long
        setStrokes((prev) => [...prev.slice(Math.max(0, prev.length - (MAX_STROKES - 1))), active])
        setActive(null)
      }
    }

    // End stroke on trigger up
    if (!triggerPressed && lastTriggerPressed.current && active) {
      // finalize if has enough points
      setStrokes((prev) => (active.points.length > 1 ? [...prev.slice(Math.max(0, prev.length - (MAX_STROKES - 1))), active] : prev))
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

      {/* Instruction board: anchor to viewer when in XR so it's always visible */}
      {inXR ? (
        <XRSpace space="viewer">
          <group position={[0, 0, -0.8]}>
            <mesh>
              <planeGeometry args={[0.6, 0.2]} />
              <meshStandardMaterial color="#15171c" opacity={0.9} transparent side={DoubleSide} />
            </mesh>
            <Text
              position={[0, 0, 0.005]}
              fontSize={0.06}
              color="#e8eef2"
              anchorX="center"
              anchorY="middle"
              maxWidth={0.55}
            >
              Hold Trigger to draw • Press B/Y to undo
            </Text>
          </group>
        </XRSpace>
      ) : (
        <group position={[0, 1.35, -0.8]}>
          <mesh>
            <planeGeometry args={[0.6, 0.2]} />
            <meshStandardMaterial color="#15171c" opacity={0.9} transparent side={DoubleSide} />
          </mesh>
          <Text
            position={[0, 0, 0.005]}
            fontSize={0.06}
            color="#e8eef2"
            anchorX="center"
            anchorY="middle"
            maxWidth={0.55}
          >
            Hold Trigger to draw • Press B/Y to undo
          </Text>
        </group>
      )}
    </group>
  )
}
