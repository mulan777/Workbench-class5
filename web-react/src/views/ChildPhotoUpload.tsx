import { useEffect, useRef, useState } from 'react'
import { api, upload, todayStr, weekOf } from '@/lib/api'
import { toast } from '@/lib/ui'
import {
  ArrowLeft, Camera, Check, Image as ImageIcon, Loader2, UserRound,
  Maximize, Minimize, RefreshCw, Sparkles
} from 'lucide-react'

type Student = { id: number; sid: string; name: string; avatar: string | null; active?: number }
type Phase = 'self' | 'camera' | 'preview' | 'done'
const CANDIES = ['pink', 'blue', 'green', 'yellow', 'purple'] as const

function candyStyle(id: number, selected = false) {
  const c = CANDIES[id % CANDIES.length]
  return {
    background: selected ? `hsl(var(--candy-${c}))` : `hsl(var(--candy-${c}) / .16)`,
    color: selected ? '#fff' : `hsl(var(--candy-${c}))`,
    borderColor: `hsl(var(--candy-${c}) / .46)`
  }
}

function Avatar({ kid, large = false, selected = false }: { kid: Student; large?: boolean; selected?: boolean }) {
  const n = kid.sid.replace(/^0+/, '') || kid.sid || '?'
  return <div className="flex flex-col items-center gap-2">
    <div className={`${large ? 'size-24 sm:size-28' : 'size-16 sm:size-20 md:size-24'} flex items-center justify-center rounded-3xl border-2 shadow-sm ${selected ? 'ring-4 ring-[#e11d48]/30' : ''}`} style={candyStyle(kid.id, selected)}>
      <UserRound className={`${large ? 'size-9 sm:size-11' : 'size-6 sm:size-7'} opacity-70`} strokeWidth={2.2} />
      <span className={`${large ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'} -ml-1 font-bold`}>{n}</span>
    </div>
    <span className={`${large ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'} max-w-28 truncate text-center font-bold text-[#3c2f21]`}>{kid.name}</span>
  </div>
}
export default function ChildPhotoUpload() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedKid, setSelectedKid] = useState<Student | null>(null)
  const [phase, setPhase] = useState<Phase>('self')
  const [previewUrl, setPreviewUrl] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function loadStudents() {
    try {
      const res: any = await api('/api/area-selection/students')
      setStudents((res || []).filter((s: Student) => s.active))
    } catch { toast.error('名册加载失败，请再试一次') }
  }
  useEffect(() => { loadStudents() }, [])

  async function chooseKid(kid: Student) {
    setSelectedKid(kid); setPreviewUrl(''); setPhase('camera')
    try {
      const items: any = await api(`/api/child-kiosk/photos/${kid.id}`)
      setHistory(Array.isArray(items) ? items.filter(i => i.photo_path) : [])
    } catch { setHistory([]) }
  }
  function backToSelf() { setSelectedKid(null); setPreviewUrl(''); setHistory([]); setPhase('self') }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res: any = await upload('/api/child-kiosk/upload', fd)
      setPreviewUrl(res.url); setPhase('preview'); toast.success('照片准备好了！')
    } catch (err: any) { toast.error('照片处理失败：' + err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  async function sendPhoto() {
    if (!selectedKid || !previewUrl || submitting) return
    setSubmitting(true)
    try {
      await api('/api/child-kiosk/photos', { method: 'POST', body: JSON.stringify({
        studentId: selectedKid.id, photoPath: previewUrl
      }) })
      setPhase('done')
      setTimeout(backToSelf, 2200)
    } catch (err: any) { toast.error('保存失败，请让老师帮忙再试一次') }
    finally { setSubmitting(false) }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(() => {})
    else document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {})
  }

  return <div className="min-h-screen overflow-x-hidden bg-[#faf6ee] px-3 py-3 text-[#2d2926] sm:px-5 sm:py-5 md:px-7">
    <header className="mx-auto flex max-w-6xl items-center justify-between border-b-2 border-[#e6decb] pb-3">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#be123c] font-serif text-xl font-bold text-white shadow-md ring-4 ring-[#ffe4e6]">中5</div>
        <div><h1 className="flex items-center gap-2 font-serif text-xl font-bold tracking-wide sm:text-2xl">自主拍照台 <Camera className="size-5 text-[#e11d48]" /></h1><div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#9a8065]"><span className={phase !== 'self' ? 'text-[#be123c]' : ''}>找自己</span><span>·</span><span className={phase === 'camera' || phase === 'preview' || phase === 'done' ? 'text-[#be123c]' : ''}>拍照</span><span>·</span><span className={phase === 'preview' || phase === 'done' ? 'text-[#be123c]' : ''}>发送</span></div></div>
      </div>
      <div className="flex items-center gap-2"><div className="hidden rounded-xl border border-[#dfd7c2] bg-white px-3 py-1.5 text-xs text-[#8c7e6d] shadow-sm sm:block">在册 <b className="ml-1 text-base text-[#be123c]">{students.length}</b> 人</div><button onClick={loadStudents} className="flex size-10 items-center justify-center rounded-xl border bg-white" title="刷新名册"><RefreshCw className="size-4" /></button><button onClick={toggleFullscreen} className="flex size-10 items-center justify-center rounded-xl border bg-white" title="全屏">{fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}</button></div>
    </header>

    {phase === 'self' && <main className="mx-auto flex min-h-[calc(100vh-112px)] max-w-6xl flex-col items-center justify-center py-5"><div className="mb-4 text-center"><div className="font-serif text-xl font-bold text-[#3c2f21] sm:text-2xl">先找到你的号码</div><div className="mt-1 text-sm text-[#9a8065]">点一下自己的小头像</div></div><div className="grid w-full grid-cols-5 gap-x-1 gap-y-3 sm:grid-cols-6 sm:gap-x-2 sm:gap-y-4 md:grid-cols-7 lg:grid-cols-8">{students.map(kid => <button key={kid.id} onClick={() => chooseKid(kid)} className="rounded-3xl p-2 transition hover:bg-white hover:shadow-md active:scale-95" aria-label={`选择${kid.name}`}><Avatar kid={kid} /></button>)}</div></main>}

    {phase === 'camera' && selectedKid && <main className="mx-auto flex min-h-[calc(100vh-112px)] max-w-4xl flex-col items-center justify-center py-5"><button onClick={backToSelf} className="mb-4 flex size-12 items-center justify-center self-start rounded-full border-2 border-[#dfd7c2] bg-white shadow-sm" aria-label="返回选择号码"><ArrowLeft className="size-6" /></button><div className="mb-5 flex flex-col items-center gap-2"><Avatar kid={selectedKid} large selected /><div className="font-serif text-xl font-bold text-[#3c2f21]">{selectedKid.name}，想留下什么呢？</div></div><button disabled={uploading} onClick={() => cameraRef.current?.click()} className="flex min-h-56 w-full max-w-xl flex-col items-center justify-center gap-3 rounded-3xl border-4 border-[#f6b7c6] bg-[#fff0f3] p-4 text-[#be123c] shadow-md transition hover:-translate-y-1 hover:bg-[#ffe4e9] active:scale-95 disabled:opacity-60"><span className="flex size-24 items-center justify-center rounded-full bg-[#be123c] text-white shadow-lg"><Camera className="size-12" /></span><span className="font-serif text-xl font-bold">拍一张</span><span className="text-sm font-medium text-[#a64b63]">对准作品，记录现在</span></button><input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />{uploading && <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#be123c]"><Loader2 className="size-5 animate-spin" />正在准备照片…</div>}{history.length > 0 && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#e5dac6] bg-white/70 px-3 py-2 text-xs text-[#8c7e6d]"><ImageIcon className="size-4 text-[#be123c]" />已经留下 {history.length} 张照片</div>}</main>}

    {phase === 'preview' && selectedKid && previewUrl && <main className="mx-auto flex min-h-[calc(100vh-112px)] max-w-4xl flex-col items-center justify-center py-5"><button onClick={() => setPhase('camera')} className="mb-4 flex size-12 items-center justify-center self-start rounded-full border-2 border-[#dfd7c2] bg-white shadow-sm" aria-label="重拍"><ArrowLeft className="size-6" /></button><div className="mb-4 text-center"><div className="font-serif text-xl font-bold text-[#3c2f21] sm:text-2xl">这张照片可以吗？</div><div className="mt-1 text-sm text-[#9a8065]">确认后会放进“想念与重逢”</div></div><div className="w-full max-w-2xl overflow-hidden rounded-3xl border-4 border-white bg-[#2d2926] shadow-2xl"><img src={previewUrl} alt={`${selectedKid.name}的照片`} className="max-h-[52vh] w-full object-contain" /></div><div className="mt-5 flex w-full max-w-2xl gap-3 sm:gap-5"><button onClick={() => setPhase('camera')} className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#dfd7c2] bg-white text-base font-bold text-[#665e52] shadow-sm"><RefreshCw className="size-5" />重拍</button><button disabled={submitting} onClick={sendPhoto} className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#15803d] text-base font-bold text-white shadow-lg disabled:opacity-60">{submitting ? <Loader2 className="size-6 animate-spin" /> : <Check className="size-6" />}发送照片</button></div></main>}

    {phase === 'done' && selectedKid && <main className="flex min-h-[calc(100vh-112px)] items-center justify-center py-5"><div className="flex w-full max-w-xl flex-col items-center rounded-[2rem] border-4 border-[#be123c] bg-white p-5 shadow-2xl sm:p-8"><Avatar kid={selectedKid} large selected /><div className="mt-3 flex items-center gap-2 font-serif text-2xl font-bold text-[#15803d] sm:text-3xl"><Check className="size-8" />照片收录好了！</div><div className="mt-2 flex items-center gap-1.5 text-sm text-[#8c7e6d]"><Sparkles className="size-4" />已经放进“想念与重逢”</div></div></main>}
  </div>
}
