import { create } from 'zustand'

/**
 * On-screen keyboard placement. On a 1280px kiosk the full-width keyboard forces a
 * two-handed reach across the whole panel; docking it to one side shrinks every key so
 * a single hand can cover the layout. Kept in a store rather than component state so the
 * choice survives navigating to results and back within one session.
 */

export type KeyboardLayout = 'full' | 'left' | 'right'

interface KeyboardState {
  layout: KeyboardLayout
  setLayout: (layout: KeyboardLayout) => void
}

export const useKeyboardStore = create<KeyboardState>((set) => ({
  layout: 'full',
  setLayout: (layout) => set({ layout }),
}))
