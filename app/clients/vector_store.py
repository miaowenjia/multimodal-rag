from chromadb import HttpClient
from langchain_chroma import Chroma

from app.clients.openai_clients import get_embeddings
from app.core.runtime_config import get_runtime_config


def get_chroma_client() -> HttpClient:
    runtime = get_runtime_config()
    return HttpClient(host=runtime.chroma_host, port=runtime.chroma_port)


def get_vector_store() -> Chroma:
    client = get_chroma_client()
    embeddings = get_embeddings()
    runtime = get_runtime_config()
    return Chroma(
        client=client,
        collection_name=runtime.chroma_collection,
        embedding_function=embeddings,
    )

