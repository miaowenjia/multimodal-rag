# Docker 拉取与配置说明（云 API + 云端 Reranker 版）

本文针对你当前的开发策略进行了调整：

> 先使用阿里云 DashScope 的云 API 配置大模型、Embedding 和 Reranker，把应用先开发出来；后续再切换到你局域网中已经暴露接口的本地模型或本地 Reranker 服务。

因此这一版的部署目标是：

- Docker 里启动 **Chroma**、**RAG API 应用** 和 **前端 Web 应用**
- 不在 Docker Compose 中拉取 `vLLM` 镜像
- 不在 Docker Compose 中拉取本地 `reranker` 容器
- 大模型、Embedding 与 Reranker 统一通过 `.env` 指向阿里云兼容接口
- 前端通过 `Nginx` 托管静态资源，并反向代理 `/api` 到后端
- 后续切换本地模型或本地 Reranker 时，只需要改 `.env` 中的几个地址

---

## 1. 当前推荐部署结构

当前建议保留三个容器：

1. `chromadb`：向量数据库
2. `rag-api`：FastAPI 应用
3. `rag-web`：前端 Vue 应用（Nginx 托管）

模型服务部分当前按下面方式部署：

- 文本大模型：阿里云 DashScope OpenAI 兼容接口
- Embedding 模型：阿里云 DashScope OpenAI 兼容接口
- 可选视觉模型：阿里云 DashScope OpenAI 兼容接口
- Reranker：阿里云兼容接口中的 `qwen3-rerank-8b`

---

## 2. 向量数据库：Chroma

这是你要求使用 Docker 拉取，并且便于后续知识库增删查改与更新的部分。

### 2.1 拉取镜像

```bash
docker pull chromadb/chroma:0.6.3
```

### 2.2 启动命令

```bash
docker run -d \
  --name rag-chroma \
  -p 8000:8000 \
  -v /data/chroma:/chroma/chroma \
  chromadb/chroma:0.6.3
```

Windows 下把 `/data/chroma` 替换成你的本地路径映射即可。

### 2.3 代码中的对应配置

在 `source/app/core/config.py` 中对应：

- `chroma_host`
- `chroma_port`
- `chroma_collection`

当前默认值就是：

- `localhost:8000`
- collection：`rag_chunks`

---

## 3. 当前阶段的大模型、Embedding 与 Reranker 配置方式

这一版不再默认走本地 vLLM，而是优先走阿里云兼容接口。

你现在应该主要关注：

- `LLM_API_BASE`
- `LLM_API_KEY`
- `LLM_MODEL_NAME`
- `EMBEDDING_API_BASE`
- `EMBEDDING_API_KEY`
- `EMBEDDING_MODEL_NAME`
- `RERANKER_API_BASE`
- `RERANKER_API_KEY`
- `RERANKER_MODEL_NAME`

当前代码默认值已经改成适合云 API 开发的形式：

### 文本模型

- `LLM_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1`
- `LLM_MODEL_NAME=qwen-plus`

### Embedding 模型

- `EMBEDDING_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1`
- `EMBEDDING_MODEL_NAME=text-embedding-v3`

### 视觉模型（可选）

- `VISION_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1`
- `VISION_MODEL_NAME=qwen-vl-max-latest`
- `ENABLE_VISION=false`

### Reranker 模型

- `RERANKER_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1`
- `RERANKER_MODEL_NAME=qwen3-rerank-8b`
- `RERANKER_API_KEY` 默认可与 LLM / Embedding 共用同一个 API Key

也就是说，当前先把 API Key 配好，就可以先开发应用层。

---

## 4. .env 配置模板

你只需要在 `source/.env` 中填写阿里云的 API Key 即可。

最重要的配置建议如下：

```env
LLM_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=你的阿里云DashScope_API_Key
LLM_MODEL_NAME=qwen-plus

EMBEDDING_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_API_KEY=你的阿里云DashScope_API_Key
EMBEDDING_MODEL_NAME=text-embedding-v3

RERANKER_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
RERANKER_API_KEY=你的阿里云DashScope_API_Key
RERANKER_MODEL_NAME=qwen3-rerank-8b
RERANKER_TIMEOUT=60
```

如果你后续切换到局域网里的本地模型接口，只要改成：

