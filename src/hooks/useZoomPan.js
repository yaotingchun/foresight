import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const MIN_SCALE = 0.35
const MAX_SCALE = 2.5

/**
 * Pointer-driven pan + wheel/button zoom over a fixed-size canvas.
 * Returns a viewport ref, the transform string, event handlers, and controls.
 * Transitions are disabled during active drag/wheel gestures so panning tracks
 * the cursor 1:1, then re-enabled for buttons — that's what makes it feel smooth.
 */
export function useZoomPan(canvas, { padding = 28 } = {}) {
  const viewportRef = useRef(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [animated, setAnimated] = useState(false)
  const drag = useRef(null)

  const fit = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    // Bail while the viewport is still mid-layout; a real re-fit follows once
    // the ResizeObserver reports a usable size.
    if (width < 60 || height < 60) return
    const scale = Math.min(
      (width - padding * 2) / canvas.width,
      (height - padding * 2) / canvas.height,
    )
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
    setTransform({
      scale: clamped,
      x: (width - canvas.width * clamped) / 2,
      y: (height - canvas.height * clamped) / 2,
    })
  }, [canvas.width, canvas.height, padding])

  // Fit on mount and whenever the viewport resizes. A couple of rAF retries
  // cover the case where the first paint reports a not-yet-laid-out size.
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined
    fit()
    const r1 = requestAnimationFrame(fit)
    const r2 = requestAnimationFrame(() => requestAnimationFrame(fit))
    const obs = new ResizeObserver(() => fit())
    obs.observe(el)
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      obs.disconnect()
    }
  }, [fit])

  const zoomBy = useCallback(
    (factor, origin) => {
      setAnimated(true)
      setTransform((t) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * factor))
        const el = viewportRef.current
        const rect = el?.getBoundingClientRect()
        const ox = origin ? origin.x - (rect?.left ?? 0) : (rect?.width ?? 0) / 2
        const oy = origin ? origin.y - (rect?.top ?? 0) : (rect?.height ?? 0) / 2
        const k = next / t.scale
        return { scale: next, x: ox - (ox - t.x) * k, y: oy - (oy - t.y) * k }
      })
    },
    [],
  )

  const onWheel = useCallback(
    (e) => {
      e.preventDefault()
      setAnimated(false)
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomBy(factor, { x: e.clientX, y: e.clientY })
    },
    [zoomBy],
  )

  // Non-passive wheel listener so preventDefault works.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const onPointerDown = useCallback(
    (e) => {
      if (e.target.closest('[data-node]') || e.target.closest('button')) return
      setAnimated(false)
      drag.current = { px: e.clientX, py: e.clientY }
      e.currentTarget.setPointerCapture?.(e.pointerId)
    },
    [],
  )

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.px
    const dy = e.clientY - drag.current.py
    drag.current = { px: e.clientX, py: e.clientY }
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current = null
  }, [])

  const zoomIn = useCallback(() => zoomBy(1.25), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(1 / 1.25), [zoomBy])
  const fitAnimated = useCallback(() => {
    setAnimated(true)
    fit()
  }, [fit])

  const controls = useMemo(
    () => ({ zoomIn, zoomOut, fit: fitAnimated }),
    [zoomIn, zoomOut, fitAnimated],
  )

  const handlers = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp],
  )

  return { viewportRef, transform, animated, handlers, controls }
}
