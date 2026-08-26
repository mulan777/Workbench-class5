import bcrypt from 'bcryptjs'

export default async function authRoutes(app) {
  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = req.body || {}
    if (!username || !password) return reply.code(400).send({ error: '请输入账号和密码' })
    const t = app.db.prepare('SELECT * FROM teachers WHERE username=?').get(String(username))
    if (!t || !bcrypt.compareSync(String(password), t.password_hash)) {
      return reply.code(401).send({ error: '账号或密码错误' })
    }
    const token = await reply.jwtSign({ sub: String(t.id), name: t.display_name, role: t.role }, { expiresIn: '7d' })
    reply.setCookie('zt_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 86400
    })
    return { id: t.id, username: t.username, displayName: t.display_name, role: t.role }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    reply.clearCookie('zt_token', { path: '/' })
    return { ok: true }
  })

  app.get('/api/auth/me', { preHandler: [app.auth] }, async (req) => {
    const t = app.db.prepare('SELECT id,username,display_name,role FROM teachers WHERE id=?').get(Number(req.user.sub))
    return t ? { id: t.id, username: t.username, displayName: t.display_name, role: t.role } : null
  })

  // 修改自己密码
  app.put('/api/auth/password', { preHandler: [app.auth] }, async (req, reply) => {
    const { oldPassword, newPassword } = req.body || {}
    const t = app.db.prepare('SELECT * FROM teachers WHERE id=?').get(Number(req.user.sub))
    if (!t || !bcrypt.compareSync(String(oldPassword || ''), t.password_hash)) {
      return reply.code(400).send({ error: '原密码错误' })
    }
    if (!newPassword || String(newPassword).length < 6) return reply.code(400).send({ error: '新密码至少6位' })
    app.db.prepare('UPDATE teachers SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(newPassword), 10), t.id)
    return { ok: true }
  })
}
