const AREA_NAMES = ['美发店', '美工区', '益智区', '语言区', '建构区', '生活区', '科学区']
// 默认区域（含图标）：area_settings 表为空时作为种子数据写入
const DEFAULT_AREAS = [
  { name: '美发店', emoji: '💈' },
  { name: '美工区', emoji: '🎨' },
  { name: '益智区', emoji: '🧩' },
  { name: '语言区', emoji: '📚' },
  { name: '建构区', emoji: '🧱' },
  { name: '生活区', emoji: '🏠' },
  { name: '科学区', emoji: '🔬' }
]
export const AREA_TYPES = ['讲述', '绘画', '符号', '关键词', '前书写']
const TROUBLE_TAGS = ['想念老朋友', '想交新朋友但有点怕', '和朋友吵架了', '想一起玩被拒绝', '三个人怎么玩', '其他']

function seedAreas(db) {
  const c = db.prepare('SELECT COUNT(*) n FROM area_settings').get().n
  if (c === 0) {
    const ins = db.prepare('INSERT INTO area_settings(name,emoji,sort) VALUES (?,?,?)')
    DEFAULT_AREAS.forEach((a, i) => ins.run(a.name, a.emoji, i))
  }
}

export default async function miscRoutes(app) {
  // 区域管理
  app.get('/api/areas', { preHandler: [app.auth] }, async () => {
    return app.db.prepare('SELECT id,name,emoji,sort FROM area_settings ORDER BY sort,id').all()
  })
  app.post('/api/areas', { preHandler: [app.auth] }, async (req, reply) => {
    const name = String(req.body?.name || '').trim()
    const emoji = String(req.body?.emoji || '🧸').trim() || '🧸'
    if (!name) return reply.code(400).send({ error: '区域名称不能为空' })
    if (name.length > 20) return reply.code(400).send({ error: '区域名称过长' })
    try {
      const max = app.db.prepare('SELECT COALESCE(MAX(sort),-1) m FROM area_settings').get().m
      const info = app.db.prepare('INSERT INTO area_settings(name,emoji,sort) VALUES (?,?,?)').run(name, emoji, max + 1)
      return app.db.prepare('SELECT id,name,emoji,sort FROM area_settings WHERE id=?').get(info.lastInsertRowid)
    } catch (e) {
      return reply.code(400).send({ error: `区域「${name}」已存在` })
    }
  })
  app.put('/api/areas/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    const name = String(req.body?.name || '').trim()
    const emoji = String(req.body?.emoji || '').trim()
    if (!name) return reply.code(400).send({ error: '区域名称不能为空' })
    if (name.length > 20) return reply.code(400).send({ error: '区域名称过长' })
    const row = app.db.prepare('SELECT id FROM area_settings WHERE id=?').get(id)
    if (!row) return reply.code(404).send({ error: '区域不存在' })
    try {
      app.db.prepare('UPDATE area_settings SET name=?,emoji=? WHERE id=?')
        .run(name, emoji || undefined, id)
      return { ok: true }
    } catch (e) {
      return reply.code(400).send({ error: `区域「${name}」已存在` })
    }
  })
  app.delete('/api/areas/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    const row = app.db.prepare('SELECT name FROM area_settings WHERE id=?').get(id)
    if (!row) return reply.code(404).send({ error: '区域不存在' })
    const used = app.db.prepare('SELECT COUNT(*) n FROM area_records WHERE area=?').get(row.name).n
    if (used > 0) return reply.code(400).send({ error: `「${row.name}」下有 ${used} 条倾听记录，请先删除或移动这些记录` })
    app.db.prepare('DELETE FROM area_settings WHERE id=?').run(id)
    return { ok: true }
  })

  // 名册
  app.get('/api/students', { preHandler: [app.auth] }, async () => {
    return app.db.prepare('SELECT id,sid,name,avatar,active FROM students ORDER BY sid').all()
  })
  app.put('/api/students/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    const { sid, name, avatar, active } = req.body || {}
    if (!name || !String(name).trim()) return reply.code(400).send({ error: '姓名不能为空' })
    try {
      if (sid) app.db.prepare('UPDATE students SET sid=? WHERE id=?').run(String(sid), id)
      app.db.prepare('UPDATE students SET name=? WHERE id=?').run(String(name).trim(), id)
      if (avatar !== undefined) app.db.prepare('UPDATE students SET avatar=? WHERE id=?').run(avatar || null, id)
      if (active !== undefined) app.db.prepare('UPDATE students SET active=? WHERE id=?').run(active ? 1 : 0, id)
    } catch (e) {
      return reply.code(400).send({ error: '学号可能重复' })
    }
    return { ok: true }
  })
  app.post('/api/students', { preHandler: [app.auth] }, async (req, reply) => {
    const { sid, name, avatar } = req.body || {}
    if (!name || !String(name).trim()) return reply.code(400).send({ error: '姓名不能为空' })
    let newSid = sid
    if (!newSid) {
      const maxRow = app.db.prepare("SELECT MAX(CAST(sid AS INTEGER)) m FROM students").get()
      newSid = String((maxRow.m || 0) + 1).padStart(2, '0')
    } else {
      const dup = app.db.prepare('SELECT id FROM students WHERE sid=?').get(String(sid))
      if (dup) return reply.code(400).send({ error: `学号${sid}已存在` })
    }
    const info = app.db.prepare('INSERT INTO students(sid,name,avatar) VALUES (?,?,?)').run(newSid, String(name).trim(), avatar || null)
    return app.db.prepare('SELECT id,sid,name,avatar,active FROM students WHERE id=?').get(info.lastInsertRowid)
  })
  app.delete('/api/students/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    const usedIn = app.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM checkin_pairs WHERE student_a=? OR student_b=?) +
        (SELECT COUNT(*) FROM area_records WHERE student_id=?) +
        (SELECT COUNT(*) FROM theme_items WHERE student_id=?) +
        (SELECT COUNT(*) FROM troubles WHERE student_id=?) +
        (SELECT COUNT(*) FROM trouble_reactions WHERE student_id=?) n`).get(id, id, id, id, id, id).n
    if (usedIn > 0) {
      // 已有业务数据引用：只停用，保证历史记录可追溯
      app.db.prepare('UPDATE students SET active=0 WHERE id=?').run(id)
      return { ok: true, deactivated: true }
    }
    app.db.prepare('DELETE FROM students WHERE id=?').run(id)
    return { ok: true, deactivated: false }
  })

  // 教师管理
  app.get('/api/teachers', { preHandler: [app.auth] }, async () => {
    return app.db.prepare('SELECT id,username,display_name displayName,role FROM teachers ORDER BY id').all()
  })
  app.post('/api/teachers', { preHandler: [app.auth] }, async (req, reply) => {
    const b = req.body || {}
    const username = String(b.username || '').trim()
    const displayName = String(b.displayName || '').trim() || username
    const password = String(b.password || '')
    const role = b.role === 'admin' ? 'admin' : 'teacher'
    if (!username) return reply.code(400).send({ error: '账号不能为空' })
    if (!/^[a-zA-Z0-9_-]{2,24}$/.test(username)) return reply.code(400).send({ error: '账号限2-24位字母数字下划线或中划线' })
    if (password.length < 6) return reply.code(400).send({ error: '初始密码至少6位' })
    if (app.db.prepare('SELECT id FROM teachers WHERE username=?').get(username)) {
      return reply.code(400).send({ error: `账号「${username}」已存在` })
    }
    const bcrypt = (await import('bcryptjs')).default
    const info = app.db.prepare('INSERT INTO teachers(username,password_hash,display_name,role) VALUES (?,?,?,?)')
      .run(username, bcrypt.hashSync(password, 10), displayName, role)
    return app.db.prepare('SELECT id,username,display_name displayName,role FROM teachers WHERE id=?').get(info.lastInsertRowid)
  })
  app.put('/api/teachers/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    const t = app.db.prepare('SELECT * FROM teachers WHERE id=?').get(id)
    if (!t) return reply.code(404).send({ error: '教师不存在' })
    const b = req.body || {}
    const displayName = String(b.displayName ?? t.display_name).trim() || t.display_name
    const role = b.role === 'admin' ? 'admin' : (b.role === 'teacher' ? 'teacher' : t.role)
    // 唯一 admin 不允许自降权限，避免失去管理能力
    if (t.role === 'admin' && role !== 'admin') {
      const admins = app.db.prepare("SELECT COUNT(*) n FROM teachers WHERE role='admin'").get().n
      if (admins <= 1) return reply.code(400).send({ error: '系统至少需要保留一名管理员' })
    }
    let newPasswordHash = null
    if (b.newPassword) {
      if (String(b.newPassword).length < 6) return reply.code(400).send({ error: '新密码至少6位' })
      const bcrypt = (await import('bcryptjs')).default
      newPasswordHash = bcrypt.hashSync(String(b.newPassword), 10)
    }
    if (newPasswordHash) {
      app.db.prepare('UPDATE teachers SET display_name=?,role=?,password_hash=? WHERE id=?').run(displayName, role, newPasswordHash, id)
    } else {
      app.db.prepare('UPDATE teachers SET display_name=?,role=? WHERE id=?').run(displayName, role, id)
    }
    return { ok: true }
  })
  app.delete('/api/teachers/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    if (id === Number(req.user.sub)) return reply.code(400).send({ error: '不能删除当前登录的账号' })
    const t = app.db.prepare('SELECT * FROM teachers WHERE id=?').get(id)
    if (!t) return reply.code(404).send({ error: '教师不存在' })
    if (t.role === 'admin') {
      const admins = app.db.prepare("SELECT COUNT(*) n FROM teachers WHERE role='admin'").get().n
      if (admins <= 1) return reply.code(400).send({ error: '系统至少需要保留一名管理员' })
    }
    try {
      app.db.prepare('DELETE FROM teachers WHERE id=?').run(id)
    } catch (e) {
      // 该教师名下已有业务记录：改为禁用而非误删历史
      app.db.prepare('UPDATE teachers SET display_name=display_name WHERE id=?').run(id)
      return reply.code(400).send({ error: '该教师名下有业务记录，暂不支持删除，可修改其显示名' })
    }
    return { ok: true }
  })

  // 设置
  app.get('/api/settings', { preHandler: [app.auth] }, async () => {
    const rows = app.db.prepare('SELECT key,value FROM settings').all()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })
  app.put('/api/settings/:key', { preHandler: [app.auth] }, async (req, reply) => {
    if (!['className', 'currentStage'].includes(req.params.key)) return reply.code(400).send({ error: '不支持的设置项' })
    app.db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .run(req.params.key, String(req.body?.value ?? ''))
    return { ok: true }
  })

  // 签到
  app.get('/api/checkins', { preHandler: [app.auth] }, async (req) => {
    const date = req.query.date
    const rows = date
      ? app.db.prepare('SELECT * FROM checkins WHERE date=? ORDER BY created_at DESC').all(String(date))
      : app.db.prepare('SELECT * FROM checkins ORDER BY date DESC, created_at DESC LIMIT 100').all()
    const pairStmt = app.db.prepare(`
      SELECT p.id, pa.id aid, pa.name an, pb.id bid, pb.name bn
      FROM checkin_pairs p JOIN students pa ON pa.id=p.student_a JOIN students pb ON pb.id=p.student_b
      WHERE p.checkin_id=?`)
    return rows.map(c => ({ ...c, pairs: pairStmt.all(c.id) }))
  })
  app.post('/api/checkins', { preHandler: [app.auth] }, async (req, reply) => {
    const { date, photoPath, note, pairIds } = req.body || {}
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.code(400).send({ error: '日期格式错误' })
    if (!Array.isArray(pairIds)) return reply.code(400).send({ error: '配对数据缺失' })
    for (const [a, b] of pairIds) {
      if (!a || !b || a === b) return reply.code(400).send({ error: '配对数据有误' })
    }
    const tx = app.db.transaction(() => {
      const info = app.db.prepare('INSERT INTO checkins(date,photo_path,note,created_by) VALUES (?,?,?,?)')
        .run(date, photoPath || null, note || null, req.user.sub ? Number(req.user.sub) : 1)
      const ins = app.db.prepare('INSERT INTO checkin_pairs(checkin_id,student_a,student_b) VALUES (?,?,?)')
      for (const [a, b] of pairIds) ins.run(info.lastInsertRowid, a, b)
      return info.lastInsertRowid
    })
    const cid = tx()
    return { id: cid }
  })
  app.delete('/api/checkins/:id', { preHandler: [app.auth] }, async (req) => {
    app.db.prepare('DELETE FROM checkin_pairs WHERE checkin_id=?').run(Number(req.params.id))
    app.db.prepare('DELETE FROM checkins WHERE id=?').run(Number(req.params.id))
    return { ok: true }
  })
  // 统计：结伴频次 + 友谊固化
  app.get('/api/checkins/stats', { preHandler: [app.auth] }, async () => {
    const rows = app.db.prepare(`
      SELECT pa.name an, pb.name bn, pa.id aid, pb.id bid, COUNT(*) cnt,
             MIN(cp.rowid) since_id
      FROM checkin_pairs cp JOIN students pa ON pa.id=cp.student_a JOIN students pb ON pb.id=cp.student_b
      GROUP BY (CASE WHEN pa.id<pb.id THEN pa.id ELSE pb.id END), (CASE WHEN pa.id>pb.id THEN pa.id ELSE pb.id END) ORDER BY cnt DESC`).all()
    const weeksWith = app.db.prepare(`SELECT COUNT(DISTINCT c.date) d FROM checkins c`).get().d
    return { topPairs: rows.slice(0, 20), daysRecorded: weeksWith }
  })


  // 区域选区（儿童自主选区 & 今日选区分布）
  app.get('/api/area-selection/today', async (req, reply) => {
    seedAreas(app.db)
    const date = String(req.query?.date || new Date().toISOString().slice(0, 10))
    const week = Number(req.query?.week) || 1
    const areas = app.db.prepare('SELECT id,name,emoji,sort FROM area_settings ORDER BY sort,id').all()
    const students = app.db.prepare('SELECT id,sid,name,avatar FROM students WHERE active=1 ORDER BY sid').all()
    
    // 今日选区记录
    const records = app.db.prepare(`
      SELECT r.id, r.week, r.date, r.area, r.student_id, r.created_at, s.name student_name, s.avatar student_avatar, s.sid
      FROM area_records r
      JOIN students s ON s.id=r.student_id
      WHERE r.date=? OR (r.date IS NULL AND date(r.created_at)=?)`).all(date, date)

    return { date, week, areas, students, records }
  })

  // 儿童自主选区（拖拽提交 / 调整区域 / 移除）
  app.post('/api/area-selection/select', async (req, reply) => {
    const { studentId, area, date: reqDate, week: reqWeek } = req.body || {}
    const stuId = Number(studentId)
    if (!stuId) return reply.code(400).send({ error: '幼儿参数错误' })
    const stu = app.db.prepare('SELECT id,name,active FROM students WHERE id=?').get(stuId)
    if (!stu || !stu.active) return reply.code(400).send({ error: '该幼儿不存在或已停用' })

    const date = String(reqDate || new Date().toISOString().slice(0, 10))
    // 计算当前第几周 (默认按 2026-09-01 起算或前端传参)
    let week = Number(reqWeek)
    if (!week) {
      const d0 = new Date('2026-09-01T00:00:00')
      const target = new Date(date + 'T00:00:00')
      const diffDays = Math.floor((target.getTime() - d0.getTime()) / 86400000)
      week = Math.max(1, Math.min(20, Math.floor(diffDays / 7) + 1))
    }

    if (area === null || area === '') {
      // 撤回/取消今日选区
      app.db.prepare(`DELETE FROM area_records WHERE student_id=? AND (date=? OR (date IS NULL AND date(created_at)=?))`)
        .run(stuId, date, date)
      return { ok: true, removed: true }
    }

    const areaRow = app.db.prepare('SELECT id,name FROM area_settings WHERE name=?').get(String(area).trim())
    if (!areaRow) return reply.code(400).send({ error: '选区不存在' })

    const tx = app.db.transaction(() => {
      // 先清理今日该儿童已有选区记录（保证一人一天在一个区域）
      app.db.prepare(`DELETE FROM area_records WHERE student_id=? AND (date=? OR (date IS NULL AND date(created_at)=?))`)
        .run(stuId, date, date)

      const ins = app.db.prepare(`
        INSERT INTO area_records(week,date,area,student_id,type,created_by,created_at)
        VALUES (?,?,?,?,'自主选区',1,datetime('now'))`)
        .run(week, date, areaRow.name, stuId)
      return ins.lastInsertRowid
    })

    const recordId = tx()
    return { ok: true, id: recordId, area: areaRow.name, studentId: stuId }
  })

  // 区域选区
  app.get('/api/area-records', { preHandler: [app.auth] }, async (req) => {
    const week = Number(req.query.week)
    if (!week) return reply.code(400).send({ error: '缺少week' })
    seedAreas(app.db)
    const areas = app.db.prepare('SELECT name,emoji FROM area_settings ORDER BY sort,id').all()
    const rows = app.db.prepare(`
      SELECT r.*, s.name student_name, s.avatar student_avatar FROM area_records r LEFT JOIN students s ON s.id=r.student_id
      WHERE week=? ORDER BY created_at DESC`).all(week)
    return { areas: areas.map(a => a.name), areaMeta: areas, types: AREA_TYPES, records: rows }
  })
  app.post('/api/area-records', { preHandler: [app.auth] }, async (req, reply) => {
    const b = req.body || {}
    if (!app.db.prepare('SELECT id FROM area_settings WHERE name=?').get(b.area)) return reply.code(400).send({ error: '区域不存在' })
    if (!AREA_TYPES.includes(b.type)) return reply.code(400).send({ error: '回顾方式不存在' })
    const info = app.db.prepare(`INSERT INTO area_records(week,area,student_id,partner_name,type,q1,q2,q3,q4,content,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(Number(b.week), b.area, b.studentId || null, b.partnerName || null, b.type, b.q1 || '', b.q2 || '', b.q3 || '', b.q4 || '', b.content || '',
        req.user.sub ? Number(req.user.sub) : 1)
    return { id: info.lastInsertRowid }
  })
  app.put('/api/area-records/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    const row = app.db.prepare('SELECT * FROM area_records WHERE id=?').get(id)
    if (!row) return reply.code(404).send({ error: '记录不存在' })
    const b = req.body || {}
    if (b.area && !app.db.prepare('SELECT id FROM area_settings WHERE name=?').get(b.area)) return reply.code(400).send({ error: '区域不存在' })
    if (b.type && !AREA_TYPES.includes(b.type)) return reply.code(400).send({ error: '回顾方式不存在' })
    app.db.prepare(`UPDATE area_records SET week=?,area=?,student_id=?,partner_name=?,type=?,q1=?,q2=?,q3=?,q4=?,content=? WHERE id=?`)
      .run(
        Number(b.week ?? row.week),
        b.area ?? row.area,
        b.studentId !== undefined ? (b.studentId || null) : row.student_id,
        b.partnerName !== undefined ? (b.partnerName || null) : row.partner_name,
        b.type ?? row.type,
        b.q1 !== undefined ? b.q1 : row.q1,
        b.q2 !== undefined ? b.q2 : row.q2,
        b.q3 !== undefined ? b.q3 : row.q3,
        b.q4 !== undefined ? b.q4 : row.q4,
        b.content !== undefined ? b.content : row.content,
        id
      )
    return { ok: true }
  })
  app.delete('/api/area-records/:id', { preHandler: [app.auth] }, async (req) => {
    app.db.prepare('DELETE FROM area_records WHERE id=?').run(Number(req.params.id))
    return { ok: true }
  })

  // 议事会
  app.get('/api/council', { preHandler: [app.auth] }, async (req) => {
    const week = Number(req.query.week)
    return app.db.prepare(`
      SELECT c.*, t.display_name creator FROM council_records c LEFT JOIN teachers t ON t.id=c.created_by
      WHERE week=? ORDER BY created_at DESC`).all(week)
  })
  app.post('/api/council', { preHandler: [app.auth] }, async (req) => {
    const b = req.body || {}
    const info = app.db.prepare(`INSERT INTO council_records(week,source,evidence,proposal,reason,dissent,result,feedback,created_by)
      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(Number(b.week), b.source || '', b.evidence || '', b.proposal || '', b.reason || '', b.dissent || '', b.result || '', b.feedback || '',
        req.user.sub ? Number(req.user.sub) : 1)
    return { id: info.lastInsertRowid }
  })
  app.delete('/api/council/:id', { preHandler: [app.auth] }, async (req) => {
    app.db.prepare('DELETE FROM council_records WHERE id=?').run(Number(req.params.id))
    return { ok: true }
  })

  // 素材墙 theme1/2/3
  app.get('/api/theme/:wall', { preHandler: [app.auth] }, async (req) => {
    const wall = req.params.wall
    if (!['theme1', 'theme2', 'theme3'].includes(wall)) return reply.code(404).send({ error: '板块不存在' })
    const week = Number(req.query.week)
    const studentId = req.query.studentId ? Number(req.query.studentId) : null;
    const weekParam = req.query.week ? Number(req.query.week) : null;
    const rows = app.db.prepare(`
      SELECT ti.*, s.name student_name, s.avatar student_avatar FROM theme_items ti LEFT JOIN students s ON s.id=ti.student_id
      WHERE wall=? AND (? IS NULL OR week=?) AND (? IS NULL OR ti.student_id=?) ORDER BY ti.created_at DESC`).all(wall, weekParam, weekParam, studentId, studentId)
    return rows
  })
  app.post('/api/theme/:wall', { preHandler: [app.auth] }, async (req, reply) => {
    const wall = req.params.wall
    if (!['theme1', 'theme2', 'theme3'].includes(wall)) return reply.code(404).send({ error: '板块不存在' })
    const b = req.body || {}
    const info = app.db.prepare(`INSERT INTO theme_items(week,wall,section,type,student_id,friend_name,content,note,extra_json,photo_path,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(Number(b.week), wall, String(b.section), String(b.type), b.studentId || null, b.friendName || null,
        b.content || '', b.note || '', b.extraJson ? JSON.stringify(b.extraJson) : null, b.photoPath || null,
        req.user.sub ? Number(req.user.sub) : 1)
    return { id: info.lastInsertRowid }
  })

  app.put('/api/theme-item/:id', { preHandler: [app.auth] }, async (req, reply) => {
    const id = Number(req.params.id)
    const row = app.db.prepare('SELECT * FROM theme_items WHERE id=?').get(id)
    if (!row) return reply.code(404).send({ error: '素材不存在' })
    const b = req.body || {}
    
    app.db.prepare(`
      UPDATE theme_items
      SET section=?, type=?, student_id=?, content=?, note=?, photo_path=?
      WHERE id=?`)
      .run(
        b.section ?? row.section,
        b.type ?? row.type,
        b.studentId !== undefined ? (b.studentId || null) : row.student_id,
        b.content !== undefined ? b.content : row.content,
        b.note !== undefined ? b.note : row.note,
        b.photoPath !== undefined ? (b.photoPath || null) : row.photo_path,
        id
      )
    return { ok: true }
  })

  app.delete('/api/theme-item/:id', { preHandler: [app.auth] }, async (req) => {
    app.db.prepare('DELETE FROM theme_items WHERE id=?').run(Number(req.params.id))
    return { ok: true }
  })
  // 好朋友理由Top榜（theme2 friendReasons 全文聚合）
  app.get('/api/theme2/reasons-top', { preHandler: [app.auth] }, async () => {
    return app.db.prepare(`
      SELECT content text, COUNT(*) count FROM theme_items
      WHERE wall='theme2' AND section='friendReasons' AND content<>''
      GROUP BY content ORDER BY count DESC LIMIT 5`).all()
  })

  // 热点问题墙
  app.get('/api/troubles', { preHandler: [app.auth] }, async (req) => {
    const week = Number(req.query.week)
    const troubles = app.db.prepare(`
      SELECT t.*, s.name student_name FROM troubles t LEFT JOIN students s ON s.id=t.student_id
      WHERE week=? ORDER BY created_at DESC`).all(week)
    const reactions = app.db.prepare(`
      SELECT r.trouble_id tid, r.kind, COUNT(*) cnt FROM trouble_reactions r
      JOIN troubles t ON t.id=r.trouble_id WHERE t.week=? GROUP BY r.trouble_id, r.kind`).all(week)
    const tracking = app.db.prepare(`
      SELECT tr.* FROM trackings tr JOIN troubles t ON t.id=tr.trouble_id WHERE t.week=? ORDER BY tr.created_at DESC`).all(week)
    return { tags: TROUBLE_TAGS, troubles, reactions, tracking }
  })
  app.post('/api/troubles', { preHandler: [app.auth] }, async (req, reply) => {
    const b = req.body || {}
    if (!TROUBLE_TAGS.includes(b.tag)) return reply.code(400).send({ error: '分类不存在' })
    const info = app.db.prepare(`INSERT INTO troubles(week,tag,type,student_id,content,created_by) VALUES (?,?,?,?,?,?)`)
      .run(Number(b.week), b.tag, String(b.type || '教师代写'), b.studentId || null, b.content || '', req.user.sub ? Number(req.user.sub) : 1)
    return { id: info.lastInsertRowid }
  })
  app.post('/api/troubles/:id/react', { preHandler: [app.auth] }, async (req, reply) => {
    const kind = req.body?.kind
    if (!['empathy', 'vote'].includes(kind)) return reply.code(400).send({ error: '类型错误' })
    const sid = Number(req.body?.studentId)
    if (!sid) return reply.code(400).send({ error: '请选择幼儿' })
    try {
      app.db.prepare('INSERT INTO trouble_reactions(trouble_id,kind,student_id) VALUES (?,?,?)').run(Number(req.params.id), kind, sid)
    } catch (e) {
      return reply.code(400).send({ error: '该幼儿已投过票/共情过此项' })
    }
    return { ok: true }
  })
  app.delete('/api/troubles/:id', { preHandler: [app.auth] }, async (req) => {
    app.db.prepare('DELETE FROM trouble_reactions WHERE trouble_id=?').run(Number(req.params.id))
    app.db.prepare('DELETE FROM trackings WHERE trouble_id=?').run(Number(req.params.id))
    app.db.prepare('DELETE FROM troubles WHERE id=?').run(Number(req.params.id))
    return { ok: true }
  })
  app.post('/api/trackings', { preHandler: [app.auth] }, async (req) => {
    const b = req.body || {}
    const info = app.db.prepare('INSERT INTO trackings(trouble_id,content,created_by) VALUES (?,?,?)')
      .run(Number(b.troubleId), b.content || '', req.user.sub ? Number(req.user.sub) : 1)
    return { id: info.lastInsertRowid }
  })
  app.delete('/api/trackings/:id', { preHandler: [app.auth] }, async (req) => {
    app.db.prepare('DELETE FROM trackings WHERE id=?').run(Number(req.params.id))
    return { ok: true }
  })

  // ===== 演示模拟数据（一键生成 / 一键清除，仅操作 note 带标记的数据）=====
  const DEMO_TAG = '演示'
  const DEMO_QA = [
    ['我和乐乐在美工区做了贺卡', '和乐乐一起', '胶水总是粘不牢', '我们换了双面胶就粘住了'],
    ['我搭了一个很高的停车场', '和朵朵、小宇一起', '积木塔倒了两次', '下面用大块的积木就不倒了'],
    ['我在语言区看了恐龙书', '自己看的，后来果果也来了', '有一页看不懂', '问了老师，是恐龙在睡觉'],
    ['我们在娃娃家做饭', '和甜甜、安安一起', '锅不够用了', '我去建构区借了一个'],
    ['下棋输了有点不开心', '和童童一起', '总是他赢', '老师说下次轮流先走']
  ]
  const DEMO_CONTENT = [
    '能用完整句子讲述游戏过程，遇到问题愿意自己先尝试解决。',
    '与同伴分工明确，能主动分享材料，语言表达比上月更流畅。',
    '专注度高，能连续参与区域活动25分钟以上，遇到困难会寻求帮助。',
    '开始尝试用绘画符号记录自己的玩法，符号使用有创意。',
    '在同伴追问下能补充细节，回顾四问回答完整度提升。'
  ]
  function mulberry32(seed) {
    let a = seed
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  app.post('/api/demo/checkin-seed', { preHandler: [app.auth] }, async (req, reply) => {
    const weeks = Number(req.body?.weeks || 4)
    if (!(weeks >= 1 && weeks <= 20)) return reply.code(400).send({ error: '周数须在1-20之间' })
    const students = app.db.prepare('SELECT id FROM students WHERE active=1 ORDER BY sid').all()
    if (students.length < 4) return reply.code(400).send({ error: '在册幼儿不足4名' })
    seedAreas(app.db)
    const areaRows = app.db.prepare('SELECT name FROM area_settings ORDER BY sort,id').all()
    const areaNames = areaRows.map(a => a.name)
    const types = ['讲述', '绘画', '符号', '关键词', '前书写']
    // 固定随机种子：重复生成结果一致，便于验收
    const rnd = mulberry32(20260826)
    const today = new Date()
    const tx = app.db.transaction(() => {
      for (let w = 1; w <= weeks; w++) {
        for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
          const base = new Date(today.getTime() - (weeks - w) * 7 * 86400000 + dayIdx * 86400000)
          if (base.getTime() > today.getTime()) continue
          const date = base.toISOString().slice(0, 10)
          const exists = app.db.prepare("SELECT COUNT(*) n FROM checkins WHERE date=? AND note=?").get(date, DEMO_TAG).n
          if (exists > 0) continue
          // 洗牌取前8名幼儿两两配对（固定种子，前几名出现频率高→形成固化对）
          const pool = [...students]
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1))
            ;[pool[i], pool[j]] = [pool[j], pool[i]]
          }
          const picked = pool.slice(0, 8)
          const info = app.db.prepare('INSERT INTO checkins(date,photo_path,note,created_by) VALUES (?,NULL,?,1)').run(date, DEMO_TAG)
          const ins = app.db.prepare('INSERT INTO checkin_pairs(checkin_id,student_a,student_b) VALUES (?,?,?)')
          for (let k = 0; k + 1 < picked.length; k += 2) ins.run(info.lastInsertRowid, picked[k].id, picked[k + 1].id)
        }
        // 每周区域倾听模拟记录（q2 写入标记便于清除）
        const weekStart = new Date(today.getTime() - (weeks - w) * 7 * 86400000)
        if (weekStart.getTime() <= today.getTime()) {
          const nRec = 3 + Math.floor(rnd() * 3)
          for (let r = 0; r < nRec; r++) {
            const stu = students[Math.floor(rnd() * students.length)]
            const areaName = areaNames[Math.floor(rnd() * areaNames.length)]
            const qa = DEMO_QA[Math.floor(rnd() * DEMO_QA.length)]
            const content = DEMO_CONTENT[Math.floor(rnd() * DEMO_CONTENT.length)]
            const type = types[Math.floor(rnd() * types.length)]
            app.db.prepare(`INSERT INTO area_records(week,area,student_id,partner_name,type,q1,q2,q3,q4,content,created_by)
              VALUES (?,?,?,?,?,?,?,?,?,?,1)`)
              .run(w, areaName, stu.id, null, type, qa[0], DEMO_TAG, qa[2], qa[3], content)
          }
        }
      }
      return { ok: true }
    })
    return tx()
  })
  app.post('/api/demo/clear', { preHandler: [app.auth] }, async () => {
    const tx = app.db.transaction(() => {
      const ids = app.db.prepare('SELECT id FROM checkins WHERE note=?').all(DEMO_TAG)
      for (const c of ids) {
        app.db.prepare('DELETE FROM checkin_pairs WHERE checkin_id=?').run(c.id)
        app.db.prepare('DELETE FROM checkins WHERE id=?').run(c.id)
      }
      app.db.prepare("DELETE FROM area_records WHERE q1=? OR content=? OR q2=?").run(DEMO_TAG, DEMO_TAG, DEMO_TAG)
      return { ok: true, removedCheckins: ids.length }
    })
    return tx()
  })
}
