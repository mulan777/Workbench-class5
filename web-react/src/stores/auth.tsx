import { createContext, useContext, useEffect, useState } from 'react'

export type User = { username: string; displayName: string; role?: string }

type AuthState = {
  user: User | null
  loaded: boolean
  fetchMe: () => Promise<void>
  login: (u: string, p: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthCtx = createContext<AuthState>(null as unknown as AuthState)

export function useAuth(): AuthState {
  return useContext(AuthCtx)
}

import { api } from '@/lib/api'
import { useMemo } from 'react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  async function fetchMe() {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'same-origin' })
      if (r.ok) setUser(await r.json())
      else setUser(null)
    } catch {}
    setLoaded(true)
  }

  const value = useMemo<AuthState>(
    () => ({
      user,
      loaded,
      fetchMe,
      login: async (username, password) => {
        const u = (await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        })) as User
        setUser(u)
        setLoaded(true)
        return u
      },
      logout: async () => {
        try { await api('/api/auth/logout', { method: 'POST' }) } catch {}
        setUser(null)
        location.href = '/login'
      }
    }),
    [user, loaded]
  )

  // 启动时拉取一次
  if (!loaded) fetchMe()

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
