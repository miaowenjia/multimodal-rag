from __future__ import annotations

import hashlib
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.runtime_config import get_runtime_config
from app.repositories.document_repository import DocumentRepository
from app.services.chunk_service import build_parent_child_chunks
from app.services.llm_service import summarize_text
from app.services.pdf_parser import PyMuPDFParser
from app.services.vector_service import VectorIndexService
from app.services.vision_service import generate_image_caption
from app.services.word_parser import WordParser


class IngestService:
    def __init__(self, db: Session) -> None:
        runtime = get_runtime_config()
        self.db = db
        self.repo = DocumentRepository(db)
        self.pdf_parser = PyMuPDFParser(runtime.images_dir)
        self.word_parser = WordParser(runtime.images_dir)
        self.vector_service = VectorIndexService()

    @staticmethod
    def _detect_content_type(content: str) -> str:
        return "table" if "表格第" in content else "text"

    def ingest_document(self, file_path: str, original_file_name: str | None = None, overwrite: bool = False) -> dict:
        runtime = get_runtime_config()
        source = Path(file_path)
        final_file_name = original_file_name or source.name
        file_ext = Path(final_file_name).suffix.lower()
        target = Path(runtime.uploads_dir) / final_file_name
        target.parent.mkdir(parents=True, exist_ok=True)

        file_bytes = source.read_bytes()
        if source.resolve() != target.resolve() or not target.exists():
            target.write_bytes(file_bytes)

        file_hash = hashlib.sha256(file_bytes).hexdigest()
        existing_document = self.repo.get_document_by_file_hash(file_hash)
        if existing_document:
            old_file_path = Path(existing_document.file_path)
            should_update_name = existing_document.file_name != final_file_name
            should_update_path = existing_document.file_path != str(target)

            if should_update_name or should_update_path:
                existing_document.file_name = final_file_name
                existing_document.file_path = str(target)
                for chunk in self.repo.list_chunks_by_document_id(existing_document.id):
                    chunk.source_file = final_file_name
                self.db.commit()

                if old_file_path != target and old_file_path.exists():
                    old_file_path.unlink()

            if overwrite:
                delete_result = self.delete_document(existing_document.id)
                target.write_bytes(file_bytes)
                result = self._create_document_from_file(target, file_ext, file_hash)
                result["overwritten"] = True
                result["already_exists"] = False
                result["old_document_id"] = delete_result["document_id"]
                return result
            return {
                "document_id": existing_document.id,
                "file_name": existing_document.file_name,
                "parent_chunks": len(
                    [
                        item
                        for item in self.repo.list_chunks_by_document_id(existing_document.id)
                        if item.chunk_type == "parent"
                    ]
                ),
                "child_chunks": len(
                    [
                        item
                        for item in self.repo.list_chunks_by_document_id(existing_document.id)
                        if item.chunk_type == "child"
                    ]
                ),
                "images": len(self.repo.list_images_by_document_id(existing_document.id)),
                "already_exists": True,
                "overwritten": False,
            }

        result = self._create_document_from_file(target, file_ext, file_hash)
        result["already_exists"] = False
        result["overwritten"] = False
        return result

    def _parse_document(self, file_path: str, file_ext: str):
        if file_ext == ".pdf":
            return self.pdf_parser.parse(file_path)
        if file_ext in {".docx", ".doc"}:
            return self.word_parser.parse(file_path, file_ext)
        raise ValueError("当前仅支持 PDF、DOC 和 DOCX 入库")

    @staticmethod
    def _normalize_page_no(file_ext: str, value: int | None) -> int | None:
        if file_ext in {".docx", ".doc"}:
            return None
        return value

    def _create_document_from_file(self, target: Path, file_ext: str, file_hash: str) -> dict:
        parsed = self._parse_document(str(target), file_ext)

        document = self.repo.create_document(
            file_name=target.name,
            file_path=str(target),
            file_hash=file_hash,
            status="processing",
        )
        parents, children = build_parent_child_chunks(parsed.pages)
        chunk_namespace = f"doc{document.id}"
        image_namespace = f"doc{document.id}"

        vector_items: list[dict] = []
        for parent in parents:
            parent_page_no = self._normalize_page_no(file_ext, parent["page_no_start"])
            parent_chunk_id = f"{chunk_namespace}::{parent['chunk_id']}"
            content_type = self._detect_content_type(parent["content"])
            summary = summarize_text(parent["content"]) if parent["content"].strip() else ""
            self.repo.create_chunk(
                document_id=document.id,
                chunk_id=parent_chunk_id,
                parent_chunk_id=None,
                page_no_start=parent_page_no,
                page_no_end=self._normalize_page_no(file_ext, parent["page_no_end"]),
                chunk_order=parent["chunk_order"],
                chunk_location=parent["chunk_location"],
                chunk_type="parent",
                content=parent["content"],
                summary=summary,
                source_file=target.name,
            )
            vector_items.append(
                {
                    "id": f"summary::{parent_chunk_id}",
                    "content": summary or parent["content"],
                    "metadata": {
                        "document_id": document.id,
                        "chunk_id": parent_chunk_id,
                        "page_no": parent_page_no,
                        "chunk_order": parent["chunk_order"],
                        "chunk_location": parent["chunk_location"],
                        "source_file": target.name,
                        "index_type": "summary",
                        "content_type": content_type,
                    },
                }
            )

        for child in children:
            child_page_no = self._normalize_page_no(file_ext, child["page_no_start"])
            parent_chunk_id = f"{chunk_namespace}::{child['parent_chunk_id']}"
            child_chunk_id = f"{chunk_namespace}::{child['chunk_id']}"
            content_type = self._detect_content_type(child["content"])
            self.repo.create_chunk(
                document_id=document.id,
                chunk_id=child_chunk_id,
                parent_chunk_id=parent_chunk_id,
                page_no_start=child_page_no,
                page_no_end=self._normalize_page_no(file_ext, child["page_no_end"]),
                chunk_order=child["chunk_order"],
                chunk_location=child["chunk_location"],
                chunk_type="child",
                content=child["content"],
                summary=None,
                source_file=target.name,
            )
            vector_items.append(
                {
                    "id": f"child::{child_chunk_id}",
                    "content": child["content"],
                    "metadata": {
                        "document_id": document.id,
                        "chunk_id": child_chunk_id,
                        "parent_chunk_id": parent_chunk_id,
                        "page_no": child_page_no,
                        "chunk_order": child["chunk_order"],
                        "chunk_location": child["chunk_location"],
                        "source_file": target.name,
                        "index_type": "child",
                        "content_type": content_type,
                    },
                }
            )

        for image in parsed.images:
            image_page_no = self._normalize_page_no(file_ext, image.get("page_no"))
            stored_image_page_no = image.get("page_no") or 1
            image_id = f"{image_namespace}::{image['image_id']}"
            image_location = image.get("chunk_location") or (
                f"第{image_page_no}页-图片{image['image_id']}" if image_page_no is not None else f"文档内图片{image['image_id']}"
            )
            caption = generate_image_caption(image["image_path"])
            self.repo.create_image(
                document_id=document.id,
                image_id=image_id,
                page_no=stored_image_page_no,
                image_path=image["image_path"],
                caption=caption,
                width=image.get("width"),
                height=image.get("height"),
                related_chunk_id=None,
            )
            if caption:
                vector_items.append(
                    {
                        "id": f"image::{image_id}",
                        "content": caption,
                        "metadata": {
                            "document_id": document.id,
                            "image_id": image_id,
                            "page_no": image_page_no,
                            "chunk_location": image_location,
                            "source_file": target.name,
                            "index_type": "image_caption",
                            "content_type": "image",
                        },
                    }
                )

        self.vector_service.add_documents(vector_items)
        document.status = "ready"
        self.db.commit()

        return {
            "document_id": document.id,
            "file_name": document.file_name,
            "parent_chunks": len(parents),
            "child_chunks": len(children),
            "images": len(parsed.images),
        }

    def delete_document(self, document_id: int) -> dict:
        document = self.repo.get_document(document_id)
        if not document:
            raise ValueError("文档不存在")

        images = self.repo.list_images_by_document_id(document_id)
        file_path = Path(document.file_path)

        self.vector_service.delete_by_document_id(document_id)
        self.repo.delete_chunks_by_document_id(document_id)
        self.repo.delete_images_by_document_id(document_id)
        self.repo.delete_document(document)
        self.db.commit()

        for image in images:
            image_path = Path(image.image_path)
            if image_path.exists():
                image_path.unlink()

        if file_path.exists():
            file_path.unlink()

        return {"document_id": document_id, "status": "deleted"}

    def replace_document(self, document_id: int, file_path: str, original_file_name: str | None = None) -> dict:
        old_document = self.repo.get_document(document_id)
        if not old_document:
            raise ValueError("文档不存在")

        old_id = old_document.id
        self.delete_document(document_id)
        new_result = self.ingest_document(file_path, original_file_name=original_file_name, overwrite=False)
        return {
            "old_document_id": old_id,
            "new_document_id": new_result["document_id"],
            "file_name": new_result["file_name"],
            "parent_chunks": new_result["parent_chunks"],
            "child_chunks": new_result["child_chunks"],
            "images": new_result["images"],
        }
