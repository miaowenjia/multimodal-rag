from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(50), default="uploaded")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="document")
    images: Mapped[list["DocumentImage"]] = relationship(back_populates="document")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), index=True)
    chunk_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    parent_chunk_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    page_no_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_no_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    chunk_type: Mapped[str] = mapped_column(String(50), default="parent")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_file: Mapped[str] = mapped_column(String(255), nullable=False)
    vector_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped[Document] = relationship(back_populates="chunks")


class DocumentImage(Base):
    __tablename__ = "document_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), index=True)
    image_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    page_no: Mapped[int] = mapped_column(Integer)
    image_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    related_chunk_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped[Document] = relationship(back_populates="images")


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    llm_api_base: Mapped[str] = mapped_column(String(255))
    llm_api_key: Mapped[str] = mapped_column(String(255), default="")
    llm_model_name: Mapped[str] = mapped_column(String(100))
    llm_timeout: Mapped[int] = mapped_column(Integer, default=120)
    embedding_api_base: Mapped[str] = mapped_column(String(255))
    embedding_api_key: Mapped[str] = mapped_column(String(255), default="")
    embedding_model_name: Mapped[str] = mapped_column(String(100))
    reranker_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    reranker_api_base: Mapped[str] = mapped_column(String(255), default="")
    reranker_api_key: Mapped[str] = mapped_column(String(255), default="")
    reranker_model_name: Mapped[str] = mapped_column(String(100), default="")
    reranker_timeout: Mapped[int] = mapped_column(Integer, default=60)
    vision_api_base: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vision_api_key: Mapped[str] = mapped_column(String(255), default="")
    vision_model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    enable_vision: Mapped[bool] = mapped_column(Boolean, default=False)
    top_k: Mapped[int] = mapped_column(Integer, default=15)
    keyword_top_k: Mapped[int] = mapped_column(Integer, default=15)
    final_top_n: Mapped[int] = mapped_column(Integer, default=8)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

