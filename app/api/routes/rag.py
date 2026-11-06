from __future__ import annotations

import asyncio
import json
from pathlib import Path
import tempfile
from urllib.parse import unquote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.document_repository import DocumentRepository
from app.schemas.rag import (
    AskRequest,
    AskResponse,
    BatchIngestResponse,
    ConfigAllResponse,
    ConfigUpdateResponse,
    IngestResponse,
    ModelConfigResponse,
    RetrievalConfigResponse,
    RerankerConfigResponse,
    UpdateDocumentResponse,
    UpdateModelConfigRequest,
    UpdateRetrievalConfigRequest,
    UpdateRerankerConfigRequest,
)
from app.services.config_service import ConfigService
from app.services.ingest_service import IngestService
from app.services.query_service import QueryService

router = APIRouter()

SUPPORTED_DOCUMENT_SUFFIXES = {".pdf", ".docx", ".doc"}


def _validate_document_suffix(filename: str, action: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_DOCUMENT_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"当前仅支持 PDF、DOC 和 DOCX {action}")
    return suffix


async def _ingest_single_upload(service: IngestService, upload: UploadFile, overwrite: bool) -> IngestResponse:
    file_name = upload.filename or "未命名文件"
    temp_path: Path | None = None

    try:
        suffix = _validate_document_suffix(file_name, "入库")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await upload.read())
            temp_path = Path(tmp.name)

        result = service.ingest_document(str(temp_path), original_file_name=file_name, overwrite=overwrite)
        return IngestResponse(**result, success=True, error=None)
    except HTTPException as exc:
        return IngestResponse(file_name=file_name, success=False, error=str(exc.detail))
    except Exception as exc:
        return IngestResponse(file_name=file_name, success=False, error=str(exc))
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()


