import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CustomCursor from './CustomCursor'

function createAnimationEnvironment({ reducedMotion = false, coarsePointer = false } = {}) {
  const frames = new Map()
  const motionListeners = new Set()
  let now = 0
  let nextFrameId = 0
  const motionPreference = {
    matches: reducedMotion,
    addEventListener: vi.fn((event, listener) => motionListeners.add(listener)),
    removeEventListener: vi.fn((event, listener) => motionListeners.delete(listener)),
  }

  vi.stubGlobal('matchMedia', vi.fn((query) => (
    query === '(pointer: coarse)' ? { matches: coarsePointer } : motionPreference
  )))
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
    const id = ++nextFrameId
    frames.set(id, callback)
    return id
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => frames.delete(id)))

  return {
    frames,
    motionPreference,
    advanceFrame(delta = 1000 / 60) {
      now += delta
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach((callback) => callback(now))
    },
    setReducedMotion(matches) {
      motionPreference.matches = matches
      motionListeners.forEach((listener) => listener({ matches }))
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('CustomCursor animation lifecycle', () => {
  it('renders only while following pointer movement and settles exactly at the pointer', () => {
    const animation = createAnimationEnvironment()
    const view = render(<CustomCursor />)
    const ring = view.container.querySelector('.cursor-ring')

    expect(animation.frames.size).toBe(0)
    fireEvent.mouseMove(window, { clientX: 100, clientY: 50 })
    fireEvent.mouseMove(window, { clientX: 120, clientY: 60 })
    expect(animation.frames.size).toBe(1)

    for (let frame = 0; frame < 90; frame += 1) animation.advanceFrame()
    expect(ring.style.transform).toBe('translate(120px, 60px)')
    expect(animation.frames.size).toBe(0)

    fireEvent.mouseMove(window, { clientX: 120, clientY: 60 })
    expect(animation.frames.size).toBe(0)
    fireEvent.mouseMove(window, { clientX: 150, clientY: 70 })
    expect(animation.frames.size).toBe(1)
    view.unmount()
  })

  it('cancels the current frame and removes listeners on unmount', () => {
    const animation = createAnimationEnvironment()
    const view = render(<CustomCursor />)
    fireEvent.mouseMove(window, { clientX: 100, clientY: 50 })
    animation.advanceFrame()
    animation.advanceFrame()
    const pendingId = [...animation.frames.keys()][0]

    view.unmount()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(pendingId)
    expect(animation.frames.size).toBe(0)
    expect(animation.motionPreference.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 })
    animation.setReducedMotion(true)
    expect(animation.frames.size).toBe(0)
  })

  it('keeps the same follow speed at 60Hz and 120Hz', () => {
    const sampleAtRefreshRate = (refreshRate) => {
      const animation = createAnimationEnvironment()
      const view = render(<CustomCursor />)
      fireEvent.mouseMove(window, { clientX: 100, clientY: 0 })
      for (let frame = 0; frame < refreshRate / 10; frame += 1) {
        animation.advanceFrame(1000 / refreshRate)
      }
      const transform = view.container.querySelector('.cursor-ring').style.transform
      const x = Number(transform.match(/translate\(([^p]+)px/)[1])
      view.unmount()
      return x
    }

    expect(sampleAtRefreshRate(120)).toBeCloseTo(sampleAtRefreshRate(60), 8)
  })

  it('follows immediately with reduced motion and updates when the preference changes', () => {
    const animation = createAnimationEnvironment({ reducedMotion: true })
    const view = render(<CustomCursor />)
    const ring = view.container.querySelector('.cursor-ring')
    fireEvent.mouseMove(window, { clientX: 100, clientY: 50 })
    expect(ring.style.transform).toBe('translate(100px, 50px)')
    expect(animation.frames.size).toBe(0)

    animation.setReducedMotion(false)
    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 })
    animation.advanceFrame()
    expect(animation.frames.size).toBe(1)
    animation.setReducedMotion(true)
    expect(ring.style.transform).toBe('translate(200px, 100px)')
    expect(animation.frames.size).toBe(0)
    view.unmount()
  })

  it('does not schedule cursor motion for coarse pointers', () => {
    const animation = createAnimationEnvironment({ coarsePointer: true })
    const view = render(<CustomCursor />)
    fireEvent.mouseMove(window, { clientX: 100, clientY: 50 })
    expect(animation.frames.size).toBe(0)
    expect(animation.motionPreference.addEventListener).not.toHaveBeenCalled()
    view.unmount()
  })
})
