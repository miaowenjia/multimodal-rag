from app.core.config import get_settings
from app.db.models import ModelConfig
from app.db.session import Base, SessionLocal, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_document_chunk_columns()
    ensure_model_config_columns()
    seed_default_model_config()


def ensure_document_chunk_columns() -> None:
    with engine.begin() as conn:
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(document_chunks)").fetchall()}
        if "chunk_order" not in columns:
            conn.exec_driver_sql("ALTER TABLE document_chunks ADD COLUMN chunk_order INTEGER")
        if "chunk_location" not in columns:
            conn.exec_driver_sql("ALTER TABLE document_chunks ADD COLUMN chunk_location VARCHAR(255)")


def ensure_model_config_columns() -> None:
    with engine.begin() as conn:
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(model_configs)").fetchall()}
        additions = {
            "llm_api_key": "ALTER TABLE model_configs ADD COLUMN llm_api_key VARCHAR(255) DEFAULT ''",
            "llm_timeout": "ALTER TABLE model_configs ADD COLUMN llm_timeout INTEGER DEFAULT 120",
            "embedding_api_key": "ALTER TABLE model_configs ADD COLUMN embedding_api_key VARCHAR(255) DEFAULT ''",
            "reranker_enabled": "ALTER TABLE model_configs ADD COLUMN reranker_enabled BOOLEAN DEFAULT 1",
            "reranker_api_base": "ALTER TABLE model_configs ADD COLUMN reranker_api_base VARCHAR(255) DEFAULT ''",
            "reranker_api_key": "ALTER TABLE model_configs ADD COLUMN reranker_api_key VARCHAR(255) DEFAULT ''",
            "reranker_model_name": "ALTER TABLE model_configs ADD COLUMN reranker_model_name VARCHAR(100) DEFAULT ''",
            "reranker_timeout": "ALTER TABLE model_configs ADD COLUMN reranker_timeout INTEGER DEFAULT 60",
            "vision_api_key": "ALTER TABLE model_configs ADD COLUMN vision_api_key VARCHAR(255) DEFAULT ''",
            "top_k": "ALTER TABLE model_configs ADD COLUMN top_k INTEGER DEFAULT 15",
            "keyword_top_k": "ALTER TABLE model_configs ADD COLUMN keyword_top_k INTEGER DEFAULT 15",
            "final_top_n": "ALTER TABLE model_configs ADD COLUMN final_top_n INTEGER DEFAULT 8",
        }
        for column_name, sql in additions.items():
            if column_name not in columns:
                conn.exec_driver_sql(sql)


def seed_default_model_config() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        exists = db.query(ModelConfig).filter(ModelConfig.name == "default").first()
        if exists:
            return
        record = ModelConfig(
            name="default",
            llm_api_base=settings.llm_api_base,
            llm_api_key=settings.llm_api_key,
            llm_model_name=settings.llm_model_name,
            llm_timeout=settings.llm_timeout,
            embedding_api_base=settings.embedding_api_base,
            embedding_api_key=settings.embedding_api_key,
            embedding_model_name=settings.embedding_model_name,
            reranker_enabled=True,
            reranker_api_base=getattr(settings, "reranker_api_base", ""),
            reranker_api_key=getattr(settings, "reranker_api_key", ""),
            reranker_model_name=getattr(settings, "reranker_model_name", ""),
            reranker_timeout=settings.reranker_timeout,
            vision_api_base=settings.vision_api_base,
            vision_api_key=settings.vision_api_key,
            vision_model_name=settings.vision_model_name,
            enable_vision=settings.enable_vision,
            top_k=settings.top_k,
            keyword_top_k=settings.keyword_top_k,
            final_top_n=settings.final_top_n,
            is_active=True,
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

