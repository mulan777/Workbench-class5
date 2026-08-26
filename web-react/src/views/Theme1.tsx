import { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api, upload } from '@/lib/api'
import { toast, confirmDialog } from '@/lib/ui'
import { useWorkspace } from '@/stores/workspace'
import { PageHeader, WkBar, EmptyState, StampDone } from '@/components/shared'
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
  Plus, Trash2, Camera, Image as ImageIcon, HeartHandshake,
  Loader2, Sparkles, ExternalLink, Filter, Pencil, Users, Check,
  UserCheck, ChevronDown, Sparkle, X
} from 'lucide-react'

type Item = {
  id: number
  week: number
  wall: string
  section: 'oldTimes' | 'missingExpression' | 'reunionMoments'
  type: string
  student_id: number | null
  student_name: string | null
  student_avatar?: string | null
  friend_name: string | null
  content: string | null
  note: string | null
  photo_path: string | null
  created_at: string
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

export default function Theme1() {
  const ws = useWorkspace()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [stamp, setStamp] = useState(false)
  
  // 幼儿个案追踪筛选：'all' 为全班全览，数字为特定幼儿 id
  const [selectedKidFilter, setSelectedKidFilter] = useState<string>('all')

  // 添加/编辑素材弹窗
  const [modal, setModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [form, setForm] = useState<any>({})
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await api(`/api/theme/theme1?week=${ws.week}`)
      setItems((res || []) as Item[])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [ws.week])

  function openAdd(t: string) {
    setEditingItem(null)
    setForm({
      type: t,
      section: t === '想念信' ? 'missingExpression' : 'oldTimes',
      studentId: selectedKidFilter !== 'all' ? selectedKidFilter : '',
      content: '',
      note: ''
    })
    setPhotoUrl('')
    setModal(true)
  }

  function openEdit(item: Item) {
    setEditingItem(item)
    setForm({
      type: item.type,
      section: item.section,
      studentId: item.student_id ? String(item.student_id) : '',
      content: item.content || '',
      note: item.note || ''
    })
    setPhotoUrl(item.photo_path || '')
    setModal(true)
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', f)
    upload('/api/upload', fd)
      .then((d: any) => setPhotoUrl(d.url))
      .catch(err => toast.error(err.message))
      .finally(() => {
        setUploading(false)
        e.target.value = ''
      })
  }

  async function save() {
    try {
      if (editingItem) {
        await api('/api/theme-item/' + editingItem.id, {
          method: 'PUT',
          body: JSON.stringify({
            section: form.section,
            type: form.type,
            studentId: form.studentId ? Number(form.studentId) : null,
            content: form.content,
            note: form.note,
            photoPath: photoUrl || null
          })
        })
        toast('素材已更新')
      } else {
        await api('/api/theme/theme1', {
          method: 'POST',
          body: JSON.stringify({
            week: ws.week,
            section: form.section,
            type: form.type,
            studentId: form.studentId ? Number(form.studentId) : null,
            content: form.content,
            note: form.note,
            photoPath: photoUrl || null
          })
        })
        toast('素材已保存')
      }
      setStamp(true)
      setTimeout(() => setStamp(false), 1700)
      setModal(false)
      await load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function del(id: number) {
    const ok = await confirmDialog({ title: '删除这条素材？', danger: true })
    if (!ok) return
    await api('/api/theme-item/' + id, { method: 'DELETE' })
    toast('已删除')
    load()
  }

  async function moveSection(item: Item, targetSection: 'oldTimes' | 'missingExpression' | 'reunionMoments') {
    if (item.section === targetSection) return
    try {
      await api('/api/theme-item/' + item.id, {
        method: 'PUT',
        body: JSON.stringify({ section: targetSection })
      })
      toast(`已移动到「${targetSection === 'oldTimes' ? '旧时光留存' : targetSection === 'missingExpression' ? '想念表达' : '重逢瞬间'}」`)
      await load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // 经过幼儿个案筛选过滤后的列表
  const filteredItems = useMemo(() => {
    if (selectedKidFilter === 'all') return items
    const kidId = Number(selectedKidFilter)
    return items.filter(i => i.student_id === kidId)
  }, [items, selectedKidFilter])

  // 各板块数据
  const oldTimes = filteredItems.filter(i => i.section === 'oldTimes')
  const missing = filteredItems.filter(i => i.section === 'missingExpression')
  const reunion = filteredItems.filter(i => i.section === 'reunionMoments')

  // 统计每位幼儿的素材数量
  const kidStatsMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of items) {
      if (item.student_id) {
        map.set(item.student_id, (map.get(item.student_id) || 0) + 1)
      }
    }
    return map
  }, [items])

  const curKidObj = useMemo(() => {
    if (selectedKidFilter === 'all') return null
    return ws.students.find(s => s.id === Number(selectedKidFilter))
  }, [ws.students, selectedKidFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="想念·重逢（第一、二周）"
        desc="小班友谊延续与重逢：支持儿童自主拍照回传，教师归入旧时光留存、想念表达与重逢瞬间。"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/photo" target="_blank">
              <Button className="bg-[#be123c] text-white hover:bg-[#9f1239] shadow-sm gap-1.5 font-medium">
                <Camera className="size-4" /> 打开儿童拍照台 <ExternalLink className="size-3.5 opacity-70" />
              </Button>
            </Link>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            {['照片', '画作', '想念信'].map(t => (
              <Button key={t} variant="outline" size="sm" className="h-9" onClick={() => openAdd(t)}>
                <Plus className="size-3.5" /> 录入{t}
              </Button>
            ))}
          </div>
        }
      />
      <WkBar />

      {/* 幼儿个案追踪控制条 */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserCheck className="size-4 text-[#be123c]" />
              <span>幼儿个案追踪</span>
            </div>

            {/* 个案下拉选择框 */}
            <div className="w-56">
              <Select value={selectedKidFilter} onValueChange={setSelectedKidFilter}>
                <SelectTrigger className="h-9 font-medium bg-background border-border shadow-2xs">
                  <SelectValue placeholder="请选择追踪对象" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all" className="font-semibold text-primary">
                    <span className="flex items-center gap-2">
                      <Users className="size-3.5" /> 全班全览 ({items.length} 条记录)
                    </span>
                  </SelectItem>
                  {ws.students.map((s, idx) => {
                    const count = kidStatsMap.get(s.id) || 0
                    return (
                      <SelectItem key={s.id} value={String(s.id)}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{s.sid} {s.name}</span>
                          <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${count > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-bold' : 'text-muted-foreground'}`}>
                            {count > 0 ? `${count} 条` : '暂无'}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedKidFilter !== 'all' && curKidObj && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
                <span className="font-bold">正在追踪「{curKidObj.name}」</span>
                <span className="opacity-80">（共 {filteredItems.length} 条素材）</span>
                <button
                  onClick={() => setSelectedKidFilter('all')}
                  className="hover:bg-rose-200 dark:hover:bg-rose-900 rounded p-0.5"
                  title="切回全班"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {selectedKidFilter === 'all'
              ? `当前呈现全班本周 ${filteredItems.length} 条素材`
              : `仅展示「${curKidObj?.name}」的专属照片与记录`}
          </div>
        </CardContent>
      </Card>

      {/* 旧时光留存 */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20 border-b border-border/40">
          <div>
            <CardTitle className="text-[15px] flex items-center gap-2 font-serif font-bold">
              <ImageIcon className="size-4 text-primary" /> 旧时光留存 ({oldTimes.length})
            </CardTitle>
            <CardDescription>小班老照片、幼儿自主拍摄与活动合影；教师可直接切换归类或编辑描述。</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!oldTimes.length ? (
            <EmptyState
              icon={<ImageIcon />}
              title={selectedKidFilter === 'all' ? '暂无旧时光记录' : `「${curKidObj?.name}」暂无旧时光照片`}
              hint="儿童可通过自主拍照台上传，或点击右上角录入照片"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {oldTimes.map(item => (
                <div
                  key={item.id}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-2xs hover:border-primary/40 hover:shadow-md transition duration-200"
                >
                  <div className="aspect-square w-full bg-accent/20 overflow-hidden relative">
                    {item.photo_path ? (
                      <img
                        src={item.photo_path}
                        alt={item.student_name || ''}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                        {item.content || '无图记录'}
                      </div>
                    )}
                    {item.student_name && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium shadow-xs">
                        {item.student_name}
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    <p className="font-hand text-sm text-foreground/90 line-clamp-2 leading-relaxed">
                      {item.note || item.content || '幼儿自主上传照片'}
                    </p>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                      <Select
                        value={item.section}
                        onValueChange={(val: any) => moveSection(item, val)}
                      >
                        <SelectTrigger className="h-7 text-[11px] px-2 w-28 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oldTimes">旧时光留存</SelectItem>
                          <SelectItem value="missingExpression">想念表达</SelectItem>
                          <SelectItem value="reunionMoments">重逢瞬间</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)} title="编辑">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => del(item.id)} title="删除">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 想念表达 */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20 border-b border-border/40">
          <div>
            <CardTitle className="text-[15px] flex items-center gap-2 font-serif font-bold">
              <HeartHandshake className="size-4 text-primary" /> 想念表达 ({missing.length})
            </CardTitle>
            <CardDescription>记录幼儿对好朋友的想念信、想念画作与自述表达。</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!missing.length ? (
            <EmptyState
              icon={<HeartHandshake />}
              title={selectedKidFilter === 'all' ? '暂无想念表达' : `「${curKidObj?.name}」暂无想念表达`}
              hint="点击右上角「想念信」或将幼儿照片移入此板块"
            />
          ) : (
            <div className="divide-y divide-border/60">
              {missing.map(i => (
                <div key={i.id} className="group flex gap-3.5 py-3.5 first:pt-0 last:pb-0 items-start">
                  {i.photo_path && (
                    <img
                      src={i.photo_path}
                      alt=""
                      loading="lazy"
                      className="size-16 rounded-xl border border-border object-cover shrink-0 shadow-2xs"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{i.type}</Badge>
                      {i.student_name && (
                        <span className="font-semibold text-sm text-foreground">{i.student_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{i.created_at?.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 font-hand text-[15px] leading-relaxed text-foreground/90">
                      {i.content}
                    </p>
                    {i.note && (
                      <p className="mt-1 text-xs text-muted-foreground">备注/原话：「{i.note}」</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={i.section} onValueChange={(val: any) => moveSection(i, val)}>
                      <SelectTrigger className="h-7 text-[11px] px-2 w-28 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oldTimes">旧时光留存</SelectItem>
                        <SelectItem value="missingExpression">想念表达</SelectItem>
                        <SelectItem value="reunionMoments">重逢瞬间</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => del(i.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 重逢瞬间 */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20 border-b border-border/40">
          <div>
            <CardTitle className="text-[15px] flex items-center gap-2 font-serif font-bold">
              <Sparkles className="size-4 text-primary" /> 重逢瞬间 ({reunion.length})
            </CardTitle>
            <CardDescription>开学重新相见那一刻的惊喜合影与对话原话记录。</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!reunion.length ? (
            <EmptyState
              icon={<ImageIcon />}
              title={selectedKidFilter === 'all' ? '暂无重逢瞬间' : `「${curKidObj?.name}」暂无重逢瞬间`}
              hint="将开学重逢照片移入此板块或录入瞬间"
            />
          ) : (
            <div className="divide-y divide-border/60">
              {reunion.map(i => (
                <div key={i.id} className="group flex gap-3.5 py-3.5 first:pt-0 last:pb-0 items-start">
                  {i.photo_path && (
                    <img
                      src={i.photo_path}
                      alt=""
                      loading="lazy"
                      className="size-16 rounded-xl border border-border object-cover shrink-0 shadow-2xs"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">{i.type}</Badge>
                      {i.student_name && (
                        <span className="font-semibold text-sm text-foreground">{i.student_name}</span>
                      )}
                    </div>
                    <p className="mt-1 font-hand text-[15px] leading-relaxed text-foreground/90">{i.content}</p>
                    {i.note && <p className="mt-1 text-xs text-muted-foreground">幼儿原话：「{i.note}」</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={i.section} onValueChange={(val: any) => moveSection(i, val)}>
                      <SelectTrigger className="h-7 text-[11px] px-2 w-28 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oldTimes">旧时光留存</SelectItem>
                        <SelectItem value="missingExpression">想念表达</SelectItem>
                        <SelectItem value="reunionMoments">重逢瞬间</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => del(i.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑弹窗 */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑素材内容与归属' : `添加${form.type} · 想念与重逢`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            {(form.type === '照片' || form.type === '画作') && (
              <div>
                <Label>图片</Label>
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
                  <img
                    src={photoUrl}
                    alt=""
                    className="max-h-48 w-full cursor-pointer rounded-xl object-contain border border-border"
                    onClick={() => fileRef.current?.click()}
                  />
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>归入板块</Label>
                <Select value={form.section || 'oldTimes'} onValueChange={v => setForm((f: any) => ({ ...f, section: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oldTimes">旧时光留存</SelectItem>
                    <SelectItem value="missingExpression">想念表达</SelectItem>
                    <SelectItem value="reunionMoments">重逢瞬间</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>关联幼儿</Label>
                <Select value={form.studentId ? String(form.studentId) : undefined} onValueChange={v => setForm((f: any) => ({ ...f, studentId: Number(v) }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="请选择" /></SelectTrigger>
                  <SelectContent>
                    {ws.students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.sid} {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{form.type === '想念信' ? '信件内容' : '内容描述'}</Label>
              <Textarea
                rows={3}
                value={form.content || ''}
                onChange={(e: any) => setForm((f: any) => ({ ...f, content: e.target.value }))}
                placeholder={form.type === '想念信' ? '我想对___说……' : '记录幼儿的表达或照片说明…'}
              />
            </div>
            <div>
              <Label>幼儿原话 / 备注</Label>
              <Input value={form.note || ''} onChange={(e: any) => setForm((f: any) => ({ ...f, note: e.target.value }))} placeholder="如：我们在小班操场上拍的" />
            </div>
          </div>
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
