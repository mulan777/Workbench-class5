import { useEffect, useMemo, useState, useRef } from 'react'
import { api, weekOf } from '@/lib/api'
import { playVoice } from '@/lib/audioVoice'
import { toast } from '@/lib/ui'
import {
  ArrowLeft, Check, Handshake, Maximize, Minimize, RefreshCw,
  Sparkles, UserRound, Users, X
} from 'lucide-react'

type Area = { id: number; name: string; emoji: string; sort: number; capacity: number | null }
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
  const idleTimerRef = useRef<number | null>(null)

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
  const areaCount = (name: string) => new Set(records.filter(r => r.area === name).map(r => r.student_id)).size

  // 子阶段 60 秒无触控自动回到找号码页；待机页不计时
  useEffect(() => {
    if (phase === 'self' || phase === 'done') return
    const resetIdle = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(() => {
        reset()
        playVoice('我们重新找一找自己的号码吧')
      }, 60000)
    }
    const onActivity = () => resetIdle()
    window.addEventListener('touchstart', onActivity, { passive: true })
    window.addEventListener('mousedown', onActivity)
    resetIdle()
    return () => {
      window.removeEventListener('touchstart', onActivity)
      window.removeEventListener('mousedown', onActivity)
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    }
  }, [phase])

  function reset() {
    setPhase('self'); setSelfId(null); setFriendIds([])
    setActiveInvitations([]); setDoneArea(null); setBusy(false)
    loadData()
  }

  function chooseSelf(kid: Student) {
    if (selectedIds.has(kid.id)) { toast('这个号码已经选好啦'); return }
    const pending = invitations.filter(i => i.invitee_student_id === kid.id)
    setSelfId(kid.id)
    setFriendIds([])
    playVoice(pending.length ? '有小朋友想和你一起玩' : '今天想找谁一起玩呢')
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
      setDoneArea(area); setPhase('done'); playVoice(`选好啦，快去${area.name}探索吧`); playBeep()
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
      setDoneArea(area); setPhase('done'); playVoice(`选好啦，快去${area.name}探索吧`); playBeep()
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
            <button onClick={() => { setFriendIds([]); setPhase('area'); playVoice('自己玩也很棒') }} className={`${iconButton} border-orange-200 bg-orange-400`} aria-label="自己玩" title="自己玩"><UserRound className="size-10" strokeWidth={2.8} /></button>
          </div>
        </main>
      )}

      {phase === 'area' && self && (
        <main className="mx-auto flex max-w-6xl flex-col py-2 sm:py-4">
          <button onClick={() => setPhase('friend')} className="mb-3 flex size-12 items-center justify-center self-start rounded-full border bg-white" aria-label="返回朋友" title="返回"><ArrowLeft className="size-6" /></button>
          <div className="mb-2 flex items-center justify-center gap-2 sm:mb-3 sm:gap-3">
            <Avatar kid={self} selected />
            {friends.map(kid => <span key={kid.id} className="flex items-center gap-3"><Handshake className="size-7 text-[#ea580c]" /><Avatar kid={kid} selected /></span>)}
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4">
            {areas.map(area => {
              const count = areaCount(area.name)
              const need = 1 + friends.length
              const full = area.capacity !== null && count >= area.capacity
              const enough = area.capacity === null || count + need <= area.capacity
              const slots = area.capacity === null ? [] : Array.from({ length: Math.min(area.capacity, 8) }, (_, i) => i)
              return (
                <button key={area.id} disabled={busy || !enough} onClick={() => chooseArea(area)} className={`relative flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 p-1.5 shadow-md transition active:scale-95 ${!enough ? 'cursor-not-allowed border-[#ded8cc] bg-[#f1eee8] opacity-70' : 'border-[#e7d7bd] bg-white hover:-translate-y-1 hover:border-[#ea580c] hover:bg-[#fff7ed]'}`}>
                  <span className="text-3xl sm:text-5xl">{area.emoji || FALLBACK_EMOJI[area.name] || '🧸'}</span>
                  <span className="mt-0.5 font-serif text-xs font-bold sm:text-base">{area.name}</span>
                  {area.capacity === null ? (
                    <span className="mt-2 rounded-full bg-[#f3eadb] px-2.5 py-1 text-xs font-bold text-[#8b6f4d]">可以继续加入</span>
                  ) : (
                    <div className="mt-0.5 flex max-w-full flex-wrap justify-center gap-0.5" aria-label={`${area.name}已进入${count}人，容量${area.capacity}人`}>
                      {slots.map(i => <span key={i} className={`flex size-4 items-center justify-center rounded-full border text-[9px] font-bold ${i < count ? 'border-[#ea580c] bg-[#ea580c] text-white' : 'border-[#d9c9ae] bg-[#fffaf0] text-[#bca98e]'}`}>{i < count ? '✓' : ''}</span>)}
                    </div>
                  )}
                  <span className={`mt-0.5 text-[10px] font-bold ${full ? 'text-[#9f1239]' : 'text-[#8b6f4d]'}`}>{full ? '已满员' : area.capacity === null ? '不限人数' : `${count} / ${area.capacity} 人`}</span>
                </button>
              )
            })}
          </div>
          <button onClick={() => setPhase('friend')} className="mx-auto mt-2 flex size-10 sm:mt-4 sm:size-12 items-center justify-center rounded-full border bg-white" aria-label="返回" title="返回"><ArrowLeft className="size-6" /></button>
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
