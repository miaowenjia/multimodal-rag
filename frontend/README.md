# RAG-Vue 前端

基于 Vue3 + TypeScript + Vite 的多模态 RAG 前端控制台。

## 已完成功能

- GPT 风格布局
  - 左侧固定导航（导入文档 / 新建会话 / 系统设置）
  - 中部会话记录（搜索 + 原生滚动条 + 右侧 `⋯` 操作菜单）
- 会话能力
  - 新建会话、切换会话
  - 会话重命名、删除
  - 会话导出（Markdown / JSON）
  - 聊天记录保存在浏览器本地 `localStorage`
- 文档管理（已对接后端已实现接口）
  - `GET /api/health`
  - `GET /api/rag/documents`
  - `POST /api/rag/ingest`（`files[] + overwrite`）
  - `PUT /api/rag/documents/{document_id}`
  - `DELETE /api/rag/documents/{document_id}`
- 问答页（已对接后端已实现接口）
  - `POST /api/rag/ask`
  - `stream=true` 流式 token 渲染
  - `stream=false` 一次性 `answer + citations`
  - 引用展示：来源文件、页码、块位置、检索方式
- 系统设置（前端已实现，后端未实现接口会提示）
  - `config/model`
  - `config/reranker`
  - `config/retrieval`
  - `config/all`

## 目录说明

- `src/views/DocumentManagerView.vue`：文档管理页
- `src/views/ChatView.vue`：聊天页
- `src/views/SettingsView.vue`：系统设置页
- `src/stores/chat.ts`：会话状态与本地持久化
- `src/api/rag.ts`：后端接口封装
- `docs/unimplemented-backend-apis.md`：后端未实现接口说明

## 本地启动（Node）

1. 安装 Node.js（建议 22.x）
2. 执行：

```bash
npm ci
npm run dev
```

默认前端地址：`http://localhost:5173`

## Docker 开发模式（推荐协作）

已提供文件：

- `Dockerfile.dev`
- `docker-compose.yml`
- `.dockerignore`

启动：

```bash
docker compose up --build
```

停止：

```bash
docker compose down
```

启动后访问：`http://localhost:5173`

## 后端地址

默认后端地址：`http://localhost:8010`

可在“文档管理页 -> 基础连通与状态”中修改，并保存到浏览器本地存储。

## 如何修改前端 localhost 端口

请修改文件：`vite.config.ts`

当前配置：

```ts
server: {
  host: "localhost",
  port: 5173
}
```

例如改为 `3000`：

```ts
server: {
  host: "localhost",
  port: 3000
}
```

修改后重启服务（Node 或 Docker）。

## 给协作者的打包说明（可直接发整个项目）

### 你这边打包前建议

1. 先确认能构建：

```bash
npm ci
npm run build
```

2. 直接压缩整个项目目录即可（已包含 Docker 相关文件）。

### 协作者解压后运行

优先推荐 Docker：

```bash
docker compose up --build
```

如果不用 Docker：

```bash
npm ci
npm run dev
```

## 路由

- `/chat/:sessionId?`：聊天页（默认首页）
- `/documents`：文档管理页
- `/settings`：系统设置页