@router.get("/console", response_class=HTMLResponse)
def rag_console():
    return """
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RAG 文档管理台</title>
  <style>
    :root {
      --bg: #10141f;
      --panel: rgba(17, 24, 39, 0.88);
      --panel-border: rgba(148, 163, 184, 0.18);
      --text: #ecf3ff;
      --muted: #8da2c0;
      --accent: #5eead4;
      --danger: #fb7185;
      --danger-dark: #be123c;
      --shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(94, 234, 212, 0.16), transparent 28%),
        radial-gradient(circle at top right, rgba(251, 113, 133, 0.12), transparent 24%),
        linear-gradient(180deg, #0b1020 0%, #111827 100%);
    }

    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 20px 80px;
    }

    .hero {
      margin-bottom: 24px;
      padding: 28px;
      border: 1px solid var(--panel-border);
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.94), rgba(15, 23, 42, 0.84));
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }

    .title {
      margin: 0 0 10px;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .desc {
      margin: 0;
      color: var(--muted);
      line-height: 1.8;
    }

    .toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      margin: 20px 0 16px;
      flex-wrap: wrap;
    }

    .status {
      color: var(--muted);
      font-size: 14px;
    }

    button {
      border: 0;
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: transform .15s ease, opacity .15s ease, background .2s ease;
    }

    button:hover { transform: translateY(-1px); }
    button:disabled { opacity: .55; cursor: not-allowed; transform: none; }

    .btn-refresh {
      background: linear-gradient(135deg, #5eead4, #2dd4bf);
      color: #062a28;
    }

    .btn-delete {
      background: linear-gradient(135deg, var(--danger), var(--danger-dark));
      color: #fff1f2;
    }

    .panel {
      border: 1px solid var(--panel-border);
      border-radius: 24px;
      overflow: hidden;
      background: var(--panel);
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      text-align: left;
      font-size: 13px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #9fb3d0;
      padding: 16px 18px;
      background: rgba(15, 23, 42, 0.75);
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }

    tbody td {
      padding: 18px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      vertical-align: top;
    }

    tbody tr:hover {
      background: rgba(148, 163, 184, 0.05);
    }

    .doc-name {
      font-weight: 700;
      margin-bottom: 6px;
      word-break: break-all;
    }

    .doc-id,
    .doc-time {
      color: var(--muted);
      font-size: 13px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: rgba(94, 234, 212, 0.12);
      color: var(--accent);
      border: 1px solid rgba(94, 234, 212, 0.2);
    }

    .empty {
      padding: 48px 20px;
      text-align: center;
      color: var(--muted);
    }

    .hint {
      margin-top: 14px;
      color: var(--muted);
      font-size: 13px;
    }

    @media (max-width: 760px) {
      thead { display: none; }
      table, tbody, tr, td { display: block; width: 100%; }
      tbody td { border-bottom: none; padding: 10px 16px; }
      tbody tr { border-bottom: 1px solid rgba(148, 163, 184, 0.1); padding: 10px 0; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1 class="title">RAG 文档管理台</h1>
      <p class="desc">这里可以查看当前数据库中已经入库的文档，并直接删除不需要的文档。删除时会同步清理数据库记录、向量索引和关联图片文件。</p>
    </section>

    <section class="hero" style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 10px; font-size: 20px;">系统设置接口状态</h2>
      <p class="desc" style="margin-bottom: 10px;">以下配置接口现已由后端实现，可直接供前端系统设置页联调使用。</p>
      <ul style="margin: 0; padding-left: 20px; color: var(--muted); line-height: 1.8;">
        <li><code>GET /api/rag/config/all</code></li>
        <li><code>GET /api/rag/config/model</code></li>
        <li><code>PUT /api/rag/config/model</code></li>
        <li><code>GET /api/rag/config/reranker</code></li>
        <li><code>PUT /api/rag/config/reranker</code></li>
        <li><code>GET /api/rag/config/retrieval</code></li>
        <li><code>PUT /api/rag/config/retrieval</code></li>
      </ul>
    </section>

    <div class="toolbar">
      <div id="status" class="status">正在加载文档列表...</div>
      <button class="btn-refresh" id="refreshBtn">刷新列表</button>
    </div>

    <section class="panel">
      <table>
        <thead>
          <tr>
            <th>文档</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="docTableBody">
          <tr><td colspan="4" class="empty">正在加载...</td></tr>
        </tbody>
      </table>
    </section>

    <div class="hint">访问地址：<code>/api/rag/console</code></div>
  </div>

  <script>
    const bodyEl = document.getElementById('docTableBody');
    const statusEl = document.getElementById('status');
    const refreshBtn = document.getElementById('refreshBtn');

    async function loadDocuments() {
      statusEl.textContent = '正在加载文档列表...';
      refreshBtn.disabled = true;
      bodyEl.innerHTML = '<tr><td colspan="4" class="empty">正在加载...</td></tr>';

      try {
        const response = await fetch('./documents');
        if (!response.ok) {
          throw new Error('文档列表获取失败');
        }

        const documents = await response.json();
        renderDocuments(documents);
        statusEl.textContent = `当前共 ${documents.length} 个已入库文档`;
      } catch (error) {
        bodyEl.innerHTML = `<tr><td colspan="4" class="empty">加载失败：${error.message}</td></tr>`;
        statusEl.textContent = '加载失败';
      } finally {
        refreshBtn.disabled = false;
      }
    }

    function renderDocuments(documents) {
      if (!documents.length) {
        bodyEl.innerHTML = '<tr><td colspan="4" class="empty">当前没有已入库文档</td></tr>';
        return;
      }

      bodyEl.innerHTML = documents.map((doc) => {
        const createdAt = new Date(doc.created_at).toLocaleString('zh-CN');
        return `
          <tr>
            <td>
              <div class="doc-name">${escapeHtml(doc.file_name)}</div>
              <div class="doc-id">ID：${doc.id}</div>
            </td>
            <td><span class="badge">${escapeHtml(doc.status || '未知')}</span></td>
            <td><div class="doc-time">${createdAt}</div></td>
            <td>
              <button class="btn-delete" onclick="deleteDocument(${doc.id}, '${escapeJs(doc.file_name)}')">删除文档</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    async function deleteDocument(documentId, fileName) {
      const confirmed = window.confirm(`确认删除文档“${fileName}”吗？\n\n这将同步删除数据库记录和向量索引，且不可恢复。`);
      if (!confirmed) {
        return;
      }

      statusEl.textContent = `正在删除文档：${fileName}`;
      try {
        const response = await fetch(`./documents/${documentId}`, { method: 'DELETE' });
        if (!response.ok) {
          let detail = '删除失败';
          try {
            const data = await response.json();
            detail = data.detail || detail;
          } catch (_) {}
          throw new Error(detail);
        }
        await loadDocuments();
      } catch (error) {
        statusEl.textContent = `删除失败：${error.message}`;
        window.alert(`删除失败：${error.message}`);
      }
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function escapeJs(value) {
      return String(value)
        .replaceAll('\\\\', '\\\\\\\\')
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"');
    }

    refreshBtn.addEventListener('click', loadDocuments);
    loadDocuments();
  </script>
</body>
</html>
    """


