from __future__ import annotations

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Iterable
from urllib.parse import quote

from openai import OpenAI

from app.clients.openai_clients import get_llm
from app.clients.vector_store import get_vector_store
from app.core.runtime_config import get_runtime_config
from app.db.session import SessionLocal
from app.repositories.document_repository import DocumentRepository
from app.services.llm_service import FINAL_PROMPT, NO_DOCUMENT_GUIDE


class QueryService:
    IMAGE_HINT_KEYWORDS = (
        "图片",
        "配图",
        "附图",
        "示意图",
        "电路图",
        "流程图",
        "结构图",
        "原图",
        "截图",
        "看图",
        "图示",
        "画一下",
        "演示一下",
        "长什么样",
        "如图",
        "图",
    )

    def __init__(self) -> None:
        self.vectorstore = get_vector_store()

    def _has_documents(self) -> bool:
        db = SessionLocal()
        try:
            return DocumentRepository(db).count_documents() > 0
        finally:
            db.close()

    @classmethod
    def _needs_visual_answer(cls, question: str) -> bool:
        normalized = question.strip().lower()
        return any(keyword in normalized for keyword in cls.IMAGE_HINT_KEYWORDS)

    def _fetch_answer_images(self, citations: list[dict], question: str) -> list[dict]:
        if not self._needs_visual_answer(question):
            return []

        image_candidates = [item for item in citations if item.get("content_type") == "image" or item.get("image_id")]
        if not image_candidates:
            return []

        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            images: list[dict] = []
            seen: set[str] = set()
            for item in image_candidates:
                image_id = item.get("image_id")
                if not image_id or image_id in seen:
                    continue
                image = repo.get_image_by_image_id(image_id)
                if not image:
                    continue
                image_path = Path(image.image_path)
                if not image_path.exists():
                    continue
                seen.add(image_id)
                images.append(
                    {
                        "image_id": image_id,
                        "source_file": item.get("source_file") or Path(image.image_path).name,
                        "page_no": item.get("page_no"),
                        "chunk_location": item.get("chunk_location"),
                        "location_label": item.get("location_label") or item.get("chunk_location") or "未知位置",
                        "caption": image.caption,
                        "content_type": "image",
                        "image_url": f"/api/rag/images/{quote(image_id, safe='')}",
                    }
                )
                if len(images) >= 3:
                    break
            return images
        finally:
            db.close()

    def _build_rerank_client(self) -> OpenAI:
        runtime = get_runtime_config()
        return OpenAI(api_key=runtime.reranker_api_key, base_url=runtime.reranker_api_base)

    

    def retrieve_context(self, question: str) -> tuple[str, list[dict]]:
        runtime = get_runtime_config()
        results = self.vectorstore.similarity_search_with_score(question, k=runtime.top_k)

        context_parts: list[str] = []
        citation_map: list[dict] = []

        for idx, (doc, score) in enumerate(results, start=1):
            metadata = doc.metadata or {}
            source_file = metadata.get("source_file", "")
            source_suffix = Path(source_file).suffix.lower()
            is_word_document = source_suffix in {".doc", ".docx"}
            page_no = metadata.get("page_no")
            chunk_id = metadata.get("chunk_id")
            image_id = metadata.get("image_id")
            chunk_location = metadata.get("chunk_location")
            index_type = metadata.get("index_type")
            content_type = metadata.get("content_type")
            preview = doc.page_content[:800]

            if is_word_document and chunk_location:
                location_label = str(chunk_location)
            elif page_no and chunk_location:
                location_label = f"第{page_no}页 / {chunk_location}"
            elif page_no:
                location_label = f"第{page_no}页"
            elif chunk_location:
                location_label = str(chunk_location)
            else:
                location_label = "未知位置"

            context_parts.append(f"[{idx}] 文件:{source_file} 位置:{location_label} 类型:{content_type or index_type}\n{doc.page_content}")

            citation_map.append(
                {
                    "index": idx,
                    "source_file": source_file,
                    "page_no": page_no,
                    "chunk_id": chunk_id,
                    "image_id": image_id,
                    "chunk_location": chunk_location,
                    "location_label": location_label,
                    "preview": preview,
                    "index_type": index_type,
                    "content_type": content_type,
                    "retrieval_method": metadata.get("retrieval_method"),
                    "score": score,
                }
            )

        return "\n\n".join(context_parts), citation_map

    async def rerank(self, query: str, citations: list[dict]) -> tuple[list[dict], dict]:
        runtime = get_runtime_config()
        if not citations:
            return [], {"enabled": runtime.reranker_enabled, "used": False, "fallback": False, "mode": "skip", "provider": "openai-compatible", "model": runtime.reranker_model_name, "reason": "no_citations", "requested_top_n": runtime.final_top_n, "returned_count": 0}

        if not runtime.reranker_enabled:
            return citations[: runtime.final_top_n], {"enabled": False, "used": False, "fallback": False, "mode": "disabled", "provider": "openai-compatible", "model": runtime.reranker_model_name, "reason": "disabled_by_config", "requested_top_n": runtime.final_top_n, "returned_count": min(len(citations), runtime.final_top_n)}

        try:
            client = self._build_rerank_client()
            
            # 【提取候选文本】: 提取 citation 中的预览文本给 Rerank 模型计算
            # 这里假设 citations 中的文本内容存储在 'preview' 字段
            documents = [item.get("preview", "") for item in citations]

            # 【修改点】: 改用 POST 请求专用的 /reranks 接口
            response = client.post(
                "/reranks",
                body={
                    "model": runtime.reranker_model_name,
                    "query": query,
                    "documents": documents,
                    "top_n": runtime.final_top_n,
                },
                cast_to=object, # 将返回结果解析为字典/对象
            )
            
            # 【解析响应】: DashScope Rerank 接口通常会返回带有 results 的结构
            # 返回体示例: {"results": [{"index": 0, "relevance_score": 0.89}, ...]}
            results = response.get("results") if isinstance(response, dict) else None
            
            if not results:
                # 尝试其他可能的解析路径
                results = self._normalize_rerank_response(response)
                
        except Exception as exc:
            return self._fallback_rerank_status(f"request_failed: {exc}", citations)

        if not results:
            return self._fallback_rerank_status("empty_results", citations)

        ranked: list[dict] = []
        for item in results:
            index = item.get("index")
            if not isinstance(index, int):
                continue
            if 0 <= index < len(citations):
                ranked_item = dict(citations[index])
                # 适配阿里的字段名，通常是 relevance_score，有时也会叫 score
                ranked_item["rerank_score"] = item.get("relevance_score", item.get("score"))
                ranked.append(ranked_item)

        if not ranked:
            return self._fallback_rerank_status("invalid_result_indices", citations)

        return ranked, {"enabled": True, "used": True, "fallback": False, "mode": "rerank", "provider": "openai-compatible", "model": runtime.reranker_model_name, "reason": "success", "requested_top_n": runtime.final_top_n, "returned_count": len(ranked)}

    @staticmethod
    def _normalize_rerank_response(payload: object) -> list[dict]:
        if isinstance(payload, str):
            text = payload.strip()
            if text.startswith("```"):
                text = text.strip("`\n")
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                return []
            if isinstance(data, dict) and isinstance(data.get("results"), list):
                return [item for item in data["results"] if isinstance(item, dict)]
            return []
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            if isinstance(payload.get("results"), list):
                return [item for item in payload["results"] if isinstance(item, dict)]
            if isinstance(payload.get("data"), list):
                return [item for item in payload["data"] if isinstance(item, dict)]
            output = payload.get("output")
            if isinstance(output, dict) and isinstance(output.get("results"), list):
                return [item for item in output["results"] if isinstance(item, dict)]
        return []

    def _fallback_rerank_status(self, reason: str, citations: list[dict]) -> tuple[list[dict], dict]:
        runtime = get_runtime_config()
        fallback_citations = citations[: runtime.final_top_n]
        return fallback_citations, {"enabled": runtime.reranker_enabled, "used": False, "fallback": True, "mode": "fallback", "provider": "openai-compatible", "model": runtime.reranker_model_name, "reason": reason, "requested_top_n": runtime.final_top_n, "returned_count": len(fallback_citations)}

    def _build_ranked_context(self, citations: list[dict]) -> str:
        return "\n\n".join(f"[{item['index']}] 文件:{item['source_file']} 位置:{item['location_label']} 类型:{item.get('content_type') or item.get('index_type')}\n{item['preview']}" for item in citations)

    @staticmethod
    def _format_rerank_notice(rerank_status: dict) -> str:
        if rerank_status.get("used"):
            return f"【Rerank状态】已执行 rerank（模型：{rerank_status.get('model')}，返回 {rerank_status.get('returned_count')} 条）。"
        if rerank_status.get("fallback"):
            return f"【Rerank状态】已降级，未成功执行 rerank（原因：{rerank_status.get('reason')}）。"
        return f"【Rerank状态】未执行 rerank（原因：{rerank_status.get('reason')}）。"

    async def generate_answer(self, question: str) -> tuple[str, list[dict], list[dict], dict]:
        if not self._has_documents():
            rerank_status = {"enabled": False, "used": False, "fallback": False, "mode": "guide", "provider": "openai-compatible", "model": get_runtime_config().reranker_model_name, "reason": "no_documents", "requested_top_n": 0, "returned_count": 0}
            return NO_DOCUMENT_GUIDE, [], [], rerank_status

        context, citations = self.retrieve_context(question)
        ranked_citations, rerank_status = await self.rerank(question, citations)
        answer_images = self._fetch_answer_images(ranked_citations, question)
        ranked_context = self._build_ranked_context(ranked_citations)

        llm = get_llm()
        prompt_value = FINAL_PROMPT.invoke({"now": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "question": question, "context": ranked_context or context})
        result = llm.invoke(prompt_value.to_messages())
        answer = result.content if isinstance(result.content, str) else str(result.content)
        answer = f"{self._format_rerank_notice(rerank_status)}\n\n{answer}"
        return answer, ranked_citations, answer_images, rerank_status

    async def stream_answer(self, question: str):
        if not self._has_documents():
            yield NO_DOCUMENT_GUIDE
            await asyncio.sleep(0)
            return

        context, citations = self.retrieve_context(question)
        ranked_citations, rerank_status = await self.rerank(question, citations)
        ranked_context = self._build_ranked_context(ranked_citations)
        answer_images = self._fetch_answer_images(ranked_citations, question)

        llm = get_llm()
        prompt_value = FINAL_PROMPT.invoke({"now": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "question": question, "context": ranked_context or context})

        notice = self._format_rerank_notice(rerank_status)
        yield notice + "\n\n"
        if answer_images:
            yield "【相关图片】\n"
            for image in answer_images:
                yield f"- {image['location_label']}：{image['image_url']}\n"
            yield "\n"
        await asyncio.sleep(0)

        for chunk in llm.stream(prompt_value.to_messages()):
            content = getattr(chunk, "content", "")
            if isinstance(content, str):
                if content:
                    yield content
                    await asyncio.sleep(0)
            elif isinstance(content, Iterable):
                for item in content:
                    text = getattr(item, "text", None)
                    if text:
                        yield text
                        await asyncio.sleep(0)

    def retrieve_only(self, question: str) -> list[dict]:
        _, citations = self.retrieve_context(question)
        return citations
