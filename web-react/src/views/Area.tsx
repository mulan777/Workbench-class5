import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTip
} from 'recharts'
import { api, todayStr } from '@/lib/api'
import { toast, confirmDialog } from '@/lib/ui'
import { useWorkspace } from '@/stores/workspace'
import { PageHeader, WkBar, EmptyState, FadeIn } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Trash2, Settings2, Pencil, Loader2, UserRound, Users, HeartHandshake, ListChecks,
  UserCheck, UserX, RefreshCw, ExternalLink, Sparkles, Camera, Handshake, CheckCircle2, X
} from 'lucide-react'

type AreaMeta = { id: number; name: string; emoji: string; sort: number; capacity: number | null }

type Rec = {
  id: number
  week: number
  date?: string | null
  area: string
  type: string
  student_id: number | null
  student_name: string | null
  student_avatar?: string | null
  sid?: string | null
  partner_name: string | null
  content: string | null
  q1: string | null
  q2: string | null
  q3: string | null
  q4: string | null
  created_at: string
}

const FALLBACK_EMOJI: Record<string, string> = {
  美发店: '💈', 美工区: '🎨', 益智区: '🧩', 语言区: '📚',
  建构区: '🧱', 生活区: '🏠', 科学区: '🔬', 阅读区: '📖',
  角色区: '🎭', 娃娃家: '👶', 运动区: '⚽', 木工坊: '🪵'
}

const CANDIES = ['pink', 'blue', 'green', 'yellow', 'purple'] as const
type Candy = typeof CANDIES[number]
function tint(c: Candy) {
  return {
    background: `hsl(var(--candy-${c}) / 0.15)`,
    color: `hsl(var(--candy-${c}))`,
    border: `1px solid hsl(var(--candy-${c}) / 0.35)`
  }
}

function NumberBadge({ sid, size = 'normal' }: { sid: string; size?: 'normal' | 'large' }) {
  const n = sid.replace(/^0+/, '') || sid || '?'
  const palette = ['pink', 'blue', 'green', 'yellow', 'purple'] as const
  const c = palette[(Number(sid) || 1) % palette.length]
  return <div className={`${size === 'large' ? 'size-24 sm:size-28' : 'size-11'} flex shrink-0 items-center justify-center rounded-2xl border shadow-xs`} style={tint(c)} aria-label={`学号${sid}`}>
    <UserRound className={`${size === 'large' ? 'size-10 sm:size-12' : 'size-5'} opacity-70`} strokeWidth={2.2} />
    <span className={`${size === 'large' ? 'text-xl sm:text-2xl' : 'text-xs'} -ml-1 font-bold`}>{n}</span>
  </div>
}

function StuAvatar({ name, sid, cnt, idx }: { name: string; sid?: string | null; cnt?: number; idx: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-14 cursor-default flex-col items-center gap-1">
          <NumberBadge sid={sid || String(idx + 1).padStart(2, '0')} />
          <span className="w-full truncate text-center text-[11px] leading-none text-muted-foreground font-medium">{name}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">{name}{cnt ? ` · 本周选入 ${cnt} 次` : ''}</TooltipContent>
    </Tooltip>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
      {label}
      <span className="font-serif text-sm font-semibold text-foreground">{value}</span>
    </span>
  )
}