@router.post("/ingest", response_model=BatchIngestResponse)
async def ingest(
    files: list[UploadFile] = File(...),
    overwrite: bool = Form(False),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="请至少上传一个文件")

    service = IngestService(db)
    items: list[IngestResponse] = []

    for upload in files:
        items.append(await _ingest_single_upload(service, upload, overwrite))

    succeeded = sum(1 for item in items if item.success)
    failed = len(items) - succeeded
    return BatchIngestResponse(total=len(items), succeeded=succeeded, failed=failed, items=items)


@router.put("/documents/{document_id}", response_model=UpdateDocumentResponse)
async def update_document(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    suffix = _validate_document_suffix(file.filename, "更新")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        temp_path = Path(tmp.name)

    service = IngestService(db)
    try:
        return service.replace_document(document_id, str(temp_path), original_file_name=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    service = IngestService(db)
    try:
        return service.delete_document(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/config/model", response_model=ModelConfigResponse)
def get_model_config(db: Session = Depends(get_db)):
    service = ConfigService(db)
    return service.get_model_config()


@router.put("/config/model", response_model=ConfigUpdateResponse)
def update_model_config(payload: UpdateModelConfigRequest, db: Session = Depends(get_db)):
    service = ConfigService(db)
    try:
        return service.update_model_config(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/config/reranker", response_model=RerankerConfigResponse)
def get_reranker_config(db: Session = Depends(get_db)):
    service = ConfigService(db)
    return service.get_reranker_config()


@router.put("/config/reranker", response_model=ConfigUpdateResponse)
def update_reranker_config(payload: UpdateRerankerConfigRequest, db: Session = Depends(get_db)):
    service = ConfigService(db)
    try:
        return service.update_reranker_config(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/config/retrieval", response_model=RetrievalConfigResponse)
def get_retrieval_config(db: Session = Depends(get_db)):
    service = ConfigService(db)
    return service.get_retrieval_config()


@router.put("/config/retrieval", response_model=ConfigUpdateResponse)
def update_retrieval_config(payload: UpdateRetrievalConfigRequest, db: Session = Depends(get_db)):
    service = ConfigService(db)
    try:
        return service.update_retrieval_config(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/config/all", response_model=ConfigAllResponse)
def get_all_config(db: Session = Depends(get_db)):
    service = ConfigService(db)
    return service.get_all_config()


@router.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest, db: Session = Depends(get_db)):
    service = QueryService()
    if payload.stream:
        async def event_generator():
            answer, citations, images, _ = await service.generate_answer(payload.question)
            yield f"data: {json.dumps({'type': 'token', 'content': answer}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0)
            yield f"data: {json.dumps({'type': 'citations', 'content': citations}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0)
            if images:
                yield f"data: {json.dumps({'type': 'images', 'content': images}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0)
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    answer, citations, images, rerank_status = await service.generate_answer(payload.question)
    return AskResponse(answer=answer, citations=citations, images=images, rerank_status=rerank_status)


@router.get("/images/{image_id:path}")
def get_image(image_id: str, db: Session = Depends(get_db)):
    repo = DocumentRepository(db)
    decoded_image_id = unquote(image_id)
    image = repo.get_image_by_image_id(decoded_image_id)
    if not image:
        raise HTTPException(status_code=404, detail="图片不存在")

    image_path = Path(image.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="图片文件不存在")

    return FileResponse(image_path)


@router.get("/documents")
def list_documents(db: Session = Depends(get_db)):
    repo = DocumentRepository(db)
    docs = repo.list_documents()
    return [
        {
            "id": item.id,
            "file_name": item.file_name,
            "status": item.status,
            "created_at": item.created_at.isoformat(),
        }
        for item in docs
    ]
