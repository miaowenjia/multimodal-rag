from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories.document_repository import DocumentRepository
from app.schemas.rag import (
    ConfigAllResponse,
    ConfigUpdateResponse,
    EmbeddingConfigPayload,
    LlmConfigPayload,
    ModelConfigResponse,
    RetrievalConfigResponse,
    RerankerConfigPayload,
    RerankerConfigResponse,
    UpdateModelConfigRequest,
    UpdateRetrievalConfigRequest,
    UpdateRerankerConfigRequest,
    VisionConfigPayload,
)


class ConfigService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = DocumentRepository(db)

    def _get_config_record(self):
        record = self.repo.get_model_config("default")
        if not record:
            raise ValueError("默认配置不存在")
        return record

    @staticmethod
    def _mask_secret(value: str | None) -> str:
        if not value:
            return ""
        return "******"

    def get_model_config(self) -> ModelConfigResponse:
        record = self._get_config_record()
        return ModelConfigResponse(
            llm=LlmConfigPayload(
                api_base=record.llm_api_base,
                api_key=self._mask_secret(record.llm_api_key),
                model_name=record.llm_model_name,
                timeout=record.llm_timeout,
            ),
            embedding=EmbeddingConfigPayload(
                api_base=record.embedding_api_base,
                api_key=self._mask_secret(record.embedding_api_key),
                model_name=record.embedding_model_name,
            ),
            vision=VisionConfigPayload(
                enabled=record.enable_vision,
                api_base=record.vision_api_base or "",
                api_key=self._mask_secret(record.vision_api_key),
                model_name=record.vision_model_name or "",
            ),
            source="db",
        )

    def update_model_config(self, payload: UpdateModelConfigRequest) -> ConfigUpdateResponse:
        record = self._get_config_record()
        record.llm_api_base = payload.llm.api_base
        if payload.llm.api_key and payload.llm.api_key != "******":
            record.llm_api_key = payload.llm.api_key
        record.llm_model_name = payload.llm.model_name
        record.llm_timeout = payload.llm.timeout

        record.embedding_api_base = payload.embedding.api_base
        if payload.embedding.api_key:
            record.embedding_api_key = payload.embedding.api_key
        record.embedding_model_name = payload.embedding.model_name

        record.enable_vision = payload.vision.enabled
        record.vision_api_base = payload.vision.api_base or None
        if payload.vision.api_key:
            record.vision_api_key = payload.vision.api_key
        record.vision_model_name = payload.vision.model_name or None
        self.db.commit()
        return ConfigUpdateResponse(message="模型配置已更新", applied=True, need_restart=False)

    def get_reranker_config(self) -> RerankerConfigResponse:
        record = self._get_config_record()
        return RerankerConfigResponse(
            enabled=record.reranker_enabled,
            config=RerankerConfigPayload(
                api_base=record.reranker_api_base,
                api_key=self._mask_secret(record.reranker_api_key),
                model_name=record.reranker_model_name,
                timeout=record.reranker_timeout,
            ),
            health_status="unknown",
        )

    def update_reranker_config(self, payload: UpdateRerankerConfigRequest) -> ConfigUpdateResponse:
        record = self._get_config_record()
        record.reranker_enabled = payload.enabled
        record.reranker_api_base = payload.config.api_base
        if payload.config.api_key and payload.config.api_key != "******":
            record.reranker_api_key = payload.config.api_key
        record.reranker_model_name = payload.config.model_name
        record.reranker_timeout = payload.config.timeout
        self.db.commit()
        return ConfigUpdateResponse(message="Reranker 配置已更新", applied=True, need_restart=False)

    def get_retrieval_config(self) -> RetrievalConfigResponse:
        record = self._get_config_record()
        return RetrievalConfigResponse(
            top_k=record.top_k,
            keyword_top_k=record.keyword_top_k,
            final_top_n=record.final_top_n,
            description={
                "top_k": "向量召回条数",
                "keyword_top_k": "关键词召回条数",
                "final_top_n": "Reranker 之后最终保留条数",
            },
        )

    def update_retrieval_config(self, payload: UpdateRetrievalConfigRequest) -> ConfigUpdateResponse:
        if payload.final_top_n > payload.top_k + payload.keyword_top_k:
            raise ValueError("final_top_n 不能大于 top_k + keyword_top_k")

        record = self._get_config_record()
        record.top_k = payload.top_k
        record.keyword_top_k = payload.keyword_top_k
        record.final_top_n = payload.final_top_n
        self.db.commit()
        return ConfigUpdateResponse(
            message="检索参数已更新",
            applied=True,
            need_restart=False,
            current={
                "top_k": record.top_k,
                "keyword_top_k": record.keyword_top_k,
                "final_top_n": record.final_top_n,
            },
        )

    def get_all_config(self) -> ConfigAllResponse:
        return ConfigAllResponse(
            model=self.get_model_config(),
            reranker=self.get_reranker_config(),
            retrieval=self.get_retrieval_config(),
        )
