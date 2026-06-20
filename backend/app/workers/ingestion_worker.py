"""
Ingestion Worker.
Kafka consumer that extracts text from documents (PDF, DOCX, TXT, MD),
creates chunks, and triggers embedding generation.
"""

import asyncio
import os
import tempfile
import logging
from uuid import UUID
import httpx
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.core.kafka import KafkaConsumer, kafka_producer, Topics
from app.models.document import Document, DocumentChunk, FileType, DocumentStatus
from app.ai.chunking import DocumentChunker

# Configure logger
logger = logging.getLogger("ingestion_worker")
logging.basicConfig(level=logging.INFO)

# Optional third-party imports
try:
    from pypdf import PdfReader
    _has_pypdf = True
except ImportError:
    _has_pypdf = False

try:
    import docx
    _has_docx = True
except ImportError:
    _has_docx = False


def _extract_text_from_file(file_path: str, file_type: FileType) -> str:
    """Extract text from PDF, DOCX, TXT, or MD files."""
    if file_type == FileType.PDF:
        if not _has_pypdf:
            raise ImportError("pypdf is required to extract PDF text.")
        reader = PdfReader(file_path)
        text_parts = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_parts.append(text)
        return "\n".join(text_parts)

    elif file_type == FileType.DOCX:
        if not _has_docx:
            raise ImportError("python-docx is required to extract DOCX text.")
        doc = docx.Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs])

    elif file_type in [FileType.TXT, FileType.MD]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    raise ValueError(f"Unsupported file type: {file_type}")


async def _download_file(url: str, temp_file_path: str) -> None:
    """Download a file from a URL to a temporary local path."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("GET", url) as response:
            if response.status_code != 200:
                raise httpx.HTTPStatusError(
                    f"Failed to download file, status code: {response.status_code}",
                    request=response.request,
                    response=response,
                )
            with open(temp_file_path, "wb") as f:
                async for chunk in response.iter_bytes():
                    f.write(chunk)


async def process_document_ingestion(document_id_str: str) -> None:
    """Main function to ingest a document, extract text, split it, and write chunks."""
    doc_id = UUID(document_id_str)
    async with AsyncSessionLocal() as db:
        # 1. Retrieve document
        stmt = select(Document).where(Document.id == doc_id)
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()

        if not doc:
            logger.error(f"Document {doc_id} not found in database.")
            return

        if doc.status not in [DocumentStatus.PENDING, DocumentStatus.PROCESSING]:
            logger.info(f"Document {doc_id} is already in status {doc.status}. Skipping.")
            return

        # 2. Update status to PROCESSING
        doc.status = DocumentStatus.PROCESSING
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        temp_file_path = None
        try:
            # 3. Get local file path or download remote URL
            file_source = doc.file_url
            if not file_source:
                raise ValueError("Document has no file_url configuration.")

            if file_source.startswith(("http://", "https://")):
                suffix = f".{doc.file_type.value.lower()}"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_f:
                    temp_file_path = temp_f.name
                logger.info(f"Downloading remote document {doc_id} from {file_source}")
                await _download_file(file_source, temp_file_path)
                local_path = temp_file_path
            else:
                local_path = file_source

            # 4. Extract Text
            logger.info(f"Extracting text from document {doc_id} at {local_path}")
            extracted_text = _extract_text_from_file(local_path, doc.file_type)

            if not extracted_text.strip():
                raise ValueError("Extracted text is empty.")

            # Update document content
            doc.content = extracted_text
            db.add(doc)

            # 5. Chunk the text
            logger.info(f"Chunking text for document {doc_id}")
            chunker = DocumentChunker(chunk_size=800, chunk_overlap=150)
            text_chunks = chunker.split_text(extracted_text, file_type=doc.file_type.value)

            # 6. Save chunks to Database
            # Fetch document owner's department_id to embed in metadata
            owner_dept_id = None
            if doc.owner:
                owner_dept_id = str(doc.owner.department_id) if doc.owner.department_id else None

            chunks_to_create = []
            for idx, chunk_text in enumerate(text_chunks):
                # Build metadata dict to store in DB chunk metadata_ column
                # which will be sent to Qdrant payload later
                meta = {
                    "document_id": str(doc.id),
                    "project_id": str(doc.project_id) if doc.project_id else None,
                    "department_id": owner_dept_id,
                    "owner_id": str(doc.owner_id) if doc.owner_id else None,
                    "title": doc.title,
                    "file_type": doc.file_type.value,
                }

                db_chunk = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=idx,
                    content=chunk_text,
                    token_count=chunker.count_tokens(chunk_text),
                    metadata_=meta,
                )
                db.add(db_chunk)
                chunks_to_create.append(db_chunk)

            await db.commit()

            # Refresh to get chunk IDs
            for c in chunks_to_create:
                await db.refresh(c)

            # 7. Publish chunk IDs to Kafka embedding topic
            logger.info(f"Successfully chunked {doc_id} into {len(chunks_to_create)} pieces. Dispatching to embeddings worker.")
            chunk_ids = [str(c.id) for c in chunks_to_create]
            
            await kafka_producer.send_message(
                topic=Topics.EMBEDDING_GENERATION,
                value={
                    "document_id": str(doc.id),
                    "chunk_ids": chunk_ids,
                },
                key=str(doc.id),
            )

        except Exception as exc:
            logger.error(f"Error during ingestion of document {doc_id}: {exc}", exc_info=True)
            doc.status = DocumentStatus.FAILED
            doc.metadata_ = {"error": str(exc)}
            db.add(doc)
            await db.commit()
        finally:
            # Clean up temp file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass


async def main() -> None:
    """Worker loop subscribing to DOCUMENT_INGESTION topic."""
    # Ensure producer is active for routing
    await kafka_producer.start()

    consumer = KafkaConsumer(
        topics=[Topics.DOCUMENT_INGESTION],
        group_id="ingestion-worker-group",
    )
    await consumer.start()
    logger.info("Ingestion Worker started. Listening on topic: document.ingestion")

    try:
        async for message in consumer.consume_messages():
            val = message.get("value", {})
            doc_id_str = val.get("document_id")
            if doc_id_str:
                logger.info(f"Received ingestion event for document: {doc_id_str}")
                await process_document_ingestion(doc_id_str)
    except asyncio.CancelledError:
        logger.info("Ingestion Worker shutdown requested.")
    finally:
        await consumer.stop()
        await kafka_producer.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting on KeyboardInterrupt")
