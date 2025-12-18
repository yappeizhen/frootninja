import { create } from 'zustand'

export type InputMode = 'camera' | 'fallback'

interface InputModeState {
  /** Current active input mode */
  inputMode: InputMode
  /** Whether the user explicitly chose fallback mode */
  userChoseFallback: boolean
  /** Set the input mode */
  setInputMode: (mode: InputMode) => void
  /** User explicitly opts for fallback (mouse/touch) mode */
  enableFallbackMode: () => void
  /** User wants to try camera mode again */
  enableCameraMode: () => void
  /** Reset to default state */
  reset: () => void
}

export const useInputModeStore = create<InputModeState>()((set) => ({
  inputMode: 'camera',
  userChoseFallback: false,
  
  setInputMode: (mode) => set({ inputMode: mode }),
  
  enableFallbackMode: () => set({ 
    inputMode: 'fallback', 
    userChoseFallback: true 
  }),
  
  enableCameraMode: () => set({ 
    inputMode: 'camera', 
    userChoseFallback: false 
  }),
  
  reset: () => set({ 
    inputMode: 'camera', 
    userChoseFallback: false 
  }),
}))

