import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = process.env.ZT_DATA_DIR || path.join(__dirname, '../../data')
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

export const db = new Database(path.join(DATA_DIR, 'workbench.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

// JWT secret：环境变量优先，否则生成并持久化
let JWT_SECRET = process.env.ZT_JWT_SECRET
if (!JWT_SECRET) {
  const f = path.join(DATA_DIR, '.jwt-secret')
  if (fs.existsSync(f)) JWT_SECRET = fs.readFileSync(f, 'utf8').trim()
  else {
    JWT_SECRET = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(f, JWT_SECRET, { mode: 0o600 })
  }
}
export { JWT_SECRET }

// 种子：教师账号 + 默认名册 + 班级名
function seed() {
  const tCount = db.prepare('SELECT COUNT(*) c FROM teachers').get().c
  if (tCount === 0) {
    const ins = db.prepare('INSERT INTO teachers(username,password_hash,display_name,role) VALUES (?,?,?,?)')
    ins.run('jie', bcrypt.hashSync('521ZiJi.', 10), '杰哥', 'admin')
    ins.run('teacher02', bcrypt.hashSync('521ZiJi.', 10), 'teacher02', 'teacher')
    ins.run('teacher03', bcrypt.hashSync('521ZiJi.', 10), 'teacher03', 'teacher')
    console.log('[seed] 已创建3个教师账号 jie/teacher02/teacher03 初始密码521ZiJi.')
  }
  const sCount = db.prepare('SELECT COUNT(*) c FROM students').get().c
  if (sCount === 0) {
    const names = ['朵朵','小宇','乐乐','欣欣','阳阳','果果','豆豆','甜甜','宁宁','安安','可可','童童','欢欢','迎迎','妮妮','贝贝','佳佳','圆圆','多多','暖暖']
    const ins = db.prepare('INSERT INTO students(sid,name) VALUES (?,?)')
    names.forEach((n, i) => ins.run(String(i + 1).padStart(2, '0'), n))
    console.log('[seed] 已创建默认20名幼儿名册')
  }
  const hasClass = db.prepare("SELECT COUNT(*) c FROM settings WHERE key='className'").get().c
  if (!hasClass) db.prepare("INSERT INTO settings(key,value) VALUES ('className','中5班')").run()
}
seed()
