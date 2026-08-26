import { useMemo, useState } from 'react'
import { useWorkspace } from '@/stores/workspace'
import { Handshake, TriangleAlert, X, Users } from 'lucide-react'

/**
 * 结伴幼儿点选器：按点击顺序两两自动配对
 * picked: 已选 id 序列；onToggle 切换选中
 */
export function PairPicker({
  picked,
  onToggle
}: {
  picked: number[]
  onToggle: (id: number) => void
}) {
  const ws = useWorkspace()
  const pairs = useMemo(() => {
    const out: number[][] = []
    for (let i = 0; i + 1 < picked.length; i += 2) out.push([picked[i], picked[i + 1]])
    return out
  }, [picked])
  const leftover = picked.length % 2 === 1 ? picked[picked.length - 1] : null

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {ws.students.map(s => {
          const idx = picked.indexOf(s.id)
          const active = idx >= 0
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={`relative inline-flex items-center gap-1 rounded-full border px-3 py-2 text-[13px] transition-all active:scale-95 ${
                active
                  ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/30 animate-[pair-pop_.28s_cubic-bezier(.34,1.56,.64,1)]'
                  : 'border-input bg-card text-muted-foreground hover:border-ring/50 hover:text-foreground hover:-translate-y-0.5 hover:shadow-sm'
              }`}
            >
              {s.sid} {s.name}
              {active && (
                <span className="ml-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
                  {idx + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 实时预览配对 */}
      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="size-3.5" /> 实时配对（{pairs.length} 对）
        </p>
        {picked.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">按结伴顺序点选上方幼儿，每两人为一对</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {pairs.map((p, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-[13px] font-medium text-accent-foreground shadow-sm ${i % 2 ? 'animate-[pair-join-r_.3s_cubic-bezier(.22,1,.36,1)_both]' : 'animate-[pair-join-l_.3s_cubic-bezier(.22,1,.36,1)_both]'}`}
              >
                <Handshake className="size-3.5" />
                {ws.sidName(p[0])} · {ws.sidName(p[1])}
              </span>
            ))}
            {leftover != null && (
              <span className="inline-flex animate-in fade-in zoom-in-95 items-center gap-1.5 rounded-lg border border-orange-300/60 bg-orange-50 px-2.5 py-1 text-[13px] text-orange-600 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                <TriangleAlert className="size-3.5" /> 落单：{ws.sidName(leftover)}（再选一位组成一对）
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** 已选幼儿的胶囊（带移除按钮） */
export function PickedChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[13px] text-accent-foreground">
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100">
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}
