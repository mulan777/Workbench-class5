import { useEffect, useState, useMemo } from 'react'
import { api, todayStr, weekOf } from '@/lib/api'
import { toast } from '@/lib/ui'
import {
  Sparkles, CheckCircle2, Maximize, Minimize, RefreshCw,
  Users, ChevronDown, ChevronUp, UserCheck, Check
} from 'lucide-react'

type Area = { id: number; name: string; emoji: string; sort: number }
type Student = { id: number; sid: string; name: string; avatar: string | null }
type SelectionRecord = {
  id: number
  week: number
  date: string | null
  area: string
  student_id: number
  student_name: string
  student_avatar: string | null
  sid: string
  created_at: string
}

const FALLBACK_EMOJI: Record<string, string> = {
  美发店: '💈', 美工区: '🎨', 益智区: '🧩', 语言区: '📚',
  建构区: '🧱', 生活区: '🏠', 科学区: '🔬', 阅读区: '📖',
  角色区: '🎭', 娃娃家: '👶', 运动区: '⚽', 木工坊: '🪵'
}

const CANDIES = ['pink', 'blue', 'green', 'yellow', 'purple'] as const
type Candy = typeof CANDIES[number]

function getCandyStyle(idx: number, isSelected: boolean = false) {
  const c = CANDIES[idx % CANDIES.length]
  return {
    background: isSelected ? `hsl(var(--candy-${c}))` : `hsl(var(--candy-${c}) / 0.16)`,
    color: isSelected ? '#ffffff' : `hsl(var(--candy-${c}))`,
    borderColor: `hsl(var(--candy-${c}) / 0.45)`
  }
}

