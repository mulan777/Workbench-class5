import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} })

function initTheme(): Theme {
  try {
    const t = localStorage.getItem('zt-theme')
    if (t === 'dark' || t === 'light') return t
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initTheme)
  useEffect(() => {
    const root = document.documentElement
    // 切换瞬间加过渡类，350ms 后移除（避免常驻 transition 拖慢一切）
    root.classList.add('theme-switching')
    root.classList.toggle('dark', theme === 'dark')
    const t = setTimeout(() => root.classList.remove('theme-switching'), 380)
    try { localStorage.setItem('zt-theme', theme) } catch {}
    return () => clearTimeout(t)
  }, [theme])
  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
