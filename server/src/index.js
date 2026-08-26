import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { db, UPLOAD_DIR, JWT_SECRET } from './db.js'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'
import apiRoutes from './routes/api.js'
import fp from 'fastify-plugin'

const app = Fastify({ logger: false, bodyLimit: 2 * 1024 * 1024 })

await app.register(fastifyCookie)
await app.register(fastifyJwt, { secret: JWT_SECRET, cookie: { cookieName: 'zt_token' } })
await app.register(fp(async (inst) => {
  inst.decorate('db', db)
}))
await app.register(authPlugin)
await app.register(fastifyMultipart)
await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/' })

// 照片上传（multipart）
app.post('/api/upload', { preHandler: [app.auth] }, async (req, reply) => {
  const f = await req.file()
  if (!f) return reply.code(400).send({ error: '未收到文件' })
  const buf = await f.toBuffer()
  if (buf.length > 15 * 1024 * 1024) return reply.code(400).send({ error: '图片不能超过15MB' })
  const { saveUpload } = await import('./lib/util.js')
  try {
    const url = await saveUpload(buf, f.mimetype)
    return { url }
  } catch (e) {
    return reply.code(e.statusCode || 500).send({ error: e.message })
  }
})

await app.register(authRoutes)
await app.register(apiRoutes)

// 本地联调：ZT_SERVE_WEB=1 时由 Node 直接托管前端产物（生产由Caddy托管）
if (process.env.ZT_SERVE_WEB === '1') {
  const webDist = path.join(__dirname, '../../web/dist')
  await app.register(fastifyStatic, { root: webDist, prefix: '/', decorateReply: false })
}
app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) return reply.code(404).send({ error: '接口不存在' })
  if (process.env.ZT_SERVE_WEB === '1') {
    return reply.type('text/html').send(fs.readFileSync(path.join(__dirname, '../../web/dist/index.html')))
  }
  reply.code(200).type('text/html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/"></head></html>`)
})

const port = Number(process.env.ZT_PORT || 3100)
app.listen({ port, host: '127.0.0.1' }).then(() => {
  console.log(`[zhong5-api] listening on 127.0.0.1:${port}`)
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
