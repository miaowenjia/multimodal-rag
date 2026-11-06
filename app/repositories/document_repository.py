from sqlalchemy.orm import Session

from app.db.models import Document, DocumentChunk, DocumentImage, ModelConfig


class DocumentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_document(self, **kwargs) -> Document:
        record = Document(**kwargs)
        self.db.add(record)
        self.db.flush()
        return record

    def create_chunk(self, **kwargs) -> DocumentChunk:
        record = DocumentChunk(**kwargs)
        self.db.add(record)
        self.db.flush()
        return record

    def create_image(self, **kwargs) -> DocumentImage:
        record = DocumentImage(**kwargs)
        self.db.add(record)
        self.db.flush()
        return record

    def get_chunk_by_chunk_id(self, chunk_id: str) -> DocumentChunk | None:
        return self.db.query(DocumentChunk).filter(DocumentChunk.chunk_id == chunk_id).first()

    def get_document(self, document_id: int) -> Document | None:
        return self.db.query(Document).filter(Document.id == document_id).first()

    def get_document_by_file_hash(self, file_hash: str) -> Document | None:
        return self.db.query(Document).filter(Document.file_hash == file_hash).first()

    def get_model_config(self, name: str = "default") -> ModelConfig | None:
        return self.db.query(ModelConfig).filter(ModelConfig.name == name).first()

    def list_documents(self) -> list[Document]:
        return self.db.query(Document).order_by(Document.created_at.desc()).all()

    def count_documents(self) -> int:
        return self.db.query(Document).count()

    def list_chunks_by_document_id(self, document_id: int) -> list[DocumentChunk]:
        return self.db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()

    def list_all_chunks(self) -> list[DocumentChunk]:
        return self.db.query(DocumentChunk).all()

    def list_images_by_document_id(self, document_id: int) -> list[DocumentImage]:
        return self.db.query(DocumentImage).filter(DocumentImage.document_id == document_id).all()

    def get_image_by_image_id(self, image_id: str) -> DocumentImage | None:
        return self.db.query(DocumentImage).filter(DocumentImage.image_id == image_id).first()

    def list_all_images(self) -> list[DocumentImage]:
        return self.db.query(DocumentImage).all()

    def delete_chunks_by_document_id(self, document_id: int) -> None:
        self.db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()

    def delete_images_by_document_id(self, document_id: int) -> None:
        self.db.query(DocumentImage).filter(DocumentImage.document_id == document_id).delete()

    def delete_document(self, document: Document) -> None:
        self.db.delete(document)
