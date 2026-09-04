import { useEffect, useState, useRef, useMemo } from 'react'
import { api, upload, todayStr, weekOf } from '@/lib/api'
import { toast } from '@/lib/ui'
import {
  Camera, UploadCloud, CheckCircle2, Sparkles, RefreshCw,
  Maximize, Minimize, Image as ImageIcon, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'

type Student = { id: number; sid: string; name: string; avatar: string | null }

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

export default function ChildPhotoUpload() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedKid, setSelectedKid] = useState<Student | null>(null)
  const [isMobileListOpen, setIsMobileListOpen] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successStamp, setSuccessStamp] = useState<{ name: string; photoUrl: string } | null>(null)
  const [childHistory, setChildHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const albumInputRef = useRef<HTMLInputElement>(null)

  async function loadStudents() {
    try {
      const res: any = await api('/api/area-selection/students')
      setStudents((res || []).filter((s: any) => s.active))
    } catch (e: any) {
      toast.error('加载名册失败')
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  useEffect(() => {
    if (!selectedKid) {
      setChildHistory([])
      return
    }
    setLoadingHistory(true)
    api(`/api/theme/theme1?studentId=${selectedKid.id}`)
      .then((items: any) => {
        setChildHistory(Array.isArray(items) ? items : [])
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [selectedKid])

  function handleSelectKid(kid: Student) {
    if (selectedKid?.id === kid.id) {
      setSelectedKid(null)
      setIsMobileListOpen(true)
    } else {
      setSelectedKid(kid)
      setIsMobileListOpen(false) // 手机端选完头像自动折叠，拍照区上移
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res: any = await upload('/api/upload', fd)
      setPreviewUrl(res.url)
      toast.success('照片已准备好！')
    } catch (err: any) {
      toast.error('照片处理失败: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.3)
    } catch (_) {}
  }

  async function handleSubmitPhoto() {
    if (!selectedKid) {
      toast.error('请先选择小朋友头像')
      return
    }
    if (!previewUrl) {
      toast.error('请先拍摄或选择照片')
      return
    }
    setSubmitting(true)
    const currentWeek = weekOf(todayStr())
    try {
      await api('/api/theme/theme1', {
        method: 'POST',
        body: JSON.stringify({
          week: currentWeek,
          section: 'oldTimes',
          type: '照片',
          studentId: selectedKid.id,
          photoPath: previewUrl,
          content: `${selectedKid.name} 的自主照片记录`,
          note: '儿童自主拍摄/上传'
        })
      })

      playBeep()
      setSuccessStamp({ name: selectedKid.name, photoUrl: previewUrl })
      
      const newRec = {
        id: Date.now(),
        photo_path: previewUrl,
        section: 'oldTimes',
        created_at: new Date().toISOString()
      }
      setChildHistory(prev => [newRec, ...prev])

      setTimeout(() => {
        setSuccessStamp(null)
        setPreviewUrl('')
        setIsMobileListOpen(true)
      }, 1800)

    } catch (e: any) {
      toast.error('上传保存失败: ' + e.message)
    } finally {
      setSubmitting(false)
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
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#be123c] text-white font-serif font-bold text-xl shadow-md ring-4 ring-[#ffe4e6]">
            中5
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#3c2f21] tracking-wide flex items-center gap-2">
              自主拍照台 <Camera className="size-5 text-[#e11d48] fill-[#e11d48]/20 animate-pulse" />
            </h1>
            <p className="text-[11px] text-[#8c7e6d]">点击头像 ➔ 拍照或选图 ➔ 点击发送，记录自动同步！</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#dfd7c2] shadow-2xs">
            <span className="text-xs text-[#8c7e6d]">在册幼儿</span>
            <span className="font-serif font-bold text-base text-[#be123c]">
              {students.length} <span className="text-xs font-normal text-[#8c7e6d]">人</span>
            </span>
          </div>

          <button
            onClick={() => loadStudents()}
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

      {/* 桌面重新排版：头像仅占左侧 4 列 (紧凑排布)，右侧 8 列超大面积聚焦拍照与大幅取景 */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 pt-4">
        {/* 左侧：选择头像 (桌面 4 列 / 手机折叠) */}
        <section className="lg:col-span-4 flex flex-col bg-white rounded-2xl sm:rounded-3xl border-2 border-[#dfd7c2] p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#f0ead8]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-[#3c2f21]">
                步骤 1：选头像
              </span>
              {selectedKid && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffe4e6] text-[#be123c] text-xs font-bold animate-pulse">
                  已选中：{selectedKid.name}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsMobileListOpen(o => !o)}
              className="lg:hidden flex items-center gap-1 text-xs text-[#be123c] font-bold bg-[#ffe4e6] px-2.5 py-1 rounded-lg"
            >
              {isMobileListOpen ? <>收起头像 <ChevronUp className="size-3.5" /></> : <>更换头像 <ChevronDown className="size-3.5" /></>}
            </button>
          </div>

          {/* 手机端折叠时显示当前选中条 */}
          {!isMobileListOpen && selectedKid && (
            <div
              onClick={() => setIsMobileListOpen(true)}
              className="lg:hidden flex items-center justify-between p-2.5 rounded-xl bg-[#fff1f2] border border-[#f43f5e]/30 cursor-pointer mb-1"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl overflow-hidden border border-[#be123c] flex items-center justify-center font-bold font-serif text-base" style={getCandyStyle(selectedKid.id, true)}>
                  {selectedKid.sid.replace(/^0+/, '') || selectedKid.sid || '?'}
                </div>
                <span className="font-bold text-sm text-[#be123c]">{selectedKid.name}</span>
              </div>
              <span className="text-xs text-[#8c7e6d] underline">点击更换</span>
            </div>
          )}

          {/* 头像列表 */}
          <div className={`flex-1 overflow-y-auto max-h-[260px] sm:max-h-[380px] lg:max-h-[calc(100vh-210px)] p-1 ${!isMobileListOpen ? 'hidden lg:flex' : 'flex'} flex-wrap content-start gap-2.5`}>
            {students.map((kid, idx) => {
              const isSelected = selectedKid?.id === kid.id
              return (
                <div
                  key={kid.id}
                  onClick={() => handleSelectKid(kid)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#ffe4e6] scale-105 ring-3 ring-[#e11d48] shadow-md z-10'
                      : 'hover:bg-[#fbf7ea] hover:scale-105 active:scale-95'
                  }`}
                >
                  <div className="relative size-12 sm:size-13 rounded-xl overflow-hidden border border-[#d8cdb5] shadow-2xs bg-[#faf6ee] flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold font-serif" style={getCandyStyle(kid.id)}>{kid.sid.replace(/^0+/, '') || kid.sid || '?'}</div>
                  </div>
                  <span className={`text-xs font-bold truncate max-w-[48px] text-center ${isSelected ? 'text-[#be123c]' : 'text-[#3c2f21]'}`}>
                    {kid.name}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* 右侧：超大主拍照取景与操作区 (桌面 8 列) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border-2 border-[#dfd7c2] p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            <div className="pb-3 border-b border-[#f0ead8] flex items-center justify-between">
              <span className="font-serif font-bold text-lg text-[#3c2f21]">
                步骤 2：拍照并发送
              </span>
              {previewUrl && (
                <span className="text-xs text-[#16a34a] font-bold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> 照片已就绪
                </span>
              )}
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={albumInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* 超大取景预览框 */}
            <div className="my-3 flex-1 min-h-[260px] sm:min-h-[340px] rounded-2xl border-2 border-dashed border-[#d8cdb5] bg-[#faf7ee] flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
              {uploading ? (
                <div className="flex flex-col items-center gap-2.5 text-[#be123c]">
                  <Loader2 className="size-10 animate-spin" />
                  <span className="text-sm font-bold">正在处理照片…</span>
                </div>
              ) : previewUrl ? (
                <div className="relative w-full h-full max-h-[420px] flex items-center justify-center bg-black/5">
                  <img src={previewUrl} alt="拍照预览" className="max-h-[420px] w-full object-contain" />
                  <button
                    onClick={() => setPreviewUrl('')}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs hover:bg-black/80 shadow transition"
                  >
                    重新拍摄
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="size-20 rounded-full bg-[#ffe4e6] text-[#be123c] flex items-center justify-center shadow-inner">
                    <Camera className="size-10" />
                  </div>
                  <div className="text-sm text-[#8c7e6d] font-medium">
                    {!selectedKid ? '（请先在左侧/上方选择你的头像）' : `为「${selectedKid.name}」拍摄一张美好的照片吧`}
                  </div>
                </div>
              )}
            </div>

            {/* 大号触控按钮组 */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  disabled={!selectedKid || uploading}
                  onClick={() => cameraInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-serif font-bold text-base transition shadow-sm ${
                    !selectedKid
                      ? 'bg-[#f4efe4] text-[#a89b88] cursor-not-allowed'
                      : 'bg-[#be123c] text-white hover:bg-[#9f1239] active:scale-98 shadow-md ring-3 ring-[#f43f5e]/30'
                  }`}
                >
                  <Camera className="size-5.5" /> 开启拍照
                </button>

                <button
                  type="button"
                  disabled={!selectedKid || uploading}
                  onClick={() => albumInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-serif font-bold text-base transition border shadow-sm ${
                    !selectedKid
                      ? 'bg-[#f4efe4] text-[#a89b88] cursor-not-allowed border-[#e2d8c3]'
                      : 'bg-white border-[#d8cdb5] text-[#4a3f31] hover:bg-[#fbf7ea] active:scale-98'
                  }`}
                >
                  <UploadCloud className="size-5.5" /> 从相册选
                </button>
              </div>

              <button
                type="button"
                disabled={!selectedKid || !previewUrl || submitting}
                onClick={handleSubmitPhoto}
                className={`w-full py-4.5 rounded-2xl font-serif font-bold text-lg flex items-center justify-center gap-2 transition shadow-md ${
                  !selectedKid || !previewUrl
                    ? 'bg-[#e7dfce] text-[#9c8e7b] cursor-not-allowed'
                    : 'bg-[#15803d] text-white hover:bg-[#166534] active:scale-98 animate-pulse shadow-lg'
                }`}
              >
                {submitting ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
                发送到「想念与重逢」
              </button>
            </div>
          </div>

          {/* 历史照片胶卷 */}
          {selectedKid && childHistory.length > 0 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-[#dfd7c2] p-3.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#f0ead8]">
                <span className="text-xs font-bold text-[#5c5243] flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-[#be123c]" /> 「{selectedKid.name}」的历史照片 ({childHistory.length})
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-2.5 overflow-x-auto p-1 max-h-20">
                {childHistory.slice(0, 10).map((item, idx) => (
                  <div key={item.id || idx} className="size-14 shrink-0 rounded-xl overflow-hidden border border-[#d8cdb5] shadow-2xs">
                    <img src={item.photo_path} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 上传成功浮层 */}
      {successStamp && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in">
          <div className="flex flex-col items-center justify-center rounded-3xl border-4 border-[#be123c] bg-white p-7 shadow-2xl scale-110 animate-bounce">
            <div className="size-22 rounded-2xl overflow-hidden border-2 border-[#be123c] shadow mb-2.5">
              <img src={successStamp.photoUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-3xl font-serif font-bold text-[#be123c]">
              {successStamp.name}
            </span>
            <span className="mt-1 text-base font-bold text-[#881337]">
              照片已成功收录！✨
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
