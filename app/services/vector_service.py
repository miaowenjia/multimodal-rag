from __future__ import annotations

from typing import Any

from langchain_core.documents import Document

from app.clients.vector_store import get_vector_store


class VectorIndexService:
    def __init__(self) -> None:
        self.store = get_vector_store()

    @staticmethod
    def _sanitize_metadata(metadata: dict[str, Any]) -> dict[str, str | int | float | bool]:
        cleaned: dict[str, str | int | float | bool] = {}
        for key, value in metadata.items():
            if value is None:
                continue
            if isinstance(value, (str, int, float, bool)):
                cleaned[key] = value
            else:
                cleaned[key] = str(value)
        return cleaned

    def add_documents(self, items: list[dict[str, Any]]) -> None:
        docs = []
        ids = []
        for item in items:
            docs.append(
                Document(
                    page_content=item["content"],
                    metadata=self._sanitize_metadata(item["metadata"]),
                )
            )
            ids.append(item["id"])
        if docs:
            self.store.add_documents(documents=docs, ids=ids)

    def similarity_search(self, query: str, k: int = 6, filter: dict[str, Any] | None = None) -> list[Document]:
        return self.store.similarity_search(query, k=k, filter=filter)

    def delete_by_ids(self, ids: list[str]) -> None:
        if ids:
            self.store.delete(ids=ids)

    def delete_by_document_id(self, document_id: int) -> None:
        self.store._collection.delete(where={"document_id": document_id})
