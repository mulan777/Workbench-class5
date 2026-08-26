import { useState } from 'react'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { toast } from 'sonner'
import { BookOpen, Sparkles, Heart, Quote } from 'lucide-react'

export default function Login() {
  const auth = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await auth.login(username, password)
      location.href = '/'
    } catch (err: any) {
      setError(err.message || '登录失败')
      toast.error(err.message || '登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-8 select-none">
      {/* 桌面背景氛围漫反射 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 45%, rgba(224,93,61,0.08) 0%, transparent 65%)',
        }}
      />

      {/* 3D 舞台 */}
      <div
        className="relative flex items-center justify-center"
        style={{ perspective: '2200px' }}
      >
        {/* =========================================================================
            【整本 3D 装订书本】
            书脊 (Spine) 是书本的中轴线：
            - 桌面端：
              * 闭合态：整本书居中偏移使 375px 封面位于视口正中央！(translate-x-0 配合居中封套)
              * 展卷态：整本书舒展居中，封面 180° 掀开并翻落到左侧！
        ========================================================================= */}
        <div
          className={`relative h-[500px] transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] sm:h-[530px] ${
            isOpen
              ? 'w-[330px] md:w-[750px]'
              : 'w-[330px] md:w-[375px]'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* =========================================================================
              1. 【右侧内页：教师登录】
                 - 桌面端：展开时占据右半边 (md:left-[375px] md:w-[375px])
                 - 闭合态时：完全被封面物理遮挡，并通过 opacity-0 防穿透
                 - 手机端：铺满整页 (inset-0 w-full)
          ========================================================================= */}
          <div
            className={`absolute inset-y-0 right-0 flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-opacity duration-300 md:left-[375px] md:right-auto md:w-[375px] md:rounded-l-none md:rounded-r-2xl md:border-l-0 md:p-8 ${
              isOpen
                ? 'pointer-events-auto opacity-100 delay-200'
                : 'pointer-events-none opacity-0'
            }`}
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 27px, hsl(var(--grid-line)/.45) 27px, hsl(var(--grid-line)/.45) 28px)',
              backgroundPosition: '0 16px',
            }}
          >
            {/* 桌面端中缝阴影 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-8 bg-gradient-to-r from-black/15 to-transparent md:block"
            />
            {/* 右侧叠纸厚度 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-3 right-1.5 w-[3px] rounded-r-sm bg-gradient-to-r from-stone-300 to-stone-400 opacity-50"
            />

            <div>
              <div className="mb-4 text-center">
                <div className="stamp-seal mx-auto mb-2 !h-13 !w-13 font-hand">
                  <span className="text-base font-bold leading-none">中5</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                  教师登录
                </h2>
                <p className="mt-1 font-hand text-xs text-muted-foreground">
                  翻开新的一页，记下今天的故事
                </p>
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                <div>
                  <Label htmlFor="username" className="text-xs text-muted-foreground">教师账号</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="请输入账号 (如 jie)"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus={isOpen}
                    className="mt-1 h-9.5 bg-background/90 focus-visible:!border-[hsl(var(--stamp))] focus-visible:!outline-[hsl(var(--stamp)/.55)] focus-visible:!ring-[hsl(var(--stamp)/.3)]"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-xs text-muted-foreground">通行密码</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="mt-1 h-9.5 bg-background/90 focus-visible:!border-[hsl(var(--stamp))] focus-visible:!outline-[hsl(var(--stamp)/.55)] focus-visible:!ring-[hsl(var(--stamp)/.3)]"
                  />
                </div>

                {error && (
                  <p className="animate-in fade-in rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="relative mt-2 w-full overflow-hidden !bg-[hsl(var(--stamp))] !text-white shadow-md transition-all hover:!bg-[hsl(var(--stamp-ink))] hover:shadow-lg active:scale-[0.97]"
                  size="default"
                  disabled={busy || !username || !password}
                >
                  {busy ? '登录中…' : '盖上章，进入'}
                </Button>
              </form>
            </div>

            {/* 底部合上本子返回封面 */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="font-hand text-xs text-muted-foreground transition hover:text-foreground hover:underline"
              >
                ← 合上本子，返回封面
              </button>
            </div>
          </div>

          {/* =========================================================================
              2. 【真实 3D 翻页单页 (The Turning Leaf)】
                 - 闭合态：位置在 left: 0，rotateY(0deg)，整本书只有这个 375px 的纯粹墨绿封面！
                 - 展开态：
                   * 桌面端：平滑平移至 left: 375px（中缝处），同时以左边缘为轴 rotateY(-180deg) 翻落到 0~375px！
                   * 门板背面（内衬扉页）自然朝上显露，与右侧登录页完美拼接为 750px 双页！
          ========================================================================= */}
          <div
            className={`absolute inset-y-0 left-0 z-30 h-full w-full transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] md:w-[375px] ${
              isOpen
                ? 'pointer-events-none md:left-[375px] md:[transform:rotateY(-180deg)] max-md:[transform:rotateY(-180deg)] max-md:opacity-0'
                : 'pointer-events-auto left-0 [transform:rotateY(0deg)]'
            }`}
            style={{
              transformOrigin: 'left center',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* -------------------------------------------------------------
                2A. 【封面正面：墨绿烫金皮面】(rotateY 0deg)
            ------------------------------------------------------------- */}
            <div
              onClick={() => !isOpen && setIsOpen(true)}
              className={`book-cover group absolute inset-0 flex h-full w-full cursor-pointer flex-col items-center justify-between rounded-2xl p-8 text-left shadow-[0_24px_50px_-10px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
                isOpen ? 'pointer-events-none shadow-none' : 'hover:scale-[1.015] active:scale-[0.99]'
              }`}
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              {/* 四周双层细金线压纹 (Gold Inlay) */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-3.5 rounded-xl border border-[#d9b877]/35 shadow-[inset_0_0_12px_rgba(0,0,0,0.2)]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-4 rounded-lg border border-dashed border-[#d9b877]/20"
              />

              {/* 斜射高级光影 */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[.2] via-transparent to-black/45"
              />

              {/* 纸页侧边叠层厚度 */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-3 right-2 h-[calc(100%-1.5rem)] w-[12px] rounded-sm shadow-[inset_-2px_0_4px_rgba(0,0,0,.2)]"
                style={{
                  background:
                    'linear-gradient(to right, #f7f1e3 0 30%, #dfd3ba 30% 65%, #baaa88 65% 100%)',
                }}
              />
              {/* 书脊锁线压痕与暗影 */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-8 rounded-l-2xl bg-black/25 shadow-[inset_-4px_0_8px_rgba(0,0,0,.35)]"
              />
              <span aria-hidden className="absolute inset-y-3 left-9 w-px bg-white/10" />

              {/* 顶部年份标语 */}
              <div className="relative z-10 w-full pl-6 text-right">
                <span className="font-hand text-xs tracking-widest text-[#ecd9a8]/75">
                  CLASS DIARY · 2026
                </span>
              </div>

              {/* 封面中央：烫金班名与印章 */}
              <div className="relative z-10 text-center">
                <div
                  className="stamp-seal mx-auto mb-4 !h-20 !w-20 flex-col !border-[#d9b877] font-hand !text-[#ecd9a8]"
                  style={{
                    background: 'transparent',
                    boxShadow:
                      'inset 0 0 0 1.5px rgba(0,0,0,.3), inset 0 0 0 3px rgba(217,184,119,.55)',
                  }}
                >
                  <span className="text-2xl font-bold leading-none">中5</span>
                </div>
                <h1
                  className="bg-gradient-to-b from-[#f9ebce] via-[#ebcf93] to-[#be944c] bg-clip-text font-serif text-[32px] font-semibold tracking-[.18em] text-transparent"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))' }}
                >
                  班级日志
                </h1>
                <p className="mt-3 font-hand text-base tracking-wider text-white/85">
                  中5班 · 倾听每一天
                </p>
              </div>

              {/* 底部翻开提示 */}
              <div className="relative z-10 flex w-full items-center justify-center pl-6">
                <span className="flex items-center gap-2 font-hand text-sm text-white/75 transition group-hover:scale-105 group-hover:text-white">
                  <BookOpen className="size-4 animate-pulse" /> 点击翻开日志
                </span>
              </div>
            </div>

            {/* -------------------------------------------------------------
                2B. 【封面反面：内衬扉页】(rotateY 180deg)
                翻到左侧后，完美成为双页的左半页！
            ------------------------------------------------------------- */}
            <div
              className="absolute inset-0 hidden h-full w-full flex-col justify-between overflow-hidden rounded-l-2xl border border-border/80 bg-card p-8 shadow-sm md:flex md:border-r-0"
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 27px, hsl(var(--grid-line)/.45) 27px, hsl(var(--grid-line)/.45) 28px)',
                backgroundPosition: '0 16px',
              }}
            >
              {/* 中缝折痕阴影（位于扉页右侧） */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-8 bg-gradient-to-l from-black/15 to-transparent md:block"
              />

              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="stamp-seal !h-10 !w-10 font-hand !border-[hsl(var(--stamp))] !text-[hsl(var(--stamp))]">
                      <span className="text-xs font-bold">中5</span>
                    </div>
                    <div>
                      <div className="font-serif text-sm font-bold text-foreground">中5班 · 班级日志</div>
                      <div className="font-hand text-xs text-muted-foreground">记录童年每一个发光的瞬间</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-accent/50 px-2.5 py-0.5 font-hand text-[11px] font-semibold text-accent-foreground">
                    2026 学年
                  </span>
                </div>

                {/* 温暖幼儿语录 */}
                <div className="mt-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4.5 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Quote className="size-3.5" />
                    <span>今日倾听微语</span>
                  </div>
                  <p className="mt-2.5 font-hand text-sm leading-relaxed text-foreground/85">
                    “老师，我今天搭了一座能通往月亮的积木桥，等月亮升起来，我们一起上去看星星好吗？”
                  </p>
                  <div className="mt-3 flex items-center justify-between font-hand text-xs text-muted-foreground">
                    <span>— 建构区 · 乐乐</span>
                    <span className="flex items-center gap-1 font-medium text-primary/80">
                      <Heart className="size-3 fill-current text-rose-400" /> 充满想象
                    </span>
                  </div>
                </div>
              </div>

              {/* 扉页底部：落款 */}
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 font-hand text-xs text-muted-foreground">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>倾听工作台 · 陪伴孩子自主成长</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
