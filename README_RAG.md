# source RAG 项目说明

这是根据 `RAG项目技术路线梳理.md` 生成的第一版服务化 RAG 项目骨架。

## 当前能力

- FastAPI 服务入口
- SQLite 持久化文档与块信息
- Chroma 作为独立向量库
- PyMuPDF 解析 PDF
- 父子块与摘要索引
- OpenAI 协议兼容的 LLM / Embedding 接入
- SSE 流式问答接口
- 文档删除 API
- 文档更新 API
- 重复上传检测
- 同文件可选择覆盖更新

## 启动

1. 复制 `source/.env.template` 为 `.env`
2. 安装依赖：
   - `pip install -r requirements-rag.txt`
3. 启动服务：
   - `uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload`

## 接口

- `GET /api/health`
- `GET /api/rag/console`
  - 内置文档管理页面，可查看当前已入库文档并执行删除
- `POST /api/rag/ingest`
  - 支持 `overwrite` 表单字段
  - `overwrite=false`：同文件直接返回已有文档
  - `overwrite=true`：同文件先删旧索引再重建
- `PUT /api/rag/documents/{document_id}`
- `DELETE /api/rag/documents/{document_id}`
- `POST /api/rag/ask`
- `GET /api/rag/documents`

