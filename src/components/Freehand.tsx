import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Line, Text } from '@react-three/drei'
import { Vector3, Quaternion, DoubleSide } from 'three'
import { useXR, useXRStore, XRSpace } from '@react-three/xr'

type Stroke = {
  id: number
  points: Vector3[]
  color: string
  width: number
}

// Utility: read the primary controller state if available (optional)
function usePrimaryController() {
  return useXR((xr: any) => {
    const list = xr.inputSourceStates.filter((s: any) => s.type === 'controller')
    return (
      list.find((s: any) => s.inputSource?.handedness === 'right') ||
      list.find((s: any) => s.inputSource?.handedness === 'left') ||
      list[0]
    )
  }) as any
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
  const { gl } = useThree()
  const lastBPressed = useRef(false)
  const lastTriggerPressed = useRef(false)
  const reticleRef = useRef<any>(null)
  const lastSampleTime = useRef(0)
  const MAX_POINTS = 2000
  const MAX_STROKES = 200
  const MIN_DT_MS = 16
  const EPS = 0.02
  // XR event-based fallbacks (works without controller profile downloads)
  const holdingRef = useRef(false)
  const lastSourceRef = useRef<XRInputSource | null>(null)

  // reflect session presence for UI/env decisions
  const store = useXRStore()
  useEffect(() => {
    const unsub = store.subscribe((s: any) => setInXR(s.session != null))
    setInXR(store.getState().session != null)
    return unsub
  }, [store])

  // Bind XRSession select/squeeze events to support drawing without controller profiles
  useEffect(() => {
    const session = store.getState().session as XRSession | undefined
    if (!session) return

    const onSelectStart = (e: XRInputSourceEvent) => {
      holdingRef.current = true
      lastSourceRef.current = e.inputSource
      // initialize a new stroke; tip position will be sampled on next frame
      const id = idRef.current++
      lastSampleTime.current = performance.now()
      // initialize with a single point which will be immediately updated
      setActive({ id, points: [], color: '#6ee7ff', width: 3 })
    }

    const onSelectEnd = () => {
      holdingRef.current = false
      // finalize if has enough points
      setActive((curr) => {
        if (!curr) return null
        setStrokes((prev) => (curr.points.length > 1 ? [...prev.slice(Math.max(0, prev.length - (MAX_STROKES - 1))), curr] : prev))
        return null
      })
    }

    const onSqueezeStart = () => {
      // fallback undo without relying on gamepad component mapping
      setStrokes((prev) => prev.slice(0, -1))
    }

    session.addEventListener('selectstart', onSelectStart)
    session.addEventListener('selectend', onSelectEnd)
    session.addEventListener('squeezestart', onSqueezeStart)
    return () => {
      session.removeEventListener('selectstart', onSelectStart)
      session.removeEventListener('selectend', onSelectEnd)
      session.removeEventListener('squeezestart', onSqueezeStart)
    }
  }, [store])

  // Per-frame drawing logic
  useFrame((state, _delta, frame) => {
    if (!inXR) return

    // Compute controller tip via XRFrame pose first (works without profiles)
    let tip: Vector3 | null = null
    const referenceSpace = (state.gl.xr.getReferenceSpace?.() as XRReferenceSpace | undefined) ?? undefined
    const source = lastSourceRef.current
    if (frame && referenceSpace && source) {
      const space = (source as any).gripSpace ?? source.targetRaySpace
      const pose = frame.getPose(space, referenceSpace)
      if (pose) {
        const { position, orientation } = pose.transform
        tmp.set(position.x, position.y, position.z)
        quatRef.set(orientation.x, orientation.y, orientation.z, orientation.w)
        forwardRef.set(0, 0, -1).applyQuaternion(quatRef)
        tip = tmp.clone().add(forwardRef.multiplyScalar(0.06))
      }
    }

    // Fallback to three.js WebXRManager controller objects (grip/controller)
    if (!tip) {
      let obj: any
      const handed = controller?.inputSource?.handedness
      for (let i = 0; i < 2; i++) {
        const grip = gl.xr.getControllerGrip(i)
        const ctrl = gl.xr.getController(i)
        const cand = grip || ctrl
        const candHand = (cand as any)?.userData?.handedness || handed
        if (handed == null || candHand === handed) {
          obj = cand
          break
        }
        if (obj == null) obj = cand
      }
      if (!obj) return
      obj.updateWorldMatrix(true, false)
      obj.getWorldPosition(tmp)
      obj.getWorldQuaternion(quatRef)
      forwardRef.set(0, 0, -1).applyQuaternion(quatRef)
      tip = tmp.clone().add(forwardRef.multiplyScalar(0.06))
    }

    // Move reticle
    if (reticleRef.current && tip) {
      reticleRef.current.position.copy(tip)
    }

    // Optional: retain gamepad-based inputs when profiles are available
    const gamepad = controller?.gamepad as Record<string, { state: string } | undefined> | undefined
    const triggerPressed = gamepad?.['xr-standard-trigger']?.state === 'pressed'
    const bPressed = gamepad?.['b-button']?.state === 'pressed' || gamepad?.['y-button']?.state === 'pressed'

    if (bPressed && !lastBPressed.current) {
      setStrokes((prev) => prev.slice(0, -1))
    }
    lastBPressed.current = !!bPressed

    // Edge-detect trigger -> also update holdingRef when profiles exist
    if (triggerPressed && !lastTriggerPressed.current) {
      holdingRef.current = true
      const id = idRef.current++
      lastSampleTime.current = performance.now()
      setActive({ id, points: [], color: '#6ee7ff', width: 3 })
    }
    if (!triggerPressed && lastTriggerPressed.current) {
      holdingRef.current = false
    }
    lastTriggerPressed.current = !!triggerPressed

    // Continue stroke while holding (from either events or gamepad)
    if (holdingRef.current && active && tip) {
      const now = performance.now()
      const dt = now - lastSampleTime.current
      const last = active.points[active.points.length - 1]
      if (last == null || (dt >= MIN_DT_MS && last.distanceTo(tip) > EPS)) {
        lastSampleTime.current = now
        setActive((s) => (s ? { ...s, points: s.points.length < MAX_POINTS ? [...s.points, tip!.clone()] : s.points } as Stroke : s))
      }
      if (active.points.length >= MAX_POINTS) {
        setStrokes((prev) => [...prev.slice(Math.max(0, prev.length - (MAX_STROKES - 1))), active])
        setActive(null)
        holdingRef.current = false
      }
    }
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
              Hold Trigger to draw • Press B/Y or Grip to undo
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
            Hold Trigger to draw • Press B/Y or Grip to undo
          </Text>
        </group>
      )}
    </group>
  )
}
