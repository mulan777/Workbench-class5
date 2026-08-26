import { useEffect, useRef, useState } from 'react'
import { api, upload } from '@/lib/api'
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
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip
} from 'recharts'
import { Plus, Trash2, Camera, Image as ImageIcon, Award, Loader2 } from 'lucide-react'

type Item = any

export default function Theme2() {
  const ws = useWorkspace()
  const [items, setItems] = useState<Item[]>([])
  const [stamp, setStamp] = useState(false)
  const [reasonsTop, setReasonsTop] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [list, top] = await Promise.all([
      api(`/api/theme/theme2?week=${ws.week}`),
      api('/api/theme2/reasons-top')
    ])
    setItems(list as Item[])
    setReasonsTop(top as any[])
  }
  useEffect(() => { load().catch(e => toast.error(e.message)) }, [ws.week])

  function openAdd(t: string) {
    setForm({ type: t, studentId: '', friendId: '', content: '', mod: '' })
    setPhotoUrl('')
    setModal(true)
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', f)
    upload('/api/upload', fd)
      .then((d: any) => setPhotoUrl(d.url))
      .catch(err => toast.error(err.message))
      .finally(() => { setUploading(false); e.target.value = '' })
  }

  async function save() {
    try {
      await api('/api/theme/theme2', {
        method: 'POST',
        body: JSON.stringify({
          week: ws.week,
          section: form.type === '文字' ? 'friendReasons' : 'gameDaily',
          type: form.type,
          studentId: form.studentId || null,
          friendName: form.friendId ? ws.sidName(form.friendId).split(' ')[1] : '',
          content: form.content,
          note: form.mod || '',
          photoPath: photoUrl || null
        })
      })
      toast('素材已保存')
      setStamp(true)
      setTimeout(() => setStamp(false), 1700)
      setModal(false)
      await load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function del(id: number) {
    const ok = await confirmDialog({ title: '删除这条素材？', danger: true })
    if (!ok) return
    await api('/api/theme-item/' + id, { method: 'DELETE' })
    toast('已删除')
    load()
  }

  const gameDaily = items.filter(i => i.section === 'gameDaily')
  const friendReasons = items.filter(i => i.section === 'friendReasons')
  const chartData = reasonsTop.slice(0, 6).map((r, i) => ({
    name: r.text.length > 9 ? r.text.slice(0, 9) + '…' : r.text || `理由${i + 1}`,
    票数: r.count
  }))

  return (
    <div>
      <PageHeader
        title="主题墙二 · 我和好朋友的新故事"
        desc="收集合作游戏照片与合作作品，倾听「为什么他是我最好的朋友」。"
        action={
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            <div className="flex flex-wrap gap-2">
              {['合作作品', '活动照片', '画作', '文字'].map(t => (
                <Button key={t} variant="outline" size="sm" className="h-9" onClick={() => openAdd(t)}>
                  <Plus /> {t}
                </Button>
              ))}
            </div>
          </>
        }
      />
      <WkBar />

      {/* 好朋友游戏日常 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-[15px]">好朋友游戏日常</CardTitle>
          <CardDescription>合作游戏照片与作品，悬停可查看并删除</CardDescription>
        </CardHeader>
        <CardContent>
          {!gameDaily.length ? (
            <EmptyState icon={<ImageIcon />} title="暂无记录" hint="点右上角「活动照片 / 合作作品」上传第一份素材" />
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {gameDaily.map(i => (
                <PhotoTile key={i.id} item={i} onDelete={del} caption={`${i.student_name || ''} & ${i.friend_name || ''}`} uploading={uploading} />
              ))}
            </div>
          )}
          <div className="mt-2 space-y-2">
            {gameDaily.filter(x => x.content).map(i => (
              <TextRow key={'c' + i.id} tag={i.type} text={i.content} onDelete={() => del(i.id)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 好朋友的理由 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-[15px]">好朋友的理由</CardTitle>
          <CardDescription>幼儿原话实录</CardDescription>
        </CardHeader>
        <CardContent>
          {!friendReasons.length ? (
            <EmptyState icon={<ImageIcon />} title="暂无记录" hint="点右上角「文字」记录孩子眼中的好朋友" />
          ) : (
            <div className="divide-y divide-border">
              {friendReasons.map(i => (
                <div key={i.id} className="group flex gap-3 py-3 first:pt-0 last:pb-0">
                  <Badge variant="secondary" className="shrink-0">{i.type}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-hand text-[15px] leading-relaxed text-foreground/90">{i.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{i.student_name} → {i.friend_name}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 self-start text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive" onClick={() => del(i.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 理由 Top 图表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Award className="size-4 text-primary" /> 成为好朋友的理由 Top 5
          </CardTitle>
          <CardDescription>按原文重复次数统计 · 悬停查看完整理由</CardDescription>
        </CardHeader>
        <CardContent>
          {!chartData.length ? (
            <EmptyState icon={<Award />} title="暂无数据" hint="多记录几条「好朋友的理由」，相同原话会自动聚合排名" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-border" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <RTooltip cursor={{ fill: 'rgba(16,185,129,0.06)' }} formatter={(v: any) => [`${v} 次`, '重复']} />
                  <Bar dataKey="票数" fill="hsl(var(--primary))" radius={[0, 7, 7, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加弹窗 */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>添加{form.type}</DialogTitle></DialogHeader>
          {form.type !== '文字' && (
            <div>
              <Label>图片（可选）</Label>
              {!photoUrl ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-28 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input text-sm text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  {uploading ? '上传中…' : '点击选择图片'}
                </button>
              ) : (
                <img src={photoUrl} alt="" className="photo-card max-h-48 w-full cursor-pointer object-cover" onClick={() => fileRef.current?.click()} />
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>幼儿</Label>
              <Select value={form.studentId ? String(form.studentId) : undefined} onValueChange={v => setForm((f: any) => ({ ...f, studentId: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>{ws.students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.sid} {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>好朋友</Label>
              <Select value={form.friendId ? String(form.friendId) : undefined} onValueChange={v => setForm((f: any) => ({ ...f, friendId: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>{ws.students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.sid} {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>内容描述 / 幼儿原话</Label>
            <Textarea rows={3} value={form.content || ''} onChange={(e: any) => setForm((f: any) => ({ ...f, content: e.target.value }))} />
          </div>
          {form.type === '合作作品' && (
            <div>
              <Label>修改痕迹</Label>
              <Select value={form.mod || '_keep'} onValueChange={v => setForm((f: any) => ({ ...f, mod: v === '_keep' ? '' : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_keep">保留原样</SelectItem>
                  <SelectItem value="补画">补画</SelectItem>
                  <SelectItem value="重做">重做</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>取消</Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      {stamp && <StampDone text="已收录" />}
      </Dialog>
    </div>
  )
}

function PhotoTile({ item, onDelete, caption }: { item: Item; onDelete: (id: number) => void; caption: string; uploading?: boolean }) {
  return (
    <FadeIn>
      <div className="group relative">
        <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
          {item.photo_path ? (
            <img src={item.photo_path} alt={caption} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{item.content?.slice(0, 12) || '无图'}</div>
          )}
        </div>
        <Button
          variant="destructive" size="icon"
          className="absolute right-1.5 top-1.5 hidden h-7 w-7 group-hover:inline-flex"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
        <p className="mt-1.5 truncate text-center text-xs text-muted-foreground">{caption}</p>
      </div>
    </FadeIn>
  )
}

function TextRow({ tag, text, onDelete }: { tag: string; text: string; onDelete: () => void }) {
  return (
    <div className="group flex gap-3 rounded-xl bg-muted/50 px-3 py-2 transition hover:bg-muted">
      <Badge variant="secondary" className="shrink-0">{tag}</Badge>
      <p className="min-w-0 flex-1 font-hand text-[14px] leading-relaxed text-foreground/90">{text}</p>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
