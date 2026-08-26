import crypto from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import { UPLOAD_DIR } from '../db.js'

export async function saveUpload(fileBuffer, mimetype) {
  if (!mimetype || !/^image\/(png|jpe?g|webp|gif|heic|heif)$/i.test(mimetype)) {
    const err = new Error('仅支持图片文件')
    err.statusCode = 400
    throw err
  }
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`
  await sharp(fileBuffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(UPLOAD_DIR, name))
  return `/uploads/${name}`
}

export function weekOf(dateStr = new Date()) {
  const d = typeof dateStr === 'string' ? new Date(dateStr + 'T00:00:00') : dateStr
  // 简单学期周：以2026-08-31(周一)为第1周起点，向前最多20周
  const start = new Date('2026-08-31T00:00:00')
  const diff = Math.floor((d.setHours(0, 0, 0, 0) - start.getTime()) / (7 * 86400000)) + 1
  return Math.min(20, Math.max(1, diff))
}
