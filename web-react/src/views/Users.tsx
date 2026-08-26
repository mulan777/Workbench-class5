import { useEffect, useState, useRef } from 'react'
import { api, upload } from '@/lib/api'
import { toast, confirmDialog } from '@/lib/ui'
import { useWorkspace } from '@/stores/workspace'
import { PageHeader } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Plus, Pencil, Trash2, Baby, Users2, ShieldCheck, ShieldOff, Camera, UploadCloud } from 'lucide-react'

type Student = { id: number; sid: string; name: string; avatar: string | null; active: number }
type Teacher = { id: number; username: string; displayName: string; role: string }

const CANDIES = ['pink', 'blue', 'green', 'yellow', 'purple'] as const
type Candy = typeof CANDIES[number]
function tint(c: Candy) {
  return {
    background: `hsl(var(--candy-${c}) / 0.15)`,
    color: `hsl(var(--candy-${c}))`,
    border: `1px solid hsl(var(--candy-${c}) / 0.35)`
  }
}

export default function Users() {
  const ws = useWorkspace()
  const [tab, setTab] = useState('students')

  // ===== 幼儿名单 =====
  const [students, setStudents] = useState<Student[]>([])
  const [stuLoading, setStuLoading] = useState(true)
  const [stuModal, setStuModal] = useState(false)
  const [editingStu, setEditingStu] = useState<Student | null>(null)
  const [stuForm, setStuForm] = useState<{ sid: string; name: string; avatar: string }>({ sid: '', name: '', avatar: '' })
  const [stuSaving, setStuSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===== 教师账号 =====
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [tchLoading, setTchLoading] = useState(true)
  const [tchModal, setTchModal] = useState(false)
  const [editingTch, setEditingTch] = useState<Teacher | null>(null)
  const [tchForm, setTchForm] = useState({ username: '', displayName: '', password: '', role: 'teacher' })
  const [tchSaving, setTchSaving] = useState(false)

  async function loadStudents() {
    setStuLoading(true)
    try {
      const list: any = await api('/api/students')
      setStudents(list)
    } catch (e: any) { toast.error(e.message) } finally { setStuLoading(false) }
  }
  async function loadTeachers() {
    setTchLoading(true)
    try {
      const list: any = await api('/api/teachers')
      setTeachers(list)
    } catch (e: any) { toast.error(e.message) } finally { setTchLoading(false) }
  }
  useEffect(() => {
    loadStudents()
    loadTeachers()
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res: any = await upload('/api/upload', fd)
      setStuForm(f => ({ ...f, avatar: res.url }))
      toast.success('照片上传成功')
    } catch (err: any) {
      toast.error('上传失败: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function saveStudent() {
    if (!stuForm.name.trim()) { toast.error('请输入幼儿姓名'); return }
    setStuSaving(true)
    try {
      if (editingStu) {
        await api('/api/students/' + editingStu.id, {
          method: 'PUT',
          body: JSON.stringify({
            name: stuForm.name.trim(),
            avatar: stuForm.avatar || null,
            ...(stuForm.sid.trim() ? { sid: stuForm.sid.trim() } : {})
          })
        })
        toast('已保存')
      } else {
        await api('/api/students', {
          method: 'POST',
          body: JSON.stringify({
            name: stuForm.name.trim(),
            avatar: stuForm.avatar || null,
            ...(stuForm.sid.trim() ? { sid: stuForm.sid.trim() } : {})
          })
        })
        toast('已添加')
      }
      setStuModal(false)
      await loadStudents()
      ;(ws as any).loadBase?.().catch(() => {})
    } catch (e: any) { toast.error(e.message) } finally { setStuSaving(false) }
  }

  async function removeStudent(s: Student) {
    const ok = await confirmDialog({
      title: `删除幼儿「${s.name}」？`,
      description: '若该幼儿已有签到/选区等记录，将转为「停用」（保留历史可追溯）；无记录则直接删除。',
      danger: true
    })
    if (!ok) return
    try {
      const r: any = await api('/api/students/' + s.id, { method: 'DELETE' })
      toast(r.deactivated ? `「${s.name}」已有记录，已转为停用` : '已删除')
      await loadStudents()
      ;(ws as any).loadBase?.().catch(() => {})
    } catch (e: any) { toast.error(e.message) }
  }

  async function restoreStudent(s: Student) {
    try {
      await api('/api/students/' + s.id, {
        method: 'PUT',
        body: JSON.stringify({ active: true })
      })
      toast(`「${s.name}」已恢复在册`)
      await loadStudents()
      ;(ws as any).loadBase?.().catch(() => {})
    } catch (e: any) { toast.error(e.message) }
  }

  function openAddStu() {
    setEditingStu(null)
    setStuForm({ sid: '', name: '', avatar: '' })
    setStuModal(true)
  }
  function openEditStu(s: Student) {
    setEditingStu(s)
    setStuForm({ sid: s.sid, name: s.name, avatar: s.avatar || '' })
    setStuModal(true)
  }

  // ===== 教师账号操作 =====
  async function saveTeacher() {
    if (!tchForm.username.trim()) { toast.error('请输入登录账号'); return }
    if (!tchForm.displayName.trim()) { toast.error('请输入教师姓名'); return }
    if (!editingTch && !tchForm.password.trim()) { toast.error('请输入初始密码'); return }
    setTchSaving(true)
    try {
      if (editingTch) {
        await api('/api/teachers/' + editingTch.id, {
          method: 'PUT',
          body: JSON.stringify({
            displayName: tchForm.displayName.trim(),
            role: tchForm.role,
            ...(tchForm.password.trim() ? { password: tchForm.password.trim() } : {})
          })
        })
        toast('教师信息已更新')
      } else {
        await api('/api/teachers', {
          method: 'POST',
          body: JSON.stringify({
            username: tchForm.username.trim(),
            displayName: tchForm.displayName.trim(),
            password: tchForm.password.trim(),
            role: tchForm.role
          })
        })
        toast('教师账号已创建')
      }
      setTchModal(false)
      await loadTeachers()
    } catch (e: any) { toast.error(e.message) } finally { setTchSaving(false) }
  }

  async function removeTeacher(t: Teacher) {
    const ok = await confirmDialog({
      title: `删除教师账号「${t.displayName} (${t.username})」？`,
      description: '删除后该账号将无法登录倾听工作台。',
      danger: true
    })
    if (!ok) return
    try {
      await api('/api/teachers/' + t.id, { method: 'DELETE' })
      toast('教师账号已删除')
      await loadTeachers()
    } catch (e: any) { toast.error(e.message) }
  }

  function openAddTch() {
    setEditingTch(null)
    setTchForm({ username: '', displayName: '', password: '', role: 'teacher' })
    setTchModal(true)
  }
  function openEditTch(t: Teacher) {
    setEditingTch(t)
    setTchForm({ username: t.username, displayName: t.displayName, password: '', role: t.role })
    setTchModal(true)
  }

  const activeStus = students.filter(s => s.active)
  const inactiveStus = students.filter(s => !s.active)

  return (
    <div>
      <PageHeader
        title="用户管理"
        desc="维护班级在册幼儿名单（支持自定义头像照片）与教师账号权限。"
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="students" className="gap-2">
            <Baby className="size-4" /> 幼儿名单 ({activeStus.length}人)
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2">
            <Users2 className="size-4" /> 教师账号 ({teachers.length}人)
          </TabsTrigger>
        </TabsList>

        {/* 幼儿名册 */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">中5班幼儿名单</CardTitle>
                <CardDescription>在册幼儿用于自主选区、签到配对、主题墙等；点击编辑可上传自定义照片头像。</CardDescription>
              </div>
              <Button onClick={openAddStu} className="gap-1.5">
                <Plus className="size-4" /> 添加幼儿
              </Button>
            </CardHeader>
            <CardContent>
              {stuLoading ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> 加载中…
                </div>
              ) : !students.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">暂无幼儿名单</div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {activeStus.map((s, idx) => {
                    const c = CANDIES[idx % CANDIES.length]
                    return (
                      <div
                        key={s.id}
                        className="group flex items-center justify-between rounded-xl border border-border bg-card p-3 transition hover:border-ring/50 hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-11 items-center justify-center rounded-2xl overflow-hidden text-base font-semibold shadow-xs"
                            style={tint(c)}
                          >
                            {s.avatar ? (
                              <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              s.name.slice(-1)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">{s.name}</span>
                              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                {s.sid}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {s.avatar ? '已设真实照片' : '默认首字头像'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStu(s)} title="编辑/更换头像">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeStudent(s)}
                            title="删除幼儿"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 停用列表 */}
              {inactiveStus.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">已停用幼儿（保留历史记录）：</div>
                  <div className="flex flex-wrap gap-2">
                    {inactiveStus.map(s => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        <span className="line-through">{s.sid} {s.name}</span>
                        <button
                          onClick={() => restoreStudent(s)}
                          className="text-primary hover:underline"
                          title="恢复在册"
                        >
                          恢复
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 教师账号 */}
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">教师账号列表</CardTitle>
                <CardDescription>管理能够登录工作台的教师账号与管理员权限。</CardDescription>
              </div>
              <Button onClick={openAddTch} className="gap-1.5">
                <Plus className="size-4" /> 添加教师
              </Button>
            </CardHeader>
            <CardContent>
              {tchLoading ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> 加载中…
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {teachers.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3.5 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                          {t.displayName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            {t.displayName}
                            <span className="font-mono text-xs text-muted-foreground">(@{t.username})</span>
                            {t.role === 'admin' ? (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 gap-1 border-0">
                                <ShieldCheck className="size-3" /> 管理员
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <ShieldOff className="size-3 opacity-60" /> 教师
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTch(t)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeTeacher(t)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 幼儿新增/编辑弹窗 */}
      <Dialog open={stuModal} onOpenChange={setStuModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStu ? '编辑幼儿信息' : '添加在册幼儿'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 头像上传/预览 */}
            <div className="flex flex-col items-center gap-2 pb-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative size-20 rounded-2xl overflow-hidden border-2 border-dashed border-border hover:border-primary cursor-pointer bg-accent/40 flex items-center justify-center group shadow-xs"
                title="点击上传幼儿照片"
              >
                {stuForm.avatar ? (
                  <img src={stuForm.avatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary">
                    <Camera className="size-6" />
                    <span className="text-[10px] mt-1">上传照片</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <span className="text-[11px] text-muted-foreground">
                支持上传真实生活照/登记照，儿童选区台将直接展示
              </span>
            </div>

            <div>
              <Label>学号（可选，留空自动顺延）</Label>
              <Input
                value={stuForm.sid}
                onChange={e => setStuForm(f => ({ ...f, sid: e.target.value }))}
                placeholder="如：01、02"
              />
            </div>
            <div>
              <Label>幼儿姓名 *</Label>
              <Input
                value={stuForm.name}
                onChange={e => setStuForm(f => ({ ...f, name: e.target.value }))}
                placeholder="如：朵朵"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStuModal(false)}>取消</Button>
            <Button onClick={saveStudent} disabled={stuSaving || uploading}>
              {stuSaving ? <Loader2 className="animate-spin" /> : null} 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 教师新增/编辑弹窗 */}
      <Dialog open={tchModal} onOpenChange={setTchModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTch ? '编辑教师账号' : '添加教师账号'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div>
              <Label>登录用户名 *</Label>
              <Input
                disabled={!!editingTch}
                value={tchForm.username}
                onChange={e => setTchForm(f => ({ ...f, username: e.target.value }))}
                placeholder="如：teacher04"
              />
            </div>
            <div>
              <Label>教师姓名 *</Label>
              <Input
                value={tchForm.displayName}
                onChange={e => setTchForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="如：林老师"
              />
            </div>
            <div>
              <Label>{editingTch ? '重置密码（留空不修改）' : '初始密码 *'}</Label>
              <Input
                type="password"
                value={tchForm.password}
                onChange={e => setTchForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingTch ? '••••••••' : '请输入密码'}
              />
            </div>
            <div>
              <Label>权限角色</Label>
              <Select value={tchForm.role} onValueChange={v => setTchForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="请选择角色" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">普通教师</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTchModal(false)}>取消</Button>
            <Button onClick={saveTeacher} disabled={tchSaving}>
              {tchSaving ? <Loader2 className="animate-spin" /> : null} 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
