# Workbench-class5 (中5班倾听工作台)

幼儿园中5班数字化倾听工作台系统。

## 🌟 核心特性
- **班级日志世界观**：米白纸面质感、朱砂印章视觉体系、糖果色胶囊与手写体儿童原话排布。
- **儿童自主选区大屏 (`/select`)**：支持儿童拖拽/点击头像自主完成区域选区，免登录独立交互。
- **儿童自主拍照上传台 (`/photo`)**：支持儿童点击头像调用原生摄像头/相册拍照回传，自动同步至主题墙。
- **想念·重逢（第一、二周）**：多维展示全班儿童照片、想念表达与重逢瞬间，支持单幼儿个案精准追踪与板块归类。
- **教师端数据总览**：多维统计卡片、Top10 高频同伴结伴榜图表、今日选区动态与相册速览。

## 🛠️ 技术栈
- **前端 (web-react)**: React 18 + TypeScript + Vite + TailwindCSS 4 + Radix UI + Recharts + Lucide Icons
- **后端 (server)**: Fastify 5 + better-sqlite3 + fastify-jwt + fastify-multipart + fastify-static

## 🚀 启动运行

### 后端
```bash
cd server
npm install
node src/index.js
```

### 前端
```bash
cd web-react
npm install
npm run dev
```
