import { createContext, useContext } from 'react'
import { api, todayStr, weekOf } from '@/lib/api'

type Student = { id: number; sid: string; name: string; avatar?: string | null; active: number }
type WsState = {
  students: Student[]
  className: string
  date: string
  week: number
  loadBase: () => Promise<void>
  pickDate: (d: string) => void
  sidName: (id: number) => string
}

export const WorkspaceCtx = createContext<WsState>(null as unknown as WsState)

let loaded = false

export function useWorkspace(): WsState {
  const ctx = useContext(WorkspaceCtx)
  if (ctx) return ctx
  throw new Error('WorkspaceProvider missing')
}

import { useState, useCallback, useMemo } from 'react'

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>([])
  const [className, setClassName] = useState('')
  const [date, setDate] = useState(todayStr())
  const [week, setWeek] = useState(weekOf())

  const loadBase = useCallback(async () => {
    if (loaded) return
    const [st, cfg] = await Promise.all([api('/api/students'), api('/api/settings') as any])
    setStudents((st as any[]).filter(s => s.active))
    setClassName(cfg.className || '中5班')
    loaded = true
  }, [])

  const value: WsState = useMemo(
    () => ({
      students,
      className,
      date,
      week,
      loadBase,
      pickDate: d => {
        setDate(d)
        setWeek(weekOf(d))
      },
      sidName: id => {
        const s = students.find(x => x.id === id)
        return s ? `${s.sid} ${s.name}` : String(id)
      }
    }),
    [students, className, date, week, loadBase]
  )

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
}
