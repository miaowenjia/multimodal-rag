from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.core.runtime_config import get_runtime_config


def get_llm() -> ChatOpenAI:
    runtime = get_runtime_config()
    return ChatOpenAI(
        openai_api_base=runtime.llm_api_base,
        openai_api_key=runtime.llm_api_key,
        model_name=runtime.llm_model_name,
        streaming=True,
        timeout=runtime.llm_timeout,
        temperature=0,
    )


def get_vision_llm() -> ChatOpenAI:
    runtime = get_runtime_config()
    return ChatOpenAI(
        openai_api_base=runtime.vision_api_base,
        openai_api_key=runtime.vision_api_key,
        model_name=runtime.vision_model_name,
        streaming=False,
        timeout=runtime.llm_timeout,
        temperature=0,
    )


def get_embeddings() -> OpenAIEmbeddings:
    runtime = get_runtime_config()
    return OpenAIEmbeddings(
        openai_api_base=runtime.embedding_api_base,
        openai_api_key=runtime.embedding_api_key,
        model=runtime.embedding_model_name,
        check_embedding_ctx_length=False,
        chunk_size=10,
    )

