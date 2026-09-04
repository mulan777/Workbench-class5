import { useEffect, useMemo, useState } from 'react'
import { api, weekOf } from '@/lib/api'
import { toast } from '@/lib/ui'
import {
  ArrowLeft, Check, Handshake, Maximize, Minimize, RefreshCw,
  Sparkles, UserRound, Users, X
} from 'lucide-react'

type Area = { id: number; name: string; emoji: string; sort: number }
type Student = { id: number; sid: string; name: string; avatar: string | null }
type SelectionRecord = {
  id: number; area: string; student_id: number; student_name: string
  student_avatar: string | null; sid: string
}
type Invitation = {
  id: number; date: string; week: number; area: string; status: string
  inviter_student_id: number; invitee_student_id: number
  inviter_name: string; inviter_avatar: string | null
}
type Phase = 'self' | 'invitation' | 'friend' | 'area' | 'done'

const FALLBACK_EMOJI: Record<string, string> = {
  美发店: '💈', 美工区: '🎨', 益智区: '🧩', 语言区: '📚',
  建构区: '🧱', 生活区: '🏠', 科学区: '🔬', 阅读区: '📖',
  角色区: '🎭', 娃娃家: '👶', 运动区: '⚽', 木工坊: '🪵'
}
const CANDIES = ['pink', 'blue', 'green', 'yellow', 'purple'] as const

function candyStyle(id: number, selected = false) {
  const c = CANDIES[id % CANDIES.length]
  return {
    background: selected ? `hsl(var(--candy-${c}))` : `hsl(var(--candy-${c}) / 0.16)`,
    color: selected ? '#fff' : `hsl(var(--candy-${c}))`,
    borderColor: `hsl(var(--candy-${c}) / 0.48)`
  }
}

