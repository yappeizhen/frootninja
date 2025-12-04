import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const USERNAME_STORAGE_KEY = 'frootninja_username'

interface UserStore {
  username: string
  setUsername: (name: string) => void
  clearUsername: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      username: '',
      setUsername: (name: string) => set({ username: name.trim().slice(0, 20) }),
      clearUsername: () => set({ username: '' }),
    }),
    {
      name: USERNAME_STORAGE_KEY,
    }
  )
)