```env
LLM_API_BASE=http://你的局域网模型地址/v1
LLM_MODEL_NAME=你的本地模型名

EMBEDDING_API_BASE=http://你的局域网Embedding地址/v1
EMBEDDING_MODEL_NAME=你的本地Embedding模型名

RERANKER_API_BASE=http://你的局域网Reranker地址/v1
RERANKER_MODEL_NAME=你的本地Reranker模型名
```

应用层代码不需要重写。

---

## 5. Docker Compose

我已经更新：

- `source/docker-compose.yml`

这一版 compose 做了三件事：

1. 启动 `Chroma`
2. 启动 `FastAPI` 应用
3. 启动 `Vue + Nginx` 前端应用

不包含：

- `vLLM`
- 本地 Embedding 服务
- 本地 `reranker` 容器

因为你当前明确要求：

> 先用云端 `qwen3-rerank` 做开发调试，后续再切本地部署的 Reranker。

### 启动方式

在 `source` 目录下执行：

```bash
docker compose up -d --build
```

### 查看服务状态

```bash
docker compose ps
```

正常情况下应看到三个服务：

- `rag-chroma`
- `rag-api`
- `rag-web`

---

## 6. 问答中的 Rerank 状态说明

当前问答接口已经支持在输出中明确告诉你是否经过 rerank。

### 非流式接口

`POST /api/rag/ask`

返回内容中除了：

- `answer`
- `citations`

还会额外包含：

- `rerank_status`

并且 `answer` 的开头会明确标出：

- 已执行 rerank
- 已降级，未成功执行 rerank
- 未执行 rerank

### 流式接口

SSE 流式输出时：

- 首先会输出一条 rerank 状态提示文本
- 最后还会输出一条 `rerank_status` 事件

这样你在开发和调试时可以直接判断：

- 当前是否真的调用了 reranker
- 是否发生了 fallback

---

## 7. 文档删除与更新 API

这一版我已经帮你把删除与更新链路补上了。

### 7.1 删除文档 API

接口：

```http
DELETE /api/rag/documents/{document_id}
```

当前删除逻辑包括：

1. 删除 Chroma 中该文档的向量
2. 删除 SQLite 中该文档的 chunks
3. 删除 SQLite 中该文档的 images
4. 删除 SQLite 中的 document 主记录
5. 删除磁盘上的原始 PDF
6. 删除磁盘上的提取图片文件

这意味着删除操作现在已经是“索引 + 元数据 + 文件”的完整清理。

---

### 7.2 更新文档 API

接口：

```http
PUT /api/rag/documents/{document_id}
```

上传一个新的 PDF 文件后，当前逻辑为：

1. 先删除旧文档的全部索引与记录
2. 再重新走一次入库流程
3. 返回旧文档 ID 和新文档 ID 的映射

这是第一版最简单、最稳妥的“替换式更新”。

---

## 8. 启动顺序建议

建议按下面顺序操作：

1. 配置 `source/.env`
2. 填入阿里云 DashScope API Key
3. 在 `source` 目录执行 `docker compose up -d`
4. 使用 `docker compose ps` 确认 `rag-api` 和 `rag-chroma` 已启动
5. 打开 `http://localhost:8010/docs`
6. 先测 `GET /api/health`
7. 再测 `POST /api/rag/ingest`
8. 再测 `POST /api/rag/ask`

---

## 9. 后续切换到本地模型 / 本地 Reranker 时怎么改

等你后面要切回局域网里的本地服务，只需要改 `.env`：

### 文本模型

```env
LLM_API_BASE=http://你的局域网大模型地址/v1
LLM_MODEL_NAME=你的本地模型名
```

### Embedding 模型

```env
EMBEDDING_API_BASE=http://你的局域网Embedding服务地址/v1
EMBEDDING_MODEL_NAME=你的本地Embedding模型名
```

### Reranker 模型

```env
RERANKER_API_BASE=http://你的局域网Reranker服务地址/v1
RERANKER_MODEL_NAME=你的本地Reranker模型名
```

如果你本地 Reranker 的协议不是 `/rerank`，届时再补一层适配即可。

---

## 10. 下一步我建议继续补的内容

现在这个项目已经具备：

- 云 API 开发模式
- Chroma Docker 化
- 云端 Reranker 调试模式
- 文档入库 / 问答 / 删除 / 更新
- Rerank 成功 / 降级状态可见

下一步最值得继续补的是：

1. `.env.template` 补齐新的 Reranker 配置
2. 单独的 Reranker 可用性测试接口
3. 前端页面中展示 `rerank_status`
4. 本地 Reranker 切换说明文档
