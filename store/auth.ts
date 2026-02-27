import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email?: string | null
  promoter_id?: number | null
  full_name?: string | null
  phone?: string | null
  role: string
  photo_url?: string | null
  balance?: number
  debt_to_company?: number
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  rememberMe: boolean
  hydrated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      // Инициализация: проверяем токены в storage при создании store
      const initializeAuth = () => {
        if (typeof window !== 'undefined') {
          // Сначала проверяем localStorage (для rememberMe=true)
          let storageToken = localStorage.getItem('auth-token')
          let storageUser = localStorage.getItem('auth-user')
          let rememberMe = true
          
          // Если нет в localStorage, проверяем sessionStorage (для rememberMe=false)
          if (!storageToken) {
            storageToken = sessionStorage.getItem('auth-token')
            storageUser = sessionStorage.getItem('auth-user')
            rememberMe = false
          }
          
          if (storageToken && storageUser) {
            try {
              const user = JSON.parse(storageUser)
              return { user, token: storageToken, isAuthenticated: true, rememberMe }
            } catch (e) {
              console.error('Error parsing stored user:', e)
            }
          }
        }
        return null
      }

      const initialState = initializeAuth()

      return {
        user: initialState?.user || null,
        token: initialState?.token || null,
        isAuthenticated: initialState?.isAuthenticated || false,
        rememberMe: true,
        hydrated: typeof window === 'undefined' ? true : !!initialState,
        setAuth: (user, token) => {
          // Всегда запоминаем вход на устройстве (локальное хранение)
          set({ user, token, isAuthenticated: true, rememberMe: true })
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token)
            localStorage.setItem('auth-user', JSON.stringify(user))
            sessionStorage.removeItem('auth-token')
            sessionStorage.removeItem('auth-user')
          }
        },
        clearAuth: () => {
          set({ user: null, token: null, isAuthenticated: false, rememberMe: false })
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-token')
            localStorage.removeItem('auth-user')
            sessionStorage.removeItem('auth-token')
            sessionStorage.removeItem('auth-user')
          }
        },
        updateUser: (updates) => {
          set((state) => {
            const updatedUser = state.user ? { ...state.user, ...updates } : null
            // Обновляем сохраненного пользователя
            if (typeof window !== 'undefined' && updatedUser) {
              const rememberMe = state.rememberMe || false
              if (rememberMe) {
                localStorage.setItem('auth-user', JSON.stringify(updatedUser))
              } else {
                sessionStorage.setItem('auth-user', JSON.stringify(updatedUser))
              }
            }
            return { user: updatedUser }
          })
        },
      }
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        rememberMe: true,
        hydrated: state.hydrated,
      }),
      onRehydrateStorage: () => (state) => {
        // При восстановлении из persist storage, проверяем токены в localStorage/sessionStorage
        if (typeof window !== 'undefined' && state) {
          // Сначала проверяем localStorage (для rememberMe=true)
          let storageToken = localStorage.getItem('auth-token')
          let storageUser = localStorage.getItem('auth-user')
          let rememberMe = true
          
          // Если нет в localStorage, проверяем sessionStorage (для rememberMe=false)
          if (!storageToken) {
            storageToken = sessionStorage.getItem('auth-token')
            storageUser = sessionStorage.getItem('auth-user')
            rememberMe = false
          }
          
          if (storageToken && storageUser) {
            try {
              const user = JSON.parse(storageUser)
              state.user = user
              state.token = storageToken
              state.isAuthenticated = true
              state.rememberMe = rememberMe
            } catch (e) {
              console.error('Error parsing stored user:', e)
            }
          } else if (state && !state.token) {
            // Если токен не найден нигде - очищаем состояние
            state.user = null
            state.token = null
            state.isAuthenticated = false
            state.rememberMe = false
          }
          state.hydrated = true
        }
      },
    }
  )
)