export default function ChildSelect() {
  const [date] = useState(todayStr())
  const [areas, setAreas] = useState<Area[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [records, setRecords] = useState<SelectionRecord[]>([])
  const [selectedKidId, setSelectedKidId] = useState<number | null>(null)
  const [isMobileListOpen, setIsMobileListOpen] = useState(true)
  const [successStamp, setSuccessStamp] = useState<{ name: string; area: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  async function loadData() {
    try {
      const res: any = await api(`/api/area-selection/today?date=${date}`)
      setAreas(res.areas || [])
      setStudents(res.students || [])
      setRecords(res.records || [])
    } catch (e: any) {
      toast.error('加载选区数据失败')
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(() => loadData(), 5000)
    return () => clearInterval(timer)
  }, [date])

  const areaKidsMap = useMemo(() => {
    const map = new Map<string, SelectionRecord[]>()
    for (const a of areas) map.set(a.name, [])
    for (const r of records) {
      if (!map.has(r.area)) map.set(r.area, [])
      const list = map.get(r.area)!
      if (!list.some(x => x.student_id === r.student_id)) list.push(r)
    }
    return map
  }, [areas, records])

  const selectedKidIds = useMemo(() => new Set(records.map(r => r.student_id)), [records])
  const unselectedKids = useMemo(() => students.filter(s => !selectedKidIds.has(s.id)), [students, selectedKidIds])
  const selectedKid = useMemo(() => students.find(s => s.id === selectedKidId) || null, [students, selectedKidId])

  function handleSelectKid(id: number) {
    if (selectedKidId === id) {
      setSelectedKidId(null)
      setIsMobileListOpen(true)
    } else {
      setSelectedKidId(id)
      setIsMobileListOpen(false) // 手机端选完头像后自动折叠，选区上移
    }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.25)
    } catch (_) {}
  }

  async function submitSelect(studentId: number, targetArea: string) {
    const stu = students.find(s => s.id === studentId)
    if (!stu) return

    const nowStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    setRecords(prev => {
      const filtered = prev.filter(r => r.student_id !== studentId)
      return [
        ...filtered,
        {
          id: Date.now(),
          week: weekOf(date),
          date,
          area: targetArea,
          student_id: studentId,
          student_name: stu.name,
          student_avatar: stu.avatar,
          sid: stu.sid,
          created_at: nowStr
        }
      ]
    })

    setSuccessStamp({ name: stu.name, area: targetArea })
    playBeep()
    setSelectedKidId(null)
    setIsMobileListOpen(true) // 完成后重置为展开
    setTimeout(() => setSuccessStamp(null), 1600)

    try {
      await api('/api/area-selection/select', {
        method: 'POST',
        body: JSON.stringify({ studentId, area: targetArea, date, week: weekOf(date) })
      })
    } catch (e: any) {
      toast.error('选区保存失败，请重试')
      loadData()
    }
  }

  async function cancelSelect(studentId: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    const stu = students.find(s => s.id === studentId)
    setRecords(prev => prev.filter(r => r.student_id !== studentId))
    try {
      await api('/api/area-selection/select', {
        method: 'POST',
        body: JSON.stringify({ studentId, area: null, date })
      })
      toast(`已重置「${stu?.name || '幼儿'}」的选区`)
    } catch (e: any) {
      toast.error('重置失败: ' + e.message)
      loadData()
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#faf6ee] text-[#2d2926] font-sans select-none flex flex-col p-3 sm:p-5 md:p-6 overflow-x-hidden">
      {/* 统一顶栏 */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#e6decb]">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#c2410c] text-white font-serif font-bold text-xl shadow-md ring-4 ring-[#ffedd5]">
            中5
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#3c2f21] tracking-wide flex items-center gap-2">
              自主选区台 <Sparkles className="size-5 text-[#ea580c] fill-[#ea580c]/20 animate-pulse" />
            </h1>
            <p className="text-[11px] text-[#8c7e6d]">点击头像 ➔ 点击活动区域，轻松完成选区！</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#dfd7c2] shadow-2xs">
            <span className="text-xs text-[#8c7e6d]">已选</span>
            <span className="font-serif font-bold text-base text-[#c2410c]">
              {selectedKidIds.size} <span className="text-xs font-normal text-[#8c7e6d]">/ {students.length} 人</span>
            </span>
          </div>

          <button
            onClick={() => loadData()}
            className="flex size-9 items-center justify-center rounded-xl bg-white border border-[#dfd7c2] text-[#665e52] hover:bg-[#f3ece0] active:scale-95 shadow-2xs transition"
            title="刷新数据"
          >
            <RefreshCw className="size-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex size-9 items-center justify-center rounded-xl bg-white border border-[#dfd7c2] text-[#665e52] hover:bg-[#f3ece0] active:scale-95 shadow-2xs transition"
            title="切换全屏"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </header>

      {/* 桌面端重新排版：头像仅占左侧 3.5 列 (精简紧凑)，右侧 8.5 列超大面积聚焦活动选区；手机端智能折叠 */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 pt-4">
        {/* 左侧：选择头像 (桌面 4 列 / 手机折叠) */}
        <section className="lg:col-span-4 flex flex-col bg-white rounded-2xl sm:rounded-3xl border-2 border-[#dfd7c2] p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#f0ead8]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-[#3c2f21]">
                步骤 1：选头像
              </span>
              {selectedKid && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffedd5] text-[#c2410c] text-xs font-bold animate-pulse">
                  已选中：{selectedKid.name}
                </span>
              )}
            </div>
            {/* 手机端折叠/展开开关 */}
            <button
              onClick={() => setIsMobileListOpen(o => !o)}
              className="lg:hidden flex items-center gap-1 text-xs text-[#c2410c] font-bold bg-[#ffedd5] px-2.5 py-1 rounded-lg"
            >
              {isMobileListOpen ? <>收起头像 <ChevronUp className="size-3.5" /></> : <>更换头像 <ChevronDown className="size-3.5" /></>}
            </button>
          </div>

          {/* 手机端折叠状态下展示当前选中小朋友条 */}
          {!isMobileListOpen && selectedKid && (
            <div
              onClick={() => setIsMobileListOpen(true)}
              className="lg:hidden flex items-center justify-between p-2.5 rounded-xl bg-[#fff7ed] border border-[#ea580c]/30 cursor-pointer mb-1"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl overflow-hidden border border-[#ea580c] flex items-center justify-center font-bold font-serif text-base" style={getCandyStyle(selectedKid.id, true)}>
                  {selectedKid.avatar ? <img src={selectedKid.avatar} alt="" className="w-full h-full object-cover" /> : selectedKid.name.slice(-1)}
                </div>
                <span className="font-bold text-sm text-[#c2410c]">{selectedKid.name}</span>
              </div>
              <span className="text-xs text-[#8c7e6d] underline">点击更换</span>
            </div>
          )}

          {/* 头像列表 */}
          <div className={`flex-1 overflow-y-auto max-h-[260px] sm:max-h-[380px] lg:max-h-[calc(100vh-210px)] p-1 ${!isMobileListOpen ? 'hidden lg:flex' : 'flex'} flex-wrap content-start gap-2.5`}>
            {students.map((kid, idx) => {
              const isSelected = selectedKidId === kid.id
              const isDone = selectedKidIds.has(kid.id)
              return (
                <div
                  key={kid.id}
                  onClick={() => handleSelectKid(kid.id)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#fed7aa] scale-105 ring-3 ring-[#ea580c] shadow-md z-10'
                      : isDone
                      ? 'bg-[#f4f2ea] opacity-70 hover:opacity-100 hover:bg-[#fff7ed]'
                      : 'hover:bg-[#fbf7ea] hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="relative size-12 sm:size-13 rounded-xl overflow-hidden border border-[#d8cdb5] shadow-2xs bg-[#faf6ee] flex items-center justify-center">
                    {kid.avatar ? (
                      <img src={kid.avatar} alt={kid.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-lg font-bold font-serif"
                        style={getCandyStyle(kid.id)}
                      >
                        {kid.name.slice(-1)}
                      </div>
                    )}
                    {isDone && (
                      <span className="absolute bottom-0 right-0 size-3.5 bg-[#16a34a] text-white rounded-tl-md flex items-center justify-center text-[9px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold truncate max-w-[48px] text-center ${isSelected ? 'text-[#c2410c]' : 'text-[#3c2f21]'}`}>
                    {kid.name}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* 右侧：超大主活动区域网格 (桌面 8 列) */}
        <section className="lg:col-span-8 flex flex-col bg-white rounded-2xl sm:rounded-3xl border-2 border-[#dfd7c2] p-3.5 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f0ead8]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg text-[#3c2f21]">
                步骤 2：点击活动区域
              </span>
              <span className="text-xs text-[#8c7e6d]">
                {selectedKid ? `点击下方卡片，放入「${selectedKid.name}」` : '（请先点击上方/左侧头像）'}
              </span>
            </div>
            {selectedKid && (
              <span className="text-xs font-bold text-[#ea580c] animate-bounce">
                点击放入区域 ➔
              </span>
            )}
          </div>

          {/* 大面积区域网格 */}
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-210px)] grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-1">
            {areas.map(area => {
              const kids = areaKidsMap.get(area.name) || []
              const isReady = selectedKidId !== null

              return (
                <div
                  key={area.id}
                  onClick={() => {
                    if (selectedKidId) submitSelect(selectedKidId, area.name)
                    else toast('请先选择你的头像')
                  }}
                  className={`group relative flex flex-col rounded-2xl border-2 p-3.5 sm:p-4 transition-all duration-150 cursor-pointer min-h-[140px] sm:min-h-[160px] ${
                    isReady
                      ? 'border-[#ea580c] bg-[#fff7ed] hover:bg-[#ffedd5] hover:scale-[1.02] shadow-md ring-3 ring-[#ea580c]/20'
                      : 'border-[#dfd7c2] bg-[#faf7ee] hover:border-[#c5bba1] hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#ebdcc4]">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl leading-none">{area.emoji || FALLBACK_EMOJI[area.name] || '🧸'}</span>
                      <span className="font-serif font-bold text-base sm:text-lg text-[#3c2f21]">{area.name}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-bold text-[#8c7456] shadow-2xs">
                      {kids.length}人
                    </span>
                  </div>

                  {/* 区域内已选儿童头像列表 */}
                  <div className="mt-2.5 flex-1 flex flex-wrap content-start gap-1.5 overflow-y-auto max-h-[100px]">
                    {kids.length === 0 ? (
                      <span className="text-xs text-[#a89b88] italic self-center my-auto">暂无小朋友</span>
                    ) : (
                      kids.map(k => (
                        <span
                          key={k.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#dfd7c2] text-xs font-semibold text-[#4a3f31] shadow-2xs"
                        >
                          {k.student_name}
                          <button
                            onClick={e => cancelSelect(k.student_id, e)}
                            className="hover:text-red-500 text-[11px] text-muted-foreground ml-0.5"
                            title="撤回"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {isReady && (
                    <div className="mt-2 text-center text-xs font-bold text-[#c2410c] bg-white py-1 rounded-lg border border-[#ea580c]/30 shadow-2xs">
                      放入「{area.name}」
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* 选区成功反馈 */}
      {successStamp && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-[2px] animate-in fade-in">
          <div className="flex flex-col items-center justify-center rounded-3xl border-4 border-[#c2410c] bg-white p-7 shadow-2xl scale-110 animate-bounce">
            <span className="text-4xl sm:text-5xl font-serif font-bold text-[#c2410c]">
              {successStamp.name}
            </span>
            <span className="mt-2 text-lg sm:text-xl font-bold text-[#78350f]">
              已进入 · {successStamp.area} ✨
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
