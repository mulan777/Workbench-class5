import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { useWorkspace } from '@/stores/workspace'
import {
  LayoutGrid, ClipboardCheck, Users,
  LogOut, Menu, X, Moon, Sun, UserCog, ArrowRight
} from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: '总览', icon: LayoutGrid },
  { to: '/checkin', label: '签到台', icon: ClipboardCheck },
  { to: '/area', label: '区域记录', icon: Users },
  { to: '/theme2', label: '好朋友新故事', icon: Users },
  { to: '/users', label: '用户管理', icon: UserCog }
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const ws = useWorkspace()
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const location = useLocation()

  // 路由变化时收起移动端菜单 + 回到顶部
  useEffect(() => {
    setMenuOpen(false)
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [location.pathname])

  // 登录后拉取班级基础数据
  useEffect(() => {
    ws.loadBase().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initials = (auth.user?.displayName || '').slice(0, 1)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面侧栏：日志本封脊，纯粹克制 */}
      <aside
        data-nav-version="20260903-clean-hot-nav"
        className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-3 py-4 md:flex"
        style={{
          boxShadow:
            'inset -8px 0 14px -10px hsl(var(--shadow-warm)/.22), 4px 0 0 -1px hsl(var(--background)), 5px 0 0 hsl(var(--grid-line)/.9)'
        }}
      >
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-hand text-sm font-bold text-primary-foreground shadow-sm">
            中5
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight">{ws.className}</div>
            <div className="text-xs text-muted-foreground">倾听工作台</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:translate-x-0.5 active:scale-[0.98]',
                  isActive
                    ? 'bg-secondary font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <n.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary' : 'opacity-75')} strokeWidth={1.9} />
                  <span className="min-w-0 flex-1 truncate">{n.label}</span>
                  {isActive && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary/70" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stamp font-hand text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1 truncate text-sm">{auth.user?.displayName}</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle}>
                  {theme === 'dark' ? <Sun /> : <Moon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === 'dark' ? '切浅色' : '切深色'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" title="退出" onClick={() => auth.logout()}>
                  <LogOut />
                </Button>
              </TooltipTrigger>
              <TooltipContent>退出登录</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* 移动抽屉 */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}
      {menuOpen && (
        <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card p-4 shadow-xl md:hidden">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-hand text-xs font-bold text-primary-foreground">
                中5
              </div>
              <span className="font-bold">{ws.className}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMenuOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                    isActive ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted'
                  )
                }
              >
                <n.icon className="h-4 w-4" />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{auth.user?.displayName}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => auth.logout()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主工作区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-serif font-bold">{ws.className}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
