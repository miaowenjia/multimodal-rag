from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    app_name: str = "Multimodal RAG Service"
    app_env: str = "dev"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8010

    sqlite_url: str = Field(
        default=f"sqlite:///{(DATA_DIR / 'rag.db').as_posix()}"
    )
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection: str = "rag_chunks"

    uploads_dir: str = str(DATA_DIR / "uploads")
    images_dir: str = str(DATA_DIR / "images")

    llm_api_base: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_api_key: str = ""
    llm_model_name: str = "qwen-plus"
    llm_timeout: int = 120

    vision_api_base: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    vision_api_key: str = ""
    vision_model_name: str = "qwen-vl-max-latest"
    enable_vision: bool = False

    embedding_api_base: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    embedding_api_key: str = "your-dashscope-api-key"
    embedding_model_name: str = "text-embedding-v3"

    reranker_enabled: bool = True
    reranker_api_base: str = ""
    reranker_api_key: str = ""
    reranker_model_name: str = ""
    reranker_timeout: int = 60
    top_k: int = 15
    keyword_top_k: int = 15
    final_top_n: int = 8

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # Treat blank environment values as unset and use field defaults.
        env_ignore_empty=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.images_dir).mkdir(parents=True, exist_ok=True)
    return settings
