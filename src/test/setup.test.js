import { describe, it, expect } from 'vitest'

describe('test setup wiring', () => {
  it('runs in a jsdom environment with window/document available', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
    expect(typeof document.createElement).toBe('function')
  })

  it('provides a window.matchMedia polyfill that returns matches:false by default', () => {
    expect(typeof window.matchMedia).toBe('function')
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    expect(mql.matches).toBe(false)
    expect(typeof mql.addEventListener).toBe('function')
    expect(typeof mql.removeEventListener).toBe('function')
  })

  it('exposes @testing-library/jest-dom matchers on expect', () => {
    const el = document.createElement('div')
    el.textContent = 'hello'
    document.body.appendChild(el)
    expect(el).toBeInTheDocument()
    expect(el).toHaveTextContent('hello')
    document.body.removeChild(el)
  })
})
