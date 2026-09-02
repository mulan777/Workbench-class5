const AI_BASE_URL = process.env.ZT_AI_BASE_URL || ''
const AI_KEY = process.env.ZT_AI_KEY || ''
const PRIMARY_MODEL = process.env.ZT_AI_PRIMARY || ''
const FALLBACK_MODEL = process.env.ZT_AI_FALLBACK || ''
const FIRST_BYTE_TIMEOUT = 20000

function headers() { return { 'content-type': 'application/json', authorization: `Bearer ${AI_KEY}`, accept: 'text/event-stream' } }
async function fetchModel(body, model, signal) {
  return fetch(`${AI_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`, { method:'POST', headers:headers(), body:JSON.stringify({ ...body, model, stream:true }), signal })
}
async function choose(body) {
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), FIRST_BYTE_TIMEOUT)
  try { const res=await fetchModel(body, PRIMARY_MODEL, ac.signal); if(res.ok) return res; if([408,429].includes(res.status)||res.status>=500) return await fetchModel(body,FALLBACK_MODEL); return res }
  catch(e) { if(e.name!=='AbortError') console.error('[ai-primary]',e.message); return await fetchModel(body,FALLBACK_MODEL) }
  finally { clearTimeout(timer) }
}
function copyHeaders(reply,res) { reply.code(res.status); const ct=res.headers.get('content-type'); if(ct) reply.header('content-type',ct); reply.header('cache-control','no-cache, no-transform') }
function textFromSse(text) { let out=''; for(const line of text.split(/\r?\n/)) { if(!line.startsWith('data:')) continue; const raw=line.slice(5).trim(); if(!raw||raw==='[DONE]') continue; try { const j=JSON.parse(raw); out+=j.choices?.[0]?.delta?.content||j.choices?.[0]?.message?.content||'' } catch {} } return out }
async function pipe(reply,res,onDone) {
  if(!res.body) return reply.send()
  const reader=res.body.getReader(); let all=''
  const out=new ReadableStream({ async start(controller) { try { while(true) { const {done,value}=await reader.read(); if(done) break; all+=new TextDecoder().decode(value,{stream:true}); controller.enqueue(value) } } catch(e) { controller.error(e) } finally { controller.close(); if(onDone) await onDone(textFromSse(all)) } }, cancel(){reader.cancel().catch(()=>{})} })
  return reply.send(out)
}
function imagePrompt(paths, roster=[]) { const rosterText=roster.map(x=>`${x.sid}号=${x.name}`).join('、'); return { messages:[{role:'user',content:[{type:'text',text:`请分析这${paths.length}张幼儿园签到板图片。班级学号映射如下：${rosterText}。请优先识别图片中的学号，再依据学号匹配对应幼儿；不要凭相似姓名猜测。综合识别能看清的幼儿、结伴关系、日期或备注；多张图片中重复内容请合并。输出时姓名必须脱敏，只显示“姓+*”（例如张一诺显示张*）；可以同时输出学号。看不清的内容明确标注“无法确认”，不要猜测。请用中文分点输出，最后给出适合教师核对的简短提示。回答末尾追加机器可读标记，严格格式为 CHECKIN_IDS: {"sids":["01","02"],"pairs":[["01","02"]]}。sids填写图片中确认出现的学号，pairs只填写图片中明确属于同一组的学号，无法确认的不要填写。`},...paths.map(url=>({type:'image_url',image_url:{url}}))]}],temperature:0.1,max_tokens:1800,stream:true} }
async function analyze(app,reply,paths,createdBy,recordId) {
  const base=process.env.ZT_PUBLIC_BASE_URL||''
  const urls=paths.map(p=>{ if(p.startsWith('/uploads/')) { const ext=path.extname(p).toLowerCase(); const mime=ext==='.png'?'image/png':ext==='.webp'?'image/webp':ext==='.gif'?'image/gif':'image/jpeg'; return `data:${mime};base64,${fs.readFileSync(path.join(UPLOAD_DIR,path.basename(p))).toString('base64')}` } return p.startsWith('http')?p:(base+p) })
  const roster=app.db.prepare('SELECT sid,name FROM students WHERE active=1 ORDER BY CAST(sid AS INTEGER)').all().map(x=>({sid:x.sid,name:x.name ? x.name[0]+'*' : ''})); const result=await choose(imagePrompt(urls,roster)); copyHeaders(reply,result)
  if(!result.ok) return reply.send(await result.text())
  return pipe(reply,result,async content=>{ if(recordId) app.db.prepare("UPDATE checkin_ai_analyses SET content=?,updated_at=datetime('now') WHERE id=?").run(content,recordId); else { const info=app.db.prepare('INSERT INTO checkin_ai_analyses(image_paths,content,created_by) VALUES (?,?,?)').run(JSON.stringify(paths),content,createdBy); console.log('[ai-analysis] saved',info.lastInsertRowid) } })
}
export function registerAiRoutes(app) {
  const configured=()=>AI_BASE_URL && AI_KEY && PRIMARY_MODEL && FALLBACK_MODEL
  app.post('/v1/chat/completions',{preHandler:[app.auth]},async(req,reply)=>{ if(!configured())return reply.code(503).send({error:{message:'AI接口未配置完整'}}); const res=await choose(req.body||{}); copyHeaders(reply,res); if(!res.ok)return reply.send(await res.text()); return pipe(reply,res) })
  app.get('/api/checkin/uploaded-images',{preHandler:[app.auth]},async()=>{ const rows=app.db.prepare(`SELECT photo_path path,MIN(date) date,MAX(created_at) created_at FROM checkins WHERE photo_path IS NOT NULL AND photo_path<>'' GROUP BY photo_path ORDER BY created_at DESC`).all(); return rows })
  app.get('/api/checkin/analyses',{preHandler:[app.auth]},async()=>app.db.prepare('SELECT id,image_paths,content,created_at,updated_at FROM checkin_ai_analyses ORDER BY created_at DESC LIMIT 100').all().map(r=>({...r,image_paths:JSON.parse(r.image_paths)})))
  app.delete('/api/checkin/analyses/:id',{preHandler:[app.auth]},async(req,reply)=>{ const id=Number(req.params.id); const r=app.db.prepare('DELETE FROM checkin_ai_analyses WHERE id=?').run(id); if(!r.changes)return reply.code(404).send({error:'分析记录不存在'}); return {ok:true} })
  app.put('/api/checkin/analyses/:id',{preHandler:[app.auth]},async(req,reply)=>{ const id=Number(req.params.id),r=app.db.prepare('SELECT id FROM checkin_ai_analyses WHERE id=?').get(id); if(!r)return reply.code(404).send({error:'分析记录不存在'}); const content=String(req.body?.content||''); app.db.prepare("UPDATE checkin_ai_analyses SET content=?,updated_at=datetime('now') WHERE id=?").run(content,id); return {ok:true} })
  app.post('/api/checkin/analyze-existing',{preHandler:[app.auth]},async(req,reply)=>{ if(!configured())return reply.code(503).send({error:'AI接口未配置完整'}); const paths=[...new Set((req.body?.paths||[]).map(String))].filter(p=>/^\/uploads\/[\w.-]+$/.test(p)).slice(0,12); if(!paths.length)return reply.code(400).send({error:'请选择至少一张已上传图片'}); return analyze(app,reply,paths,Number(req.user.sub)||1) })
  app.post('/api/checkin/analyze',{preHandler:[app.auth]},async(req,reply)=>{ if(!configured())return reply.code(503).send({error:'AI接口未配置完整'}); const f=await req.file(); if(!f)return reply.code(400).send({error:'未收到签到图片'}); if(!/^image\/(png|jpe?g|webp|gif)$/i.test(f.mimetype||''))return reply.code(400).send({error:'仅支持 PNG/JPG/WebP/GIF 图片'}); const buf=await f.toBuffer(); if(buf.length>15*1024*1024)return reply.code(400).send({error:'图片不能超过15MB'}); const media=`data:${f.mimetype};base64,${buf.toString('base64')}`; return analyze(app,reply,[media],Number(req.user.sub)||1) })
}
