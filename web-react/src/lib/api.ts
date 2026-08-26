export async function api(path: string, opts: RequestInit = {}) {
  // 无 body 时不得携带 Content-Type:json，否则 Fastify 报 FST_ERR_CTP_EMPTY_JSON_BODY
  const hasBody = opts.body != null && opts.body !== ''
  const res = await fetch(path, {
    headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    credentials: 'same-origin',
    ...opts
  })
  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    if (!location.pathname.startsWith('/login')) {
      sessionStorage.setItem('zt_expired', '1')
      location.href = '/login'
    }
    throw new Error('未登录')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败(${res.status})`)
  return data
}

export async function upload(path: string, form: FormData) {
  const res = await fetch(path, { method: 'POST', body: form, credentials: 'same-origin' })
  if (res.status === 401) { location.href = '/login'; throw new Error('未登录') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 学期周：以2026-08-31为第1周起点，1~20周
export function weekOf(dateStr = todayStr()) {
  const d = new Date(dateStr + 'T00:00:00')
  const start = new Date('2026-08-31T00:00:00')
  const diff = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000)) + 1
  return Math.min(20, Math.max(1, diff))
}

export function fmtDate(s?: string | null) {
  if (!s) return ''
  const p = s.split('-')
  return p.length === 3 ? `${p[1]}月${p[2]}日` : s
}
