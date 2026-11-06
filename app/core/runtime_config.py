from __future__ import annotations

from dataclasses import asdict, dataclass

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal
from app.repositories.document_repository import DocumentRepository


@dataclass
class RuntimeConfig:
    llm_api_base: str
    llm_api_key: str
    llm_model_name: str
    llm_timeout: int
    vision_api_base: str
    vision_api_key: str
    vision_model_name: str
    enable_vision: bool
    embedding_api_base: str
    embedding_api_key: str
    embedding_model_name: str
    reranker_enabled: bool
    reranker_api_base: str
    reranker_api_key: str
    reranker_model_name: str
    reranker_timeout: int
    top_k: int
    keyword_top_k: int
    final_top_n: int
    chroma_host: str
    chroma_port: int
    chroma_collection: str
    uploads_dir: str
    images_dir: str

    @classmethod
    def from_settings(cls, settings: Settings) -> "RuntimeConfig":
        return cls(
            llm_api_base=settings.llm_api_base,
            llm_api_key=settings.llm_api_key,
            llm_model_name=settings.llm_model_name,
            llm_timeout=settings.llm_timeout,
            vision_api_base=settings.vision_api_base,
            vision_api_key=settings.vision_api_key,
            vision_model_name=settings.vision_model_name,
            enable_vision=settings.enable_vision,
            embedding_api_base=settings.embedding_api_base,
            embedding_api_key=settings.embedding_api_key,
            embedding_model_name=settings.embedding_model_name,
            reranker_enabled=settings.reranker_enabled,
            reranker_api_base=settings.reranker_api_base,
            reranker_api_key=settings.reranker_api_key,
            reranker_model_name=settings.reranker_model_name,
            reranker_timeout=settings.reranker_timeout,
            top_k=settings.top_k,
            keyword_top_k=settings.keyword_top_k,
            final_top_n=settings.final_top_n,
            chroma_host=settings.chroma_host,
            chroma_port=settings.chroma_port,
            chroma_collection=settings.chroma_collection,
            uploads_dir=settings.uploads_dir,
            images_dir=settings.images_dir,
        )

    def to_public_dict(self) -> dict:
        return asdict(self)


def get_runtime_config() -> RuntimeConfig:
    settings = get_settings()
    runtime = RuntimeConfig.from_settings(settings)

    db = SessionLocal()
    try:
        repo = DocumentRepository(db)
        record = repo.get_model_config("default")
        if not record:
            return runtime

        runtime.llm_api_base = record.llm_api_base
        runtime.llm_api_key = record.llm_api_key or runtime.llm_api_key
        runtime.llm_model_name = record.llm_model_name
        runtime.llm_timeout = record.llm_timeout

        runtime.embedding_api_base = record.embedding_api_base
        runtime.embedding_api_key = record.embedding_api_key or runtime.embedding_api_key
        runtime.embedding_model_name = record.embedding_model_name

        runtime.vision_api_base = record.vision_api_base or runtime.vision_api_base
        runtime.vision_api_key = record.vision_api_key or runtime.vision_api_key
        runtime.vision_model_name = record.vision_model_name or runtime.vision_model_name
        runtime.enable_vision = record.enable_vision

        runtime.reranker_enabled = record.reranker_enabled
        runtime.reranker_api_base = record.reranker_api_base or runtime.reranker_api_base
        runtime.reranker_api_key = record.reranker_api_key or runtime.reranker_api_key
        runtime.reranker_model_name = record.reranker_model_name or runtime.reranker_model_name
        runtime.reranker_timeout = record.reranker_timeout

        runtime.top_k = record.top_k
        runtime.keyword_top_k = record.keyword_top_k
        runtime.final_top_n = record.final_top_n
        return runtime
    finally:
        db.close()

