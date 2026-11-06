from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ApiSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class AnswerImage(ApiSchema):
    image_id: str
    source_file: str
    page_no: int | None = None
    chunk_location: str | None = None
    location_label: str
    caption: str | None = None
    content_type: str = "image"
    image_url: str


class IngestResponse(ApiSchema):
    file_name: str
    success: bool = True
    document_id: int | None = None
    parent_chunks: int = 0
    child_chunks: int = 0
    images: int = 0
    already_exists: bool = False
    overwritten: bool = False
    error: str | None = None


class BatchIngestResponse(ApiSchema):
    total: int
    succeeded: int
    failed: int
    items: list[IngestResponse]


class AskRequest(ApiSchema):
    question: str
    stream: bool = True


class AskResponse(ApiSchema):
    answer: str
    citations: list[dict]
    images: list[AnswerImage]
    rerank_status: dict


class UpdateDocumentResponse(ApiSchema):
    old_document_id: int
    new_document_id: int
    file_name: str
    parent_chunks: int
    child_chunks: int
    images: int


class LlmConfigPayload(ApiSchema):
    api_base: str
    api_key: str = ""
    model_name: str
    timeout: int = 120


class EmbeddingConfigPayload(ApiSchema):
    api_base: str
    api_key: str = ""
    model_name: str


class VisionConfigPayload(ApiSchema):
    enabled: bool = False
    api_base: str = ""
    api_key: str = ""
    model_name: str = ""


class ModelConfigResponse(ApiSchema):
    llm: LlmConfigPayload
    embedding: EmbeddingConfigPayload
    vision: VisionConfigPayload
    source: str


class UpdateModelConfigRequest(ApiSchema):
    llm: LlmConfigPayload
    embedding: EmbeddingConfigPayload
    vision: VisionConfigPayload
    apply_mode: str = "persist_and_reload"


class RerankerConfigPayload(ApiSchema):
    api_base: str
    api_key: str = ""
    model_name: str
    timeout: int = 60


class RerankerConfigResponse(ApiSchema):
    enabled: bool
    config: RerankerConfigPayload
    health_status: str


class UpdateRerankerConfigRequest(ApiSchema):
    enabled: bool
    config: RerankerConfigPayload
    apply_mode: str = "persist_and_reload"


class RetrievalConfigResponse(ApiSchema):
    top_k: int
    keyword_top_k: int
    final_top_n: int
    description: dict[str, str]


class UpdateRetrievalConfigRequest(ApiSchema):
    top_k: int = Field(ge=1, le=100)
    keyword_top_k: int = Field(ge=1, le=100)
    final_top_n: int = Field(ge=1, le=200)
    apply_mode: str = "persist_and_reload"


class ConfigUpdateResponse(ApiSchema):
    message: str
    applied: bool
    need_restart: bool
    current: dict | None = None


class ConfigAllResponse(ApiSchema):
    model: ModelConfigResponse
    reranker: RerankerConfigResponse
    retrieval: RetrievalConfigResponse