function Avatar({ kid, selected = false, done = false, large = false }: {
  kid: Student; selected?: boolean; done?: boolean; large?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${large ? 'size-24 sm:size-28' : 'size-16 sm:size-20 md:size-24'} relative flex items-center justify-center overflow-hidden rounded-3xl border-2 text-2xl font-bold shadow-sm transition-all`}
        style={candyStyle(kid.id, selected)}
      >
        {kid.sid.replace(/^0+/, '') || kid.sid || '?'}
        {done && <span className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="size-4" /></span>}
      </div>
      <span className="max-w-24 truncate text-center text-sm font-bold text-[#3c2f21] sm:text-base">{kid.name}</span>
    </div>
  )
}

export default function ChildSelect() {
  const [date, setDate] = useState('')
  const [areas, setAreas] = useState<Area[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [records, setRecords] = useState<SelectionRecord[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [phase, setPhase] = useState<Phase>('self')
  const [selfId, setSelfId] = useState<number | null>(null)
  const [friendIds, setFriendIds] = useState<number[]>([])
  const [activeInvitations, setActiveInvitations] = useState<Invitation[]>([])
  const [doneArea, setDoneArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  async function loadData() {
    try {
      const res: any = await api('/api/area-selection/today')
      setDate(res.date || '')
      setAreas(res.areas || [])
      setStudents(res.students || [])
      setRecords(res.records || [])
      setInvitations(res.invitations || [])
    } catch {
      toast.error('加载失败')
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 4000)
    return () => clearInterval(timer)
  }, [])

  const selectedIds = useMemo(() => new Set(records.map(r => r.student_id)), [records])
  const self = students.find(s => s.id === selfId) || null
  const friends = students.filter(s => friendIds.includes(s.id))

  function reset() {
    setPhase('self'); setSelfId(null); setFriendIds([])
    setActiveInvitations([]); setDoneArea(null); setBusy(false)
    loadData()
  }

  function chooseSelf(kid: Student) {
    const pending = invitations.filter(i => i.invitee_student_id === kid.id)
    setSelfId(kid.id)
    setFriendIds([])
    if (pending.length) {
      setActiveInvitations(pending)
      setPhase('invitation')
    } else {
      setPhase('friend')
    }
  }

  async function rejectInvitation(id: number) {
    if (busy) return
    setBusy(true)
    try {
      await api(`/api/area-selection/invitations/${id}/reject`, { method: 'POST' })
      const rest = activeInvitations.filter(i => i.id !== id)
      setActiveInvitations(rest)
      setInvitations(v => v.filter(i => i.id !== id))
      if (!rest.length) setPhase('friend')
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function acceptInvitation(invitation: Invitation) {
    if (busy) return
    const area = areas.find(a => a.name === invitation.area)
    if (!area) return
    setBusy(true)
    try {
      await api(`/api/area-selection/invitations/${invitation.id}/accept`, { method: 'POST' })
      setDoneArea(area); setPhase('done'); playBeep()
      setTimeout(reset, 1800)
    } catch (e: any) { toast.error(e.message); setBusy(false) }
  }

  async function chooseArea(area: Area) {
    if (!self || busy) return
    setBusy(true)
    try {
      if (friends.length) {
        await api('/api/area-selection/invitations', {
          method: 'POST', body: JSON.stringify({ inviterStudentId: self.id, inviteeStudentIds: friends.map(k => k.id), area: area.name, week: weekOf(date) })
        })
      } else {
        await api('/api/area-selection/select', {
          method: 'POST', body: JSON.stringify({ studentId: self.id, area: area.name, week: weekOf(date) })
        })
      }
      setDoneArea(area); setPhase('done'); playBeep()
      setTimeout(reset, 1800)
    } catch (e: any) { toast.error(e.message); setBusy(false) }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.frequency.setValueAtTime(587, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + .18)
      gain.gain.setValueAtTime(.16, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.01, ctx.currentTime + .28)
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .3)
    } catch {}
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
  }

  const iconButton = 'flex size-16 sm:size-20 items-center justify-center rounded-full border-4 text-white shadow-xl transition active:scale-90 disabled:opacity-50'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#faf6ee] p-3 text-[#2d2926] sm:p-5 md:p-6">
      <header className="flex items-center justify-between border-b-2 border-[#e6decb] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#c2410c] font-serif text-xl font-bold text-white shadow-md">中5</div>
          <div>
            <h1 className="flex items-center gap-2 font-serif text-xl font-bold sm:text-2xl">自主选区台 <Sparkles className="size-5 text-[#ea580c]" /></h1>
            <div className="mt-1 flex items-center gap-1.5 text-[#9a8065]">
              {phase === 'self' && <><UserRound className="size-4" /><span className="h-1 w-8 rounded bg-[#ea580c]" /></>}
              {phase === 'friend' && <><Handshake className="size-4" /><span className="h-1 w-8 rounded bg-[#ea580c]" /></>}
              {phase === 'area' && <><span className="text-lg">🧩</span><span className="h-1 w-8 rounded bg-[#ea580c]" /></>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex size-10 items-center justify-center rounded-xl border bg-white" title="刷新"><RefreshCw className="size-4" /></button>
          <button onClick={toggleFullscreen} className="flex size-10 items-center justify-center rounded-xl border bg-white" title="全屏">{isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}</button>
        </div>
      </header>

      {phase === 'self' && (
        <main className="mx-auto grid max-w-6xl grid-cols-5 gap-x-1 gap-y-3 py-7 sm:grid-cols-6 sm:gap-x-2 sm:gap-y-4 md:grid-cols-7 lg:grid-cols-8">
          {students.map(kid => (
            <button key={kid.id} onClick={() => chooseSelf(kid)} className="rounded-3xl p-2 transition hover:bg-white hover:shadow-md active:scale-95" aria-label={kid.name}>
              <Avatar kid={kid} done={selectedIds.has(kid.id)} />
            </button>
          ))}
        </main>
      )}

      {phase === 'invitation' && activeInvitations.length > 0 && self && (
        <main className="mx-auto flex min-h-[calc(100vh-110px)] max-w-6xl flex-col items-center justify-center gap-6 py-8">
          <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeInvitations.map(invitation => (
              <div key={invitation.id} className="flex flex-col items-center gap-5 rounded-3xl border-4 border-[#f0c88d] bg-[#fff7e8] p-5 shadow-lg">
                <div className="flex items-center justify-center gap-4">
                  <Avatar kid={{ id: invitation.inviter_student_id, sid: '', name: invitation.inviter_name, avatar: invitation.inviter_avatar }} large />
                  <Handshake className="size-9 text-[#ea580c]" />
                  <div className="flex min-h-28 min-w-28 flex-col items-center justify-center rounded-3xl border-2 border-[#f0c88d] bg-white p-3">
                    <span className="text-5xl">{areas.find(a => a.name === invitation.area)?.emoji || FALLBACK_EMOJI[invitation.area] || '🧸'}</span>
                    <span className="mt-1 font-serif font-bold">{invitation.area}</span>
                  </div>
                </div>
                <div className="flex gap-8">
                  <button disabled={busy} onClick={() => acceptInvitation(invitation)} className={`${iconButton} border-emerald-200 bg-emerald-500`} aria-label={`接受${invitation.id}`} title="接受"><Check className="size-9" strokeWidth={3.5} /></button>
                  <button disabled={busy} onClick={() => rejectInvitation(invitation.id)} className={`${iconButton} border-rose-200 bg-rose-500`} aria-label={`拒绝${invitation.id}`} title="拒绝"><X className="size-9" strokeWidth={3.5} /></button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {phase === 'friend' && self && (
        <main className="mx-auto flex max-w-5xl flex-col py-5">
          <button onClick={() => { setFriendIds([]); setPhase('self') }} className="mb-3 flex size-12 items-center justify-center self-start rounded-full border bg-white" aria-label="返回头像" title="返回"><ArrowLeft className="size-6" /></button>
          <div className="mb-5 flex items-center justify-center gap-4">
            <Avatar kid={self} selected large />
            {friends.map(kid => <span key={kid.id} className="flex items-center gap-4"><Handshake className="size-8 text-[#ea580c]" /><Avatar kid={kid} selected large /></span>)}
          </div>
          <div className="grid grid-cols-5 gap-x-1 gap-y-3 sm:grid-cols-6 sm:gap-x-2 sm:gap-y-4 md:grid-cols-7 lg:grid-cols-8">
            {students.filter(k => k.id !== self.id && !selectedIds.has(k.id)).map(kid => (
              <button key={kid.id} onClick={() => setFriendIds(friendIds.includes(kid.id) ? friendIds.filter(id => id !== kid.id) : (friendIds.length < 2 ? [...friendIds, kid.id] : friendIds))} className={`rounded-3xl p-2 transition active:scale-95 ${friendIds.includes(kid.id) ? 'bg-[#ffedd5] ring-4 ring-[#ea580c]' : 'hover:bg-white'}`} aria-label={kid.name}>
                <Avatar kid={kid} selected={friendIds.includes(kid.id)} />
              </button>
            ))}
          </div>
          <div className="sticky bottom-3 mt-6 flex justify-center gap-8">
            <button onClick={() => setPhase('area')} className={`${iconButton} border-emerald-200 bg-emerald-500`} aria-label="确认朋友" title="确认朋友"><Check className="size-10" strokeWidth={3.5} /></button>
            <button onClick={() => { setFriendIds([]); setPhase('area') }} className={`${iconButton} border-rose-200 bg-rose-500`} aria-label="直接游戏" title="直接游戏"><X className="size-10" strokeWidth={3.5} /></button>
          </div>
        </main>
      )}

      {phase === 'area' && self && (
        <main className="mx-auto flex max-w-6xl flex-col py-6">
          <button onClick={() => setPhase('friend')} className="mb-3 flex size-12 items-center justify-center self-start rounded-full border bg-white" aria-label="返回朋友" title="返回"><ArrowLeft className="size-6" /></button>
          <div className="mb-5 flex items-center justify-center gap-3">
            <Avatar kid={self} selected />
            {friends.map(kid => <span key={kid.id} className="flex items-center gap-3"><Handshake className="size-7 text-[#ea580c]" /><Avatar kid={kid} selected /></span>)}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {areas.map(area => {
              const count = records.filter(r => r.area === area.name).length
              return (
                <button key={area.id} disabled={busy} onClick={() => chooseArea(area)} className="relative flex min-h-40 flex-col items-center justify-center rounded-3xl border-4 border-[#e7d7bd] bg-white p-5 shadow-md transition hover:-translate-y-1 hover:border-[#ea580c] hover:bg-[#fff7ed] active:scale-95 disabled:opacity-50">
                  <span className="text-6xl sm:text-7xl">{area.emoji || FALLBACK_EMOJI[area.name] || '🧸'}</span>
                  <span className="mt-3 font-serif text-lg font-bold sm:text-xl">{area.name}</span>
                  <span className="absolute right-3 top-3 flex min-w-8 items-center justify-center rounded-full bg-[#f3eadb] px-2 py-1 text-sm font-bold text-[#8b6f4d]"><Users className="mr-1 size-4" />{count}</span>
                </button>
              )
            })}
          </div>
          <button onClick={() => setPhase('friend')} className="mx-auto mt-5 flex size-12 items-center justify-center rounded-full border bg-white" aria-label="返回" title="返回"><ArrowLeft className="size-6" /></button>
        </main>
      )}

      {phase === 'done' && self && doneArea && (
        <main className="flex min-h-[calc(100vh-100px)] items-center justify-center">
          <div className="flex items-center gap-5 rounded-3xl border-4 border-[#c2410c] bg-white p-7 shadow-2xl">
            <Avatar kid={self} selected large />
            {friends.map(kid => <span key={kid.id} className="flex items-center gap-5"><Handshake className="size-10 text-[#ea580c]" /><Avatar kid={kid} selected large /></span>)}
            <div className="flex flex-col items-center"><span className="text-7xl">{doneArea.emoji || FALLBACK_EMOJI[doneArea.name] || '🧸'}</span><Check className="mt-2 size-12 text-emerald-500" strokeWidth={3.5} /></div>
          </div>
        </main>
      )}
    </div>
  )
}
