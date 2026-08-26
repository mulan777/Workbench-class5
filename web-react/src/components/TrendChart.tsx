import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, ComposedChart, Area, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip
} from 'recharts'

/**
 * grok2api 风格图表容器：
 * - 颜色走 CSS 变量（--color-<key>），自动适配深浅色主题
 * - 标志性元素：渐变填充面积、半透明圆角柱、虚线线条、
 *   彩色圆点自定义 Tooltip、可点击隐藏系列的图例胶囊
 */

export type ChartSeries = {
  key: string
  label: string
  /** oklch/hsl 均可，需与 CSS 变量值一致 */
  color: string
  type: 'bar' | 'area' | 'line'
}

type ChartProps = {
  data: Record<string, any>[]
  xKey: string
  series: ChartSeries[]
  height?: number
  /** 柱状图 Y 轴强制整数（如次数） */
  intY?: boolean
  className?: string
}

// 系统调色板（与 grok2api dashboard 同款观感：蓝/绿/紫）
const PALETTE = ['oklch(0.68 0.15 245)', 'oklch(0.7 0.11 160)', 'oklch(0.66 0.16 300)', 'oklch(0.75 0.13 70)']

export function TrendChart({ data, xKey, series, height = 280, intY = false, className }: ChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const config = useMemo(() => {
    const out: Record<string, { label: string; color: string }> = {}
    series.forEach((s, i) => {
      out[s.key] = { label: s.label, color: s.color || PALETTE[i % PALETTE.length] }
    })
    return out
  }, [series])

  function toggle(key: string) {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else {
        // 至少保留一个可见系列
        if (next.size >= series.length - 1) return prev
        next.add(key)
      }
      return next
    })
  }

  const hasVisible = series.some(s => !hidden.has(s.key))

  return (
    <div className={cn('w-full', className)}>
      {/* 注入 --color-* CSS 变量，recharts fill/stroke 直接引用 */}
      <div
        style={Object.fromEntries(
          Object.entries(config).map(([k, v]) => [`--color-${k}`, v.color])
        ) as React.CSSProperties}
      >
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 4, bottom: 0, left: -18 }}>
              <defs>
                {series.filter(s => s.type === 'area').map(s => (
                  <linearGradient key={s.key} id={`zc-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-border" />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={14}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={44}
                allowDecimals={!intY}
                domain={[0, 'auto']}
                tick={{ fontSize: 12 }}
              />
              <RTooltip cursor={false} content={<ChartTip config={config} />} />
              {series.map(s => {
                if (hidden.has(s.key)) return null
                const common = {
                  key: s.key,
                  dataKey: s.key,
                  name: s.label,
                  animationDuration: 700,
                  animationEasing: 'ease-out' as const
                }
                if (s.type === 'bar') {
                  return (
                    <Bar {...common} fill={`var(--color-${s.key})`} fillOpacity={0.78} maxBarSize={36} radius={[6, 6, 0, 0]} className="transition-opacity hover:opacity-100 cursor-pointer" />
                  )
                }
                if (s.type === 'line') {
                  return (
                    <Line
                      {...common}
                      type="monotone"
                      stroke={`var(--color-${s.key})`}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 2 }}
                    />
                  )
                }
                return (
                  <Area
                    {...common}
                    type="monotone"
                    stroke={`var(--color-${s.key})`}
                    strokeWidth={1.5}
                    fill={`url(#zc-fill-${s.key})`}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 2 }}
                  />
                )
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 图例胶囊：点击可隐藏/显示对应系列 */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3 text-xs text-muted-foreground">
          {!hasVisible && <span className="opacity-60">（所有系列已隐藏，点击图例恢复）</span>}
          {series.map(s => {
            const off = hidden.has(s.key)
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(s.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1 transition-[background-color,color,opacity] hover:bg-accent hover:opacity-100',
                  off && 'opacity-35'
                )}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-${s.key})` }} />
                <span>{config[s.key].label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ChartTip({ active, payload, label, config }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-40 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover px-3 py-2.5 text-xs shadow-lg">
      {label != null && label !== '' && (
        <div className="mb-1.5 font-medium text-foreground">{label}</div>
      )}
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex w-full items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: p.color || p.stroke || `var(--color-${p.dataKey})` }}
              />
              <span className="truncate">{config[p.dataKey]?.label ?? p.name}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
