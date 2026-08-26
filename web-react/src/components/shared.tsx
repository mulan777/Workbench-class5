import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@/stores/workspace'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmtDate, weekOf, todayStr } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  desc,
  action
}: {
  title: string
  desc?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 pt-1">
      <div className="min-w-0">
        {/* 页眉：宋体标题 + 朱砂笔触下划 */}
        <h1 className="relative inline-block text-[27px] font-semibold leading-tight tracking-wide">
          {title}
          <span aria-hidden className="ink-draw absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-primary/45 via-primary/25 to-transparent" />
        </h1>
        {desc && (
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{desc}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function WkBar() {
  const ws = useWorkspace()
  const [flipKey, setFlipKey] = useState(0)
  const dateRef = useRef(ws.date)
  useEffect(() => {
    if (dateRef.current !== ws.date) {
      dateRef.current = ws.date
      setFlipKey(k => k + 1)
    }
  }, [ws.date])
  function shift(days: number) {
    const d = new Date(ws.date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    ws.pickDate(d.toISOString().slice(0, 10))
  }
  return (
    <div className="card mb-6 flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3">
      <label className="relative flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" /> 日期
        {/* 显示层：中文格式（原生input透明覆盖，保证行为不变）*/}
        <span key={flipKey} className="date-flip pointer-events-none rounded-lg border border-input bg-card px-2.5 py-1.5 font-medium text-foreground">
          {new Date(ws.date + 'T00:00:00').getMonth() + 1}月{new Date(ws.date + 'T00:00:00').getDate()}日
        </span>
        <input
          type="date"
          value={ws.date}
          max={ws.date}
          onChange={e => e.target.value && ws.pickDate(e.target.value)}
          className="absolute inset-y-0 left-14 w-36 opacity-0 [color-scheme:light] dark:[color-scheme:dark]"
        />
      </label>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => shift(-1)}>
              <ChevronLeft />
            </Button>
          </TooltipTrigger>
          <TooltipContent>前一天</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="sm" className="h-9 px-3.5" onClick={() => ws.pickDate(todayStr())}>今天</Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => shift(1)}>
              <ChevronRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent>后一天</TooltipContent>
        </Tooltip>
      </div>
      {/* 日期章：朱砂圆章呈现当前日期 */}
      <span key={'s' + flipKey} className="date-flip stamp-seal font-hand shrink-0 flex-col !h-11 !w-11 leading-none" title={ws.date}>
        <span className="text-[10px] opacity-80">{new Date(ws.date + 'T00:00:00').getMonth() + 1}月</span>
        <span className="text-base font-bold">{new Date(ws.date + 'T00:00:00').getDate()}</span>
      </span>
      <span className="sticker bg-accent text-accent-foreground">第 {weekOf(ws.date)} 周</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action
}: {
  icon?: React.ReactNode
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 py-14 text-center">
      {/* 背景装饰：超大淡水印章 */}
      <span aria-hidden className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 select-none font-serif text-[88px] font-bold leading-none text-primary/[.045]">
        中5
      </span>
      {icon && (
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/50 text-muted-foreground shadow-sm [&_svg]:size-7">
          {icon}
        </div>
      )}
      <p className="relative font-serif text-[15px] font-semibold tracking-wide">{title}</p>
      {hint && <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** 骨架屏：页面数据加载中 */
export function SkeletonCards({ n = 5 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-4" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
          <div className="mt-3 h-7 w-14 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

/** 纸页落定入场 */
export function PageIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  useEffect(() => {}, [])
  return (
    <div style={{ animationDelay: `${delay}ms` }} className="animate-page">
      {children}
    </div>
  )
}

/** 兼容旧名 */
export const FadeIn = PageIn


/** 保存成功：朱砂印章盖下 */
export function StampDone({ text = '已记录' }: { text?: string }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1600)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center">
      <div className="animate-stamp stamp-seal !h-24 !w-24 flex-col bg-background/70 backdrop-blur-[1px]">
        <span className="font-hand text-xl font-bold leading-tight">{text.slice(0, 2)}</span>
        {text.length > 2 && <span className="font-hand text-sm font-bold leading-none">{text.slice(2)}</span>}
      </div>
    </div>
  )
}


/** 列表级联进场容器：子元素依次落定 */
export function Stagger({
  children,
  step = 45,
  className
}: {
  children: React.ReactNode[]
  step?: number
  className?: string
}) {
  return (
    <>
      {children.map((child, i) => (
        <div key={i} className={cn('animate-page', className)} style={{ animationDelay: `${i * step}ms` }}>
          {child}
        </div>
      ))}
    </>
  )
}
