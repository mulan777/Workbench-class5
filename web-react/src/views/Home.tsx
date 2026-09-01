import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api, todayStr } from '@/lib/api'
import { useWorkspace } from '@/stores/workspace'
import { PageHeader, SkeletonCards, PageIn } from '@/components/shared'
import { TrendChart } from '@/components/TrendChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck, Users, HeartHandshake, Flame,
  TrendingUp, Inbox, Loader2, ArrowRight, Sparkles, Camera,
  UserCheck, CheckCircle2, Award, Calendar, Activity, ChevronRight
} from 'lucide-react'

const CANDIES = ['pink', 'blue', 'green', 'yellow', 'purple'] as const
type Candy = typeof CANDIES[number]
function tint(c: Candy) {
  return {
    background: `hsl(var(--candy-${c}) / 0.15)`,
    color: `hsl(var(--candy-${c}))`,
    border: `1px solid hsl(var(--candy-${c}) / 0.35)`
  }
}

export default function Home() {
  const [range, setRange] = useState(7)
  const ws = useWorkspace()
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [checkins, areaToday, areaRec, hot, t1, t2, stats] = await Promise.all([
        api(`/api/checkins?date=${ws.date}`),
        api(`/api/area-selection/today?date=${ws.date}`),
        api(`/api/area-records?range=${range}&end=${ws.date}`),
        api(`/api/troubles?week=${ws.week}`),
        api('/api/theme/theme1?week=' + ws.week),
        api('/api/theme/theme2?week=' + ws.week),
        api(`/api/checkins/stats?range=${range}&end=${ws.date}`)
      ])
      if (!alive) return

      const todaySelectedStus = new Set((areaToday.records || []).map((r: any) => r.student_id))
      const weekActiveKids = new Set<number>()
      ;(areaRec.records || []).forEach((r: any) => r.student_id && weekActiveKids.add(r.student_id))
      ;(t1 || []).forEach((r: any) => r.student_id && weekActiveKids.add(r.student_id))
      ;(t2 || []).forEach((r: any) => r.student_id && weekActiveKids.add(r.student_id))

      setData({
        todayCount: (checkins as any[]).length,
        todaySelectedCount: todaySelectedStus.size,
        weekTheme: (t1 as any[]).length,
        weekTheme2: (t2 as any[]).length,
        weekArea: (areaRec as any).records.length,
        weekHot: (hot as any).troubles.length,
        weekActiveKidsCount: weekActiveKids.size,
        topPairs: (stats as any).topPairs || [],
        recentAreaRecords: (areaToday.records || []).slice(0, 6),
        recentPhotos: (t1 || []).filter((i: any) => i.photo_path).slice(0, 8),
        totalStudents: ws.students.length || 25
      })
    })()
    return () => { alive = false }
  }, [ws.date, ws.week, ws.students, range])

  const topPairsList = useMemo(() => {
    return (data?.topPairs || []).slice(0, 10)
  }, [data?.topPairs])

  const cards = [
    {
      key: 'checkin',
      label: '今日签到',
      value: `${data?.todayCount ?? 0} 对`,
      hint: '每日结伴同到',
      icon: ClipboardCheck,
      to: '/checkin',
      edge: 'hsl(var(--candy-green))',
      chip: 'hsl(var(--candy-green) / .14)',
      ink: 'hsl(152 50% 34%)'
    },
    {
      key: 'area',
      label: '今日选区',
      value: `${data?.todaySelectedCount ?? 0} / ${data?.totalStudents ?? 25} 人`,
      hint: `全班 ${Math.round(((data?.todaySelectedCount ?? 0) / (data?.totalStudents || 25)) * 100)}% 完成`,
      icon: Users,
      to: '/area',
      edge: 'hsl(var(--candy-yellow))',
      chip: 'hsl(var(--candy-yellow) / .18)',
      ink: 'hsl(38 65% 36%)'
    },
    {
      key: 'theme1',
      label: '想念·重逢',
      value: `${data?.weekTheme ?? 0} 条`,
      hint: '第一、二周时光',
      icon: HeartHandshake,
      to: '/theme1',
      edge: 'hsl(var(--candy-pink))',
      chip: 'hsl(var(--candy-pink) / .14)',
      ink: 'hsl(350 55% 48%)'
    },
    {
      key: 'theme2',
      label: '好朋友故事',
      value: `${data?.weekTheme2 ?? 0} 条`,
      hint: '日常交往素材',
      icon: Sparkles,
      to: '/theme2',
      edge: 'hsl(var(--candy-purple))',
      chip: 'hsl(var(--candy-purple) / .14)',
      ink: 'hsl(262 45% 52%)'
    },
    {
      key: 'hot',
      label: '热点问题',
      value: `${data?.weekHot ?? 0} 个`,
      hint: '幼儿同理心互动',
      icon: Flame,
      to: '/hot',
      edge: 'hsl(var(--candy-blue))',
      chip: 'hsl(var(--candy-blue) / .16)',
      ink: 'hsl(204 55% 42%)'
    }
  ]

  return (
    <div className="space-y-6 pb-8">
      {/* 顶栏 */}
      <PageHeader
        title="总览"
        desc={`${ws.className}（共 ${data?.totalStudents ?? 25} 位在册幼儿）· ${todayStr()} · 第 ${ws.week} 周倾听总览`}
        action={
          <div className="flex items-center gap-3">
            <span className="stamp-seal !h-14 !w-14 flex-col font-hand" title={todayStr()}>
              <span className="text-[10px] font-medium leading-none opacity-80">
                {new Date().getMonth() + 1}月
              </span>
              <span className="text-xl font-bold leading-tight">{new Date().getDate()}</span>
              <span className="text-[9px] leading-none opacity-70">第{ws.week}周</span>
            </span>
          </div>
        }
      />

      <div className="mb-4 flex justify-end gap-1">{[[1,'当天'],[7,'7天'],[30,'30天']].map(([v,l])=><Button key={v} size="sm" variant={range===v?'default':'outline'} onClick={()=>setRange(v as number)}>{l}</Button>)}</div>

      {!data ? (
        <div className="space-y-5">
          <SkeletonCards n={5} />
          <Card>
            <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" /> 正在汇总全班倾听数据…
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* 1. 五联日志卡片（满格饱满） */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((c, i) => (
              <PageIn key={c.key} delay={i * 30}>
                <Link to={c.to} className="group block h-full">
                  <Card className="relative h-full overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 flex flex-col justify-between">
                    <div className="absolute inset-x-0 top-0 h-1" style={{ background: c.edge }} />
                    <div className="flex items-center justify-between">
                      <span
                        className="flex size-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 shadow-2xs"
                        style={{ background: c.chip, color: c.ink }}
                      >
                        <c.icon className="size-4.5" />
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </div>
                    <div className="mt-3.5">
                      <div className="font-serif text-2xl font-bold tracking-tight text-foreground">
                        {c.value}
                      </div>
                      <div className="text-xs font-semibold text-foreground/80 mt-0.5">{c.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{c.hint}</div>
                    </div>
                  </Card>
                </Link>
              </PageIn>
            ))}
          </div>

          {/* 2. 核心图表与数据双栏（饱满排布，消除空旷） */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 左侧 7 列：幼儿结伴网络分析图表 (完整展示 10 组 Top 伙伴) */}
            <div className="lg:col-span-7">
              <Card className="h-full flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4.5 text-primary" />
                      <CardTitle className="text-base font-serif font-bold">全班幼儿高频结伴榜</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      覆盖 25 人样本
                    </Badge>
                  </div>
                  <CardDescription>沉淀签到结伴、选区同组与游戏互动的默契交往频次</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                  {!topPairsList.length ? (
                    <div className="py-16 text-center text-xs text-muted-foreground">暂无结伴互动数据</div>
                  ) : (
                    <div className="space-y-4">
                      <TrendChart
                        data={topPairsList.map((p: any) => ({
                          name: `${p.an}·${p.bn}`,
                          次数: p.cnt
                        }))}
                        xKey="name"
                        series={[{ key: '次数', label: '结伴次数', color: 'oklch(0.68 0.15 245)', type: 'bar' }]}
                        height={240}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 右侧 5 列：今日选区动态与最新照片速览 */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* 今日选区动态速览 */}
              <Card className="flex-1">
                <CardHeader className="pb-2.5 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-serif font-bold flex items-center gap-1.5">
                      <Users className="size-4 text-[#ea580c]" /> 今日儿童选区速览
                    </CardTitle>
                    <CardDescription className="text-xs">
                      今日已选 {data.todaySelectedCount} 人 · 待选 {data.totalStudents - data.todaySelectedCount} 人
                    </CardDescription>
                  </div>
                  <Link to="/area" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    看大盘 <ChevronRight className="size-3" />
                  </Link>
                </CardHeader>
                <CardContent className="pt-3">
                  {!data.recentAreaRecords.length ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      今日暂无自主选区记录，可在选区大屏开始
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {data.recentAreaRecords.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-2 rounded-xl bg-accent/30 border border-border/50 text-xs">
                          <span className="font-semibold text-foreground">{r.student_name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.area}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 最新照片与作品素材 */}
              <Card className="flex-1">
                <CardHeader className="pb-2.5 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-serif font-bold flex items-center gap-1.5">
                      <Camera className="size-4 text-[#be123c]" /> 想念与重逢相册
                    </CardTitle>
                    <CardDescription className="text-xs">儿童自主拍照与时光记录</CardDescription>
                  </div>
                  <Link to="/theme1" className="text-xs text-[#be123c] hover:underline flex items-center gap-0.5">
                    进入板块 <ChevronRight className="size-3" />
                  </Link>
                </CardHeader>
                <CardContent className="pt-3">
                  {!data.recentPhotos.length ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      本周暂无照片上传
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 overflow-x-auto p-1">
                      {data.recentPhotos.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-border shadow-2xs group">
                          <img src={item.photo_path} alt="" className="w-full h-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] truncate text-center py-0.5">
                            {item.student_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
