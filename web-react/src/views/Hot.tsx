import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, confirmDialog } from '@/lib/ui'
import { useWorkspace } from '@/stores/workspace'
import { PageHeader, WkBar, EmptyState, FadeIn, StampDone } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip
} from 'recharts'
import {
  Plus, Trash2, Heart, Vote as VoteIcon, Search, Send,
  Inbox, TrendingUp, Megaphone
} from 'lucide-react'

type Trouble = any

export default function Hot() {
  const ws = useWorkspace()
  const [tags, setTags] = useState<string[]>([])
  const [troubles, setTroubles] = useState<Trouble[]>([])
  const [reactions, setReactions] = useState<any[]>([])
  const [tracking, setTracking] = useState<any[]>([])
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [plusOne, setPlusOne] = useState('')
  const [voteModal, setVoteModal] = useState<{ open: boolean; kind: string; trouble: Trouble | null }>({ open: false, kind: '', trouble: null })
  const [voteChild, setVoteChild] = useState('')
  const [trackModal, setTrackModal] = useState(false)
  const [trackForm, setTrackForm] = useState({ troubleId: 0, troubleLabel: '', content: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const d: any = await api(`/api/troubles?week=${ws.week}`)
    setTags(d.tags); setTroubles(d.troubles); setReactions(d.reactions); setTracking(d.tracking)
  }
  useEffect(() => { load().catch(e => toast.error(e.message)) }, [ws.week])

  const cnt = (tid: number, kind: string) =>
    reactions.find(r => r.tid === tid && r.kind === kind)?.cnt || 0

  async function saveTrouble() {
    if (!form.tag || !form.content) return
    setSaving(true)
    try {
      await api('/api/troubles', { method: 'POST', body: JSON.stringify({ ...form, week: ws.week }) })
      toast('困扰已记录')
      setAddModal(false)
      await load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function saveReact() {
    if (!voteChild) return
    try {
      await api(`/api/troubles/${voteModal.trouble!.id}/react`, {
        method: 'POST',
        body: JSON.stringify({ kind: voteModal.kind, studentId: Number(voteChild) })
      })
      toast(voteModal.kind === 'vote' ? '投票成功' : '共情成功')
      setPlusOne(voteModal.kind === 'vote' ? '+1' : '抱抱')
      setTimeout(() => setPlusOne(''), 1500)
      setVoteModal({ open: false, kind: '', trouble: null })
      await load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function delTrouble(id: number) {
    const ok = await confirmDialog({ title: '删除这条困扰？', description: '相关共情、投票、追踪记录将一并删除。', danger: true })
    if (!ok) return
    await api('/api/troubles/' + id, { method: 'DELETE' })
    toast('已删除')
    load()
  }

  async function saveTrack() {
    if (!trackForm.content) return
    try {
      await api('/api/trackings', { method: 'POST', body: JSON.stringify(trackForm) })
      setPlusOne('记下')
      setTimeout(() => setPlusOne(''), 1500)
      toast('追踪已记录')
      setTrackModal(false)
      await load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function delTrack(id: number) {
    const ok = await confirmDialog({ title: '删除这条追踪记录？', danger: true })
    if (!ok) return
    await api('/api/trackings/' + id, { method: 'DELETE' })
    toast('已删除')
    load()
  }

  async function pushCouncil(t: Trouble) {
    const ok = await confirmDialog({
      title: '推送到儿童议事会？',
      description: `将「${t.content.slice(0, 24)}…」作为本周新议事议题推送。`
    })
    if (!ok) return
    await api('/api/council', {
      method: 'POST',
      body: JSON.stringify({
        week: ws.week,
        source: `热点问题墙·${t.tag}`,
        evidence: t.content,
        proposal: '待儿童讨论',
        reason: '待儿童讨论',
        result: '待协商',
        feedback: '待试行'
      })
    })
    toast('已推送到本周议事会')
    load()
  }

  const voteStats = troubles
    .map(t => ({ t, c: cnt(t.id, 'vote') }))
    .filter(x => x.c > 0)
    .sort((a, b) => b.c - a.c)

  const chartData = voteStats.map(v => ({
    name: v.t.content.length > 10 ? v.t.content.slice(0, 10) + '…' : v.t.content,
    票数: v.c
  }))
  const top = voteStats[0]

  return (
    <div>
      <PageHeader
        title="热点问题墙"
        desc="存放幼儿交友困扰，支持共情与投票，选出班级最想讨论的议题，并可一键推送至议事会。"
        action={
          <Button onClick={() => { setForm({ tag: '', type: '教师代写', studentId: '', content: '' }); setAddModal(true) }}>
            <Plus /> 添加困扰
          </Button>
        }
      />
      <WkBar />

      <Tabs defaultValue="wall" className="mb-4">
        <TabsList>
          <TabsTrigger value="wall"><Heart /> 交友困扰</TabsTrigger>
          <TabsTrigger value="votes"><TrendingUp /> 投票排行</TabsTrigger>
          <TabsTrigger value="tracks"><Search /> 追踪反馈</TabsTrigger>
        </TabsList>

        {/* 困扰列表 */}
        <TabsContent value="wall">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">我的交友小困扰</CardTitle>
              <CardDescription>本周共 {troubles.length} 条 · 点按钮选择幼儿进行共情或投票</CardDescription>
            </CardHeader>
            <CardContent>
              {!troubles.length ? (
                <EmptyState icon={<Inbox />} title="本周还没有记录" hint="点右上角「添加困扰」，帮孩子把交友烦恼说出来" />
              ) : (
                <div className="divide-y divide-border">
                  {troubles.map(t => (
                    <div key={t.id} className="group py-4 first:pt-0 last:pb-0">
                      <div className="mb-1.5 flex items-center gap-2">
                        <Badge variant="secondary">{t.tag}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {(t.created_at || '').slice(5, 10)}
                          {t.student_name && ` · ${t.student_name}`}
                        </span>
                        <span className="flex-1" />
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => delTrouble(t.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <p className="mb-2.5 font-hand text-[15px] leading-relaxed text-foreground/90">{t.content}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5 hover:border-rose-300 hover:text-rose-500 dark:hover:border-rose-800" onClick={() => { setVoteChild(''); setVoteModal({ open: true, kind: 'empathy', trouble: t }) }}>
                          <Heart className="size-3.5" /> 我也有过 {cnt(t.id, 'empathy')}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 hover:border-emerald-300 hover:text-primary dark:hover:border-emerald-800" onClick={() => { setVoteChild(''); setVoteModal({ open: true, kind: 'vote', trouble: t }) }}>
                          <VoteIcon className="size-3.5" /> 投票 {cnt(t.id, 'vote')}
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 hover:border-sky-300 hover:text-sky-600 dark:hover:border-sky-800" onClick={() => { setTrackForm({ troubleId: t.id, troubleLabel: t.content, content: '' }); setTrackModal(true) }}>
                          <Search className="size-3.5" /> 追踪进展
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 投票排行 */}
        <TabsContent value="votes">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">热点投票排行</CardTitle>
              <CardDescription>票数最高的议题可一键推送至本周儿童议事会（需 ≥2 票）</CardDescription>
            </CardHeader>
            <CardContent>
              {!chartData.length ? (
                <EmptyState icon={<TrendingUp />} title="暂无投票" hint="在「交友困扰」页给议题投票后，这里会出现排行图表" />
              ) : (
                <>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-border" />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <RTooltip cursor={{ fill: 'rgba(16,185,129,0.06)' }} formatter={(v: any) => [`${v} 票`, '票数']} />
                        <Bar dataKey="票数" fill="hsl(var(--primary))" radius={[0, 7, 7, 0]} maxBarSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 divide-y divide-border">
                    {voteStats.map((v, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                        <p className="min-w-0 flex-1 truncate text-sm">
                          {i === 0 && <Badge className="mr-2">TOP</Badge>}
                          {v.t.content}
                        </p>
                        <span className="shrink-0 text-sm font-medium text-primary">{v.c} 票</span>
                        {v === top && v.c >= 2 && (
                          <Button size="sm" variant="secondary" className="gap-1" onClick={() => pushCouncil(v.t)}>
                            <Send className="size-3.5" /> 推送至议事会
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 追踪反馈 */}
        <TabsContent value="tracks">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">问题追踪反馈板</CardTitle>
              <CardDescription>记录议题后续进展，形成完整闭环</CardDescription>
            </CardHeader>
            <CardContent>
              {!tracking.length ? (
                <EmptyState icon={<Megaphone />} title="暂无追踪记录" hint="在「交友困扰」页点「追踪进展」记录问题后续" />
              ) : (
                <div className="divide-y divide-border">
                  {tracking.map(tr => (
                    <div key={tr.id} className="group flex gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted-foreground">
                          原问题：{troubles.find(x => x.id === tr.trouble_id)?.content || '（已删除）'}
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed">{tr.content}</p>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => delTrack(tr.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 添加困扰 */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加交友小困扰</DialogTitle></DialogHeader>
          <div>
            <Label>问题分类</Label>
            <Select value={form.tag || undefined} onValueChange={v => setForm((f: any) => ({ ...f, tag: v }))}>
              <SelectTrigger><SelectValue placeholder="请选择分类" /></SelectTrigger>
              <SelectContent>{tags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>录入方式</Label>
            <Select value={form.type || '教师代写'} onValueChange={v => setForm((f: any) => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['教师代写', '幼儿绘画', '家长记录'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>幼儿</Label>
            <Select value={form.studentId ? String(form.studentId) : undefined} onValueChange={v => setForm((f: any) => ({ ...f, studentId: Number(v) }))}>
              <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
              <SelectContent>
                {ws.students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.sid} {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>困扰内容</Label>
            <Textarea rows={3} value={form.content || ''} onChange={(e: any) => setForm((f: any) => ({ ...f, content: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>取消</Button>
            <Button onClick={saveTrouble} disabled={saving || !form.tag || !form.content}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 共情/投票选人 */}
      <Dialog open={voteModal.open} onOpenChange={o => !o && setVoteModal({ open: false, kind: '', trouble: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{voteModal.kind === 'vote' ? '投票' : '我也有过'}</DialogTitle>
          </DialogHeader>
          <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm leading-relaxed">{voteModal.trouble?.content}</p>
          <div>
            <Label>{voteModal.kind === 'vote' ? '投票人' : '共情人'}</Label>
            <Select value={voteChild || undefined} onValueChange={setVoteChild}>
              <SelectTrigger><SelectValue placeholder="请选择幼儿" /></SelectTrigger>
              <SelectContent>
                {ws.students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.sid} {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteModal({ open: false, kind: '', trouble: null })}>取消</Button>
            <Button onClick={saveReact} disabled={!voteChild}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 追踪 */}
      <Dialog open={trackModal} onOpenChange={setTrackModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>追踪进展</DialogTitle></DialogHeader>
          <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm leading-relaxed">{trackForm.troubleLabel}</p>
          <div>
            <Label>后来怎么样了？</Label>
            <Textarea rows={3} placeholder="记录问题的后续发展…" value={trackForm.content} onChange={(e: any) => setTrackForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackModal(false)}>取消</Button>
            <Button onClick={saveTrack} disabled={!trackForm.content.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      {plusOne && <StampDone text={plusOne} />}
      </Dialog>
    </div>
  )
}
