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
  const [stats, setStats] = useState<{ topPairs: any[]; daily:any[]; daysRecorded:number; start:string; end:string }>({ topPairs: [], daily: [], daysRecorded: 0, start:'', end:'' })
  const [range, setRange] = useState(1)
  const [modal, setModal] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const analysisRef = useRef<HTMLInputElement>(null)
  const [uploadedImages, setUploadedImages] = useState<{path:string;date:string;created_at:string}[]>([])
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [editingAnalysis, setEditingAnalysis] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [stamp, setStamp] = useState(false)
  const [analyzeChooser, setAnalyzeChooser] = useState(false)
  const [analyzeMode, setAnalyzeMode] = useState('new')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [list, st] = await Promise.all([
      api(`/api/checkins?date=${ws.date}`),
      api(`/api/checkins/stats?range=${range}&end=${ws.date}`)
    ])
    setRecords(list as Rec[])
    setStats(st as any)
    const [imgs, hist] = await Promise.all([api('/api/checkin/uploaded-images'), api('/api/checkin/analyses')])
    setUploadedImages(imgs as any); setAnalyses(hist as any)
  }
  useEffect(() => { load().catch(e => toast.error(e.message)) }, [ws.date, range])

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

  async function analyzeFile(file: File) {
    setAnalyzing(true); setAnalysis('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/checkin/analyze', { method: 'POST', body: fd, credentials: 'same-origin' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `分析失败(${res.status})`) }
      if (!res.body) throw new Error('分析接口没有返回内容')
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true }); const parts = buf.split('\n'); buf = parts.pop() || ''
        for (const line of parts) { if (!line.startsWith('data:')) continue; const raw=line.slice(5).trim(); if (!raw || raw==='[DONE]') continue; try { const j=JSON.parse(raw); const d=j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content || ''; if(d) setAnalysis(x=>x+d) } catch {} }
      }
    } catch (e: any) { toast.error(e.message) } finally { setAnalyzing(false) }
  }
  function onAnalyzePick(e: React.ChangeEvent<HTMLInputElement>) { const f=e.target.files?.[0]; if(f) analyzeFile(f); e.target.value='' }
  function toggleImage(path: string) { setSelectedImages(x => x.includes(path) ? x.filter(p => p !== path) : [...x, path]) }
  async function analyzeSelected() {
    if (!selectedImages.length) return
    setAnalyzing(true); setAnalysis('')
    try {
      const res=await fetch('/api/checkin/analyze-existing',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({paths:selectedImages})})
      if(!res.ok){const d=await res.json().catch(() => ({}));throw new Error(d.error||'分析失败')}
      const reader=res.body?.getReader(); if(!reader) throw new Error('分析接口没有返回内容'); const dec=new TextDecoder(); let buf=''
      while(true){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;const raw=line.slice(5).trim();if(!raw||raw==='[DONE]')continue;try{const j=JSON.parse(raw);const d=j.choices?.[0]?.delta?.content||j.choices?.[0]?.message?.content||'';if(d)setAnalysis(x=>x+d)}catch{}}}
      setSelectedImages([]); await load()
    }catch(e:any){toast.error(e.message)}finally{setAnalyzing(false)}
  }
  async function saveAnalysis(id:number){ await api('/api/checkin/analyses/'+id,{method:'PUT',body:JSON.stringify({content:editingText})}); setEditingAnalysis(null); await load(); toast('分析记录已保存') }
  async function deleteAnalysis(id:number){ const ok=await confirmDialog({title:'删除这条分析记录？',description:'删除后无法恢复。',danger:true}); if(!ok)return; await api('/api/checkin/analyses/'+id,{method:'DELETE'}); await load(); toast('分析记录已删除') }


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
            <input ref={analysisRef} type="file" accept="image/*" className="hidden" onChange={onAnalyzePick} />
            <Button variant="outline" onClick={() => setAnalyzeChooser(true)} disabled={analyzing}>{analyzing ? <Loader2 className="animate-spin" /> : <Wand2 />} {analyzing ? '分析中…' : '分析签到图片'}</Button>
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
              {uploading ? '上传中…' : '上传照片并登记'}
            </Button>
          </>
        }
      />

      <WkBar />

      {analyses.length > 0 && (
        <Card className="mb-5">
          <CardHeader><CardTitle className="text-[15px]">历史分析记录</CardTitle><CardDescription>按天归档，可回看、编辑或删除</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {analyses.map(a => (
              <div key={a.id} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{String(a.created_at).slice(0,10)} {String(a.created_at).slice(11,16)} · {a.image_paths.length} 张图片</span>
                  {editingAnalysis === a.id ? (
                    <div className="flex gap-2"><Button size="sm" onClick={() => saveAnalysis(a.id)}>保存</Button><Button size="sm" variant="outline" onClick={() => setEditingAnalysis(null)}>取消</Button></div>
                  ) : (
                    <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEditingAnalysis(a.id); setEditingText(a.content) }}>编辑</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAnalysis(a.id)}>删除</Button></div>
                  )}
                </div>
                {editingAnalysis === a.id ? <textarea value={editingText} onChange={e => setEditingText(e.target.value)} className="min-h-36 w-full rounded-lg border bg-background p-3 text-sm leading-7" /> : <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{a.content}</pre>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card className="mb-5 border-primary/20 bg-primary/5">
          <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-[15px]">签到图片分析</CardTitle><CardDescription>AI 已流式返回，请结合原图人工核对</CardDescription></div><Button variant="ghost" size="sm" onClick={() => setAnalysis('')}>清除</Button></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">{analysis}</pre></CardContent>
        </Card>
      )}

      {/* 当日记录 */}
      <Card className="mb-5">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-[15px]">当日签到（{fmtDate(ws.date)}）</CardTitle>
            <CardDescription>共 {records.length} 条记录</CardDescription>
          </div>

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
            <CardTitle className="text-[15px]">伙伴交往统计</CardTitle><div className="mt-2 flex gap-1">{[[1,'当天'],[7,'7天'],[30,'30天']].map(([v,l])=><Button key={v} size="sm" variant={range===v?'default':'outline'} onClick={()=>setRange(v as number)}>{l}</Button>)}</div>
            <CardDescription className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" /> {stats.start} 至 {stats.end} · 共 {stats.daysRecorded} 天有签到
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState icon={<Handshake />} title="暂无统计" hint="需要多日签到数据积累后自动生成，" />
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

      <Dialog open={analyzeChooser} onOpenChange={setAnalyzeChooser}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>分析签到图片</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setAnalyzeMode('new')} className="rounded-xl border p-4 text-left">上传新图片</button><button type="button" onClick={() => setAnalyzeMode('existing')} className="rounded-xl border p-4 text-left">分析已上传的图片（可多选）</button></div>{analyzeMode==='existing' && <div className="max-h-80 overflow-y-auto rounded-xl border p-3">{!uploadedImages.length ? <p>暂时没有已上传的签到图片</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{uploadedImages.map(im => <label key={im.path} className="cursor-pointer rounded-xl border p-2"><div className="relative"><img src={im.path} className="h-24 w-full rounded-lg object-cover" /><input type="checkbox" checked={selectedImages.includes(im.path)} onChange={() => toggleImage(im.path)} className="absolute right-2 top-2 size-4" /></div><div className="mt-1 text-xs">{fmtDate(im.date)}</div></label>)}</div>}</div>}<DialogFooter>{analyzeMode==='new' ? <Button onClick={() => { setAnalyzeChooser(false); analysisRef.current?.click() }}>选择图片</Button> : <Button onClick={() => { setAnalyzeChooser(false); analyzeSelected() }} disabled={analyzing || !selectedImages.length}>分析已选 {selectedImages.length} 张</Button>}</DialogFooter></DialogContent></Dialog>
      {stamp && <StampDone text="已记录" />}

    </div>
  )
}

function chunkPairs(arr: number[]): number[][] {
  const out: number[][] = []
  for (let i = 0; i + 1 < arr.length; i += 2) out.push([arr[i], arr[i + 1]])
  return out
}