export default function Area() {
  const ws = useWorkspace()
  const [areaMeta, setAreaMeta] = useState<AreaMeta[]>([])
  const [records, setRecords] = useState<Rec[]>([])
  const [range, setRange] = useState(7)
  const [period, setPeriod] = useState({start:'',end:''})
  const [loading, setLoading] = useState(false)

  // 区域记录明细折叠区
  const [detailOpen, setDetailOpen] = useState(false)

  // 区域管理弹窗状态
  const [mgrOpen, setMgrOpen] = useState(false)
  const [areas, setAreas] = useState<AreaMeta[]>([])
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🧸')
  const [newCapacity, setNewCapacity] = useState('6')
  const [editRow, setEditRow] = useState<{ id: number; name: string; emoji: string; capacity: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [inviteStats, setInviteStats] = useState<any>({ success: [], failed: [], invitations: [] })

  async function load() {
    setLoading(true)
    try {
      const d: any = await api(`/api/area-records?range=${range}&end=${ws.date}`)
      setRecords(d.records || [])
      setPeriod({start:d.start || '', end:d.end || ''})
      if (Array.isArray(d.areaMeta) && d.areaMeta.length) setAreaMeta(d.areaMeta)
      const inv: any = await api(`/api/area-invitations?range=${range}&end=${ws.date}`)
      setInviteStats(inv)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [ws.week, ws.date, range])

  /* ---------- 第一部分：各区域记录与统计 ---------- */
  const areaStats = useMemo(() => {
    // area -> (studentKey -> {name, avatar, cnt})
const map = new Map<string, Map<string, { name: string; sid: string | null; cnt: number }>>()
    for (const r of records) {
      const nm = r.student_name
      if (!nm) continue
      const key = String(r.student_id ?? 'n:' + nm)
      if (!map.has(r.area)) map.set(r.area, new Map())
      const g = map.get(r.area)!
      if (!g.has(key)) g.set(key, { name: nm, sid: r.sid || null, cnt: 0 })
      const it = g.get(key)!
      it.cnt++
    }
    return map
  }, [records])

  const totalSelections = records.length
  const coveredKids = useMemo(() => {
    const s = new Set<string>()
    records.forEach(r => { if (r.student_name) s.add(r.student_name) })
    return s
  }, [records])

  /* ---------- 第二部分：伙伴交往统计 ---------- */
  const partnerStats = useMemo(() => {
    const pairs = new Map<string, { a: string; b: string; cnt: number }>()
    const deg = new Map<string, { cnt: number; partners: Set<string> }>()
    const bump = (nm: string, other: string) => {
      if (!deg.has(nm)) deg.set(nm, { cnt: 0, partners: new Set() })
      const d = deg.get(nm)!
      d.cnt++; d.partners.add(other)
    }
    for (const r of records) {
      const a = r.student_name, b = r.partner_name
      if (!a || !b) continue
      const [x, y] = [a, b].sort()
      const k = x + '|' + y
      if (!pairs.has(k)) pairs.set(k, { a: x, b: y, cnt: 0 })
      pairs.get(k)!.cnt++
      bump(a, b); bump(b, a)
    }
    const topPairs = [...pairs.values()].sort((p, q) => q.cnt - p.cnt)
    const degrees = [...deg.entries()]
      .map(([name, v]) => ({ name, cnt: v.cnt, partners: [...v.partners] }))
      .sort((x, y) => y.cnt - x.cnt)
    return { topPairs, degrees }
  }, [records])

  // 本周还没在区域记录中出现的在册幼儿
  const unselectedStudents = useMemo(
    () => ws.students.filter(s => !coveredKids.has(s.name)),
    [ws.students, coveredKids]
  )

  const activeAreas = useMemo(
    () => areaMeta.filter(a => (areaStats.get(a.name)?.size ?? 0) > 0).length,
    [areaMeta, areaStats]
  )

  async function openMgr() {
    try {
      const list: any = await api('/api/areas')
      setAreas(list)
      setEditRow(null)
      setNewName(''); setNewEmoji('🧸'); setNewCapacity('6')
      setMgrOpen(true)
    } catch (e: any) { toast.error(e.message) }
  }

  async function addArea() {
    if (!newName.trim()) { toast.error('请输入区域名称'); return }
    setBusy(true)
    try {
      const created: any = await api('/api/areas', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), emoji: newEmoji.trim() || '🧸', capacity: newCapacity.trim() === '' ? null : Number(newCapacity) })
      })
      setAreas(l => [...l, created])
      setNewName(''); setNewEmoji('🧸')
      toast.success(`区域「${created.name}」已添加`)
      await load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function saveEdit() {
    if (!editRow) return
    if (!editRow.name.trim()) { toast.error('请输入区域名称'); return }
    setBusy(true)
    try {
      await api('/api/areas/' + editRow.id, {
        method: 'PUT',
        body: JSON.stringify({ name: editRow.name.trim(), emoji: editRow.emoji.trim() || '🧸', capacity: editRow.capacity.trim() === '' ? null : Number(editRow.capacity) })
      })
      setAreas(l => l.map(a => a.id === editRow.id ? { ...a, name: editRow.name.trim(), emoji: editRow.emoji.trim() || '🧸', capacity: editRow.capacity.trim() === '' ? null : Number(editRow.capacity) } : a))
      setEditRow(null)
      toast('区域已更新')
      await load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function removeArea(a: AreaMeta) {
    const ok = await confirmDialog({
      title: `删除区域「${a.name}」？`,
      description: '仅当该区域下没有区域记录时才能删除；有记录时请先处理记录。',
      danger: true
    })
    if (!ok) return
    try {
      await api('/api/areas/' + a.id, { method: 'DELETE' })
      setAreas(l => l.filter(x => x.id !== a.id))
      toast(`区域「${a.name}」已删除`)
      await load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function delRecord(id: number) {
    const ok = await confirmDialog({ title: '删除这条区域记录？', danger: true })
    if (!ok) return
    try {
      await api('/api/area-records/' + id, { method: 'DELETE' })
      toast('已删除')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const emojiOf = (a: AreaMeta) => a.emoji || FALLBACK_EMOJI[a.name] || '🧸'

  return (
    <div>
      <PageHeader
        title="区域记录"
        desc="记录和查看全班幼儿在各活动区域的参与情况，数据按周汇总呈现。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/select?v=20260904-2" target="_blank" rel="noreferrer">
              <Button className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Sparkles className="size-4" /> 自主选区台 <ExternalLink className="size-3.5 opacity-70" />
              </Button>
            </Link>
            <Link to="/photo?v=20260904-2" target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-1.5">
                <Camera className="size-4" /> 自主拍照台 <ExternalLink className="size-3.5 opacity-70" />
              </Button>
            </Link>
            <Button variant="outline" onClick={openMgr}>
              <Settings2 className="size-4" /> 管理区域
            </Button>
          </div>
        }
      />
      <WkBar />
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-2"><span className="px-2 text-xs text-muted-foreground">统计范围：{period.start} 至 {period.end}</span><div className="flex gap-1">{[[1,'当天'],[7,'7天'],[30,'30天']].map(([v,l])=><Button key={v} size="sm" variant={range===v?'default':'outline'} onClick={()=>setRange(v as number)}>{l}</Button>)}</div></div>

      {!areaMeta.length ? (
        <Card><CardContent className="p-6">
          <EmptyState icon={<Users />} title="暂无区域" hint="点击右上角「管理区域」添加班级的活动区域" />
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <Users className="size-3.5" /> 区域记录分布
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-1.5">
              <HeartHandshake className="size-3.5" /> 伙伴交往统计
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1.5">
              <Handshake className="size-3.5" /> 邀请统计
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: 各区域选区头像统计 */}
          <TabsContent value="overview" className="space-y-4">
            {/* 顶部总体概况条 */}
            <div className="flex flex-wrap items-center gap-2">
              <StatPill label="活跃区域" value={`${activeAreas} / ${areaMeta.length} 区`} />
              <StatPill label="区域记录人次" value={`${totalSelections} 人次`} />
              <StatPill label="覆盖儿童" value={`${coveredKids.size} / ${ws.students.length} 人`} />
              <div className="ml-auto">
                <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1 text-xs">
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> 刷新数据
                </Button>
              </div>
            </div>

            {/* 各区域卡片网格 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {areaMeta.map((a, i) => {
                const map = areaStats.get(a.name)
                const kids = map ? [...map.values()] : []
                const totalInArea = kids.reduce((sum, k) => sum + k.cnt, 0)
                return (
                  <FadeIn key={a.id} delay={i * 30}>
                    <Card className="flex h-full flex-col p-4 transition-all hover:border-ring/40 hover:shadow-md">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[16px] font-semibold">
                          <span className="text-2xl leading-none">{emojiOf(a)}</span> {a.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={kids.length ? 'default' : 'secondary'}>
                            {kids.length} 人
                          </Badge>
                          {totalInArea > kids.length && (
                            <span className="text-[11px] text-muted-foreground">({totalInArea}人次)</span>
                          )}
                        </div>
                      </div>

                      {/* 选入该区域的儿童头像池 */}
                      <div className="flex-1 rounded-xl border border-border/50 bg-accent/20 p-3">
                        {!kids.length ? (
                          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground/70">
                            当前范围暂无儿童选入
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2.5">
                            {kids.map((k, idx) => (
                              <StuAvatar key={k.name} name={k.name} sid={k.sid} cnt={k.cnt} idx={idx} />
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </FadeIn>
                )
              })}
            </div>

            {/* 本周未选区儿童提示 */}
            {unselectedStudents.length > 0 && (
              <Card className="border-dashed bg-muted/30">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <UserX className="size-4 text-amber-500" /> 当前范围尚未选区儿童 ({unselectedStudents.length} 人)：
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unselectedStudents.map(s => (
                      <span key={s.id} className="rounded-lg bg-card px-2.5 py-1 text-xs border border-border text-foreground font-medium">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: 伙伴交往统计 */}
          <TabsContent value="partners" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 伙伴结伴排行榜 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HeartHandshake className="size-4 text-primary" /> 同伴结伴同区 Top 8
                  </CardTitle>
                  <CardDescription>记录在同一区域自主游戏的儿童结伴频次</CardDescription>
                </CardHeader>
                <CardContent>
                  {!partnerStats.topPairs.length ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      暂无伙伴结伴数据
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {partnerStats.topPairs.slice(0, 8).map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-border/60 bg-accent/30 px-3 py-2 text-sm">
                          <span className="font-medium text-foreground">{p.a} ↔ {p.b}</span>
                          <Badge variant="outline" className="font-serif font-bold">{p.cnt} 次</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 幼儿社交广度 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="size-4 text-primary" /> 幼儿社交互动活跃度
                  </CardTitle>
                  <CardDescription>儿童在区域游戏中结识玩伴的人数与频次</CardDescription>
                </CardHeader>
                <CardContent>
                  {!partnerStats.degrees.length ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      暂无社交数据
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {partnerStats.degrees.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-border/60 bg-accent/20 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{d.name}</span>
                            <span className="text-muted-foreground">玩伴: {d.partners.join('、')}</span>
                          </div>
                          <Badge variant="secondary">{d.cnt} 次互动</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

      <TabsContent value="invitations" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> 配对成功排行榜</CardTitle><CardDescription>对方点击绿色勾并进入同一区域的邀请</CardDescription></CardHeader>
            <CardContent>{!inviteStats.success?.length ? <div className="py-8 text-center text-xs text-muted-foreground">暂无成功配对</div> : <div className="space-y-2">{inviteStats.success.map((x: any, i: number) => <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-accent/30 px-3 py-2 text-sm"><span>{x.inviter_name} ↔ {x.invitee_name}</span><Badge variant="outline">{x.count} 次</Badge></div>)}</div>}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><X className="size-4 text-rose-500" /> 配对失败排行榜</CardTitle><CardDescription>对方点击红色叉拒绝的邀请</CardDescription></CardHeader>
            <CardContent>{!inviteStats.failed?.length ? <div className="py-8 text-center text-xs text-muted-foreground">暂无失败配对</div> : <div className="space-y-2">{inviteStats.failed.map((x: any, i: number) => <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-accent/30 px-3 py-2 text-sm"><span>{x.inviter_name} ↔ {x.invitee_name}</span><Badge variant="destructive">{x.count} 次</Badge></div>)}</div>}</CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="size-4 text-primary" /> 每日邀请记录</CardTitle><CardDescription>{inviteStats.start || period.start} 至 {inviteStats.end || period.end}，包含成功、拒绝、取消和待处理</CardDescription></CardHeader>
          <CardContent className="space-y-1.5">{!inviteStats.invitations?.length ? <div className="py-8 text-center text-xs text-muted-foreground">暂无邀请记录</div> : inviteStats.invitations.map((x: any) => <div key={x.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-accent/30 px-3 py-2 text-xs"><span className="shrink-0 text-muted-foreground">{x.date}</span><span className="font-medium">{x.inviter_name} → {x.invitee_name}</span><Badge variant="outline">{FALLBACK_EMOJI[x.area] || '🧸'} {x.area}</Badge><Badge variant={x.status === 'accepted' ? 'default' : x.status === 'rejected' ? 'destructive' : 'secondary'}>{x.status === 'accepted' ? '成功' : x.status === 'rejected' ? '拒绝' : x.status === 'pending' ? '待处理' : x.status === 'cancelled' ? '已取消' : x.status}</Badge><span className="ml-auto text-muted-foreground">{x.responded_at || x.created_at}</span></div>)}</CardContent>
        </Card>
      </TabsContent>

        </Tabs>
      )}

      {/* 区域记录维护（默认收起） */}
      {records.length > 0 && (
        <Card className="mt-5">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setDetailOpen(v => !v)}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <ListChecks className="size-4 text-muted-foreground" />
              选区流水记录（当前范围 {records.length} 条）
            </span>
            <span className="text-xs text-muted-foreground">{detailOpen ? '收起 ▲' : '展开 ▼'}</span>
          </button>
          {detailOpen && (
            <CardContent className="space-y-1.5 border-t border-border/60 pt-3">
              {records.map(r => (
                <div key={r.id} className="group flex items-center gap-2 rounded-lg border border-border/60 bg-accent/30 px-3 py-2 text-xs">
                  <Badge variant="outline" className="shrink-0">{FALLBACK_EMOJI[r.area] || '🧸'} {r.area}</Badge>
                  <span className="shrink-0 font-medium text-foreground">{r.student_name || '—'}</span>
                  <span className="shrink-0 text-muted-foreground">[{r.type || '自主选区'}]</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.date || r.created_at}</span>
                  <span className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
                    <button onClick={() => delRecord(r.id)} className="rounded p-1 hover:text-destructive" title="删除">
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* 区域管理弹窗 */}
      <Dialog open={mgrOpen} onOpenChange={setMgrOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>管理区域</DialogTitle>
          </DialogHeader>
          <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
            {areas.map(a => (
              <div key={a.id} className="rounded-xl border border-border bg-card px-3 py-2">
                {editRow?.id === a.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[4rem_1fr_7rem] gap-2">
                      <Input
                        value={editRow.emoji}
                        onChange={e => setEditRow({ ...editRow, emoji: e.target.value })}
                        className="text-center"
                        placeholder="🧸"
                      />
                      <Input
                        value={editRow.name}
                        onChange={e => setEditRow({ ...editRow, name: e.target.value })}
                        placeholder="区域名称"
                      />
                      <Input type="number" min="1" max="99" value={editRow.capacity} onChange={e => setEditRow({ ...editRow, capacity: e.target.value })} placeholder="人数上限" title="留空表示不限" />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">人数上限：留空表示不限人数</p>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditRow(null)}>取消</Button>
                      <Button size="sm" onClick={saveEdit} disabled={busy}>保存</Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-lg leading-none">{a.emoji || FALLBACK_EMOJI[a.name] || '🧸'}</span> {a.name}
                    </span>
                    <span className="mr-2 text-xs text-muted-foreground">{a.capacity == null ? '不限' : `最多 ${a.capacity} 人`}</span>
                    <span className="flex items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRow({ id: a.id, name: a.name, emoji: a.emoji, capacity: a.capacity == null ? '' : String(a.capacity) })}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => removeArea(a)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </span>
                  </div>
                )}
              </div>
            ))}
            {!areas.length && <p className="py-4 text-center text-sm text-muted-foreground">还没有区域，在下方添加第一个吧</p>}
          </div>
          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">新增区域（人数上限留空表示不限）</p>
            <div className="flex gap-2">
              <Input
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                className="w-16 shrink-0 text-center"
                placeholder="🧸"
                title="区域图标（可用任意 emoji）"
              />
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addArea() }}
                placeholder="区域名称，如：木工坊"
              />
              <Input type="number" min="1" max="99" value={newCapacity} onChange={e => setNewCapacity(e.target.value)} placeholder="人数上限" title="留空表示不限" className="w-24" />
              <Button onClick={addArea} disabled={busy || !newName.trim()} className="shrink-0">
                添加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
