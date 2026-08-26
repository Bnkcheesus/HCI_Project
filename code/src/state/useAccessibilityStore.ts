import { create } from 'zustand'

// Kiosk accessibility mode toggle — backs Product-Service 5 / Pain Reliever 5 / Gain Creator 6
// (chế độ trợ năng: chữ lớn, tương phản cao, phản hồi âm thanh). Persists to the `data-a11y`
// attribute on <html>, which src/styles/tokens.css keys off of.

interface AccessibilityState {
  enabled: boolean
  toggle: () => void
  setEnabled: (enabled: boolean) => void
}

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  enabled: false,
  toggle: () => {
    const next = !get().enabled
    document.documentElement.setAttribute('data-a11y', String(next))
    set({ enabled: next })
  },
  setEnabled: (enabled) => {
    document.documentElement.setAttribute('data-a11y', String(enabled))
    set({ enabled })
  },
}))
