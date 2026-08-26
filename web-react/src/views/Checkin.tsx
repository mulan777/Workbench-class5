import { useEffect, useRef, useState } from 'react'
import { api, upload, fmtDate, todayStr } from '@/lib/api'
import { toast, confirmDialog } from '@/lib/ui'
import { useWorkspace } from '@/stores/workspace'
import { PageHeader, WkBar, EmptyState, StampDone } from '@/components/shared'
import { PairPicker } from '@/components/PairPicker'
import { TrendChart } from '@/components/TrendChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Camera, Trash2, Handshake, TriangleAlert, Loader2, CalendarClock,
  Wand2, Eraser
} from 'lucide-react'

type Rec = {
  id: number; note: string | null; photo_path: string | null; date: string
  pairs: { id: number; an: string; bn: string }[]
}

export default function Checkin() {
  const ws = useWorkspace()
  const [records, setRecords] = useState<Rec[]>([])
  const [stats, setStats] = useState<{ topPairs: any[]; daysRecorded: number }>({ topPairs: [], daysRecorded: 0 })
  const [modal, setModal] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [stamp, setStamp] = useState(false)
  // 演示数据弹窗状态
  const [demoModal, setDemoModal] = useState(false)
  const [demoWeeks, setDemoWeeks] = useState(4)
  const [seeding, setSeeding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [list, st] = await Promise.all([
      api(`/api/checkins?date=${ws.date}`),
      api('/api/checkins/stats')
    ])
    setRecords(list as Rec[])
    setStats(st as any)
  }
  useEffect(() => { load().catch(e => toast.error(e.message)) }, [ws.date])

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', f)
    upload('/api/upload', fd)
      .then((d: any) => {
        setPhotoUrl(d.url)
        setPicked([])
        setModal(true)
      })
      .catch(err => toast.error(err.message))
      .finally(() => { setUploading(false); e.target.value = '' })
  }

  function toggle(id: number) {
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }

  async function save() {
    if (picked.length < 2 || picked.length % 2 !== 0) return
    setSaving(true)
    try {
      await api('/api/checkins', {
        method: 'POST',
        body: JSON.stringify({
          date: ws.date,
          photoPath: photoUrl || null,
          note: note || null,
          pairIds: chunkPairs(picked)
        })
      })
      setStamp(true)
      setTimeout(() => setStamp(false), 1700)
      setModal(false)
      setNote('')
      setPhotoUrl('')
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function del(id: number) {
    const ok = await confirmDialog({ title: '删除这条签到记录？', description: '当天配对统计将一并删除。', danger: true })
    if (!ok) return
    await api('/api/checkins/' + id, { method: 'DELETE' })
    toast('已删除')
    load()
  }

  async function seedDemo() {
    setSeeding(true)
    try {
      await api('/api/demo/checkin-seed', {
        method: 'POST',
        body: JSON.stringify({ weeks: demoWeeks })
      })
      toast.success(`已生成最近 ${demoWeeks} 周的模拟签到与区域倾听数据`)
      setDemoModal(false)
      await load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSeeding(false)
    }
  }

  async function clearDemo() {
    const ok = await confirmDialog({
      title: '清除全部演示模拟数据？',
      description: '仅删除系统生成的演示数据（签到备注为「演示」、区域倾听标记记录），真实登记不受影响。',
      danger: true
    })
    if (!ok) return
    try {
      await api('/api/demo/clear', { method: 'POST' })
      toast('演示数据已清除')
      await load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const chartData = stats.topPairs.slice(0, 8).map((p: any) => ({ name: `${p.an} · ${p.bn}`, 结伴次数: p.cnt }))
  const solidPairs = stats.topPairs.filter((p: any) => p.cnt >= 2)

  return (
    <div>
      <PageHeader
        title="签到台"
        desc="上传签到板照片，对照照片点选结伴幼儿，系统自动两两配对并统计。"
        action={
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            <Button variant="outline" onClick={() => setDemoModal(true)}>
              <Wand2 /> 模拟数据
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
              {uploading ? '上传中…' : '上传照片并登记'}
            </Button>
          </>
        }
      />

      <WkBar />

      {/* 当日记录 */}
      <Card className="mb-5">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-[15px]">当日签到（{fmtDate(ws.date)}）</CardTitle>
            <CardDescription>共 {records.length} 条记录</CardDescription>
          </div>
          <Button
            variant="ghost" size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={clearDemo}
            disabled={!stats.topPairs.length}
          >
            <Eraser /> 清除演示数据
          </Button>
        </CardHeader>
        <CardContent>
          {!records.length ? (
            <EmptyState
              icon={<Camera />}
              title="今天还没有登记"
              hint="点右上角「上传照片并登记」，对照签到板照片按结伴顺序点选幼儿即可"
            />
          ) : (
            <div className="divide-y divide-border">
              {records.map(r => (
                <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {r.note || '结伴签到'}
                      <Badge variant="secondary">{r.pairs.length} 对</Badge>
                      {r.note === '演示' && <Badge variant="outline" className="text-muted-foreground">模拟</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{fmtDate(r.date)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => del(r.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {r.pairs.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-[13px] text-accent-foreground">
                        <Handshake className="size-3.5" /> {p.an} · {p.bn}
                      </span>
                    ))}
                  </div>
                  {r.photo_path && (
                    <img src={r.photo_path} alt="签到板" className="max-h-56 rounded-lg border border-border object-cover transition hover:brightness-[1.03]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 统计图表：grok2api 风格（渐变面积 + 半透明圆角柱） */}
      <Card className="mb-5">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-[15px]">伙伴交往统计</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" /> 已累计 {stats.daysRecorded} 天数据 · 点击图例可隐藏系列
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState icon={<Handshake />} title="暂无统计" hint="需要多日签到数据积累后自动生成，也可用右上角「模拟数据」先看效果" />
          ) : (
            <TrendChart
              data={chartData}
              xKey="name"
              intY
              series={[{ key: '结伴次数', label: '结伴次数', color: 'oklch(0.62 0.12 160)', type: 'bar' }]}
            />
          )}
        </CardContent>
      </Card>

      {/* 友谊固化提醒 */}
      {solidPairs.length > 0 && (
        <Card className="relative mb-5 overflow-hidden bg-accent/50">
          <span aria-hidden className="absolute left-1/2 top-0 h-2.5 w-24 -translate-x-1/2 rounded-b-md bg-[hsl(var(--candy-yellow)/.55)]" />
          <CardContent className="p-5">
            <div className="mb-2 flex items-center gap-2 text-[15px] font-medium text-amber-700 dark:text-amber-300">
              <TriangleAlert className="size-4" /> 友谊固化提醒
            </div>
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200/90">
              {solidPairs.map((p: any) => `「${p.an} 与 ${p.bn}」已结伴 ${p.cnt} 次`).join('；')}。
              建议关注其社交拓展，鼓励尝试新的玩伴。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 登记弹窗 */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>登记结伴签到</DialogTitle>
          </DialogHeader>
          {photoUrl && (
            <img src={photoUrl} alt="签到板照片" className="max-h-52 w-full rounded-xl border border-border object-contain" />
          )}
          <PairPicker picked={picked} onToggle={toggle} />
          <div>
            <Label htmlFor="ck-note">备注（可选）</Label>
            <Input id="ck-note" value={note} onChange={e => setNote(e.target.value)} placeholder="记录当日签到情况…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>取消</Button>
            <Button onClick={save} disabled={saving || picked.length < 2 || picked.length % 2 !== 0}>
              {saving && <Loader2 className="animate-spin" />} 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {stamp && <StampDone text="已记录" />}

      {/* 模拟数据弹窗 */}
      <Dialog open={demoModal} onOpenChange={setDemoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>生成模拟签到数据</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">
            将按<strong className="text-foreground">最近 N 周</strong>生成每日结伴签到（每周约5天），并附带少量区域倾听记录。
            所有数据带「演示」标记，不会和真实登记混淆，可随时一键清除。
          </p>
          <div>
            <Label htmlFor="demo-weeks">周数</Label>
            <Input
              id="demo-weeks" type="number" min={1} max={20}
              value={demoWeeks}
              onChange={e => setDemoWeeks(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemoModal(false)}>取消</Button>
            <Button onClick={seedDemo} disabled={seeding}>
              {seeding ? <Loader2 className="animate-spin" /> : <Wand2 />} 开始生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function chunkPairs(arr: number[]): number[][] {
  const out: number[][] = []
  for (let i = 0; i + 1 < arr.length; i += 2) out.push([arr[i], arr[i + 1]])
  return out
}
