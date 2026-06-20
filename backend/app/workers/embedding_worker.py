"""
Embedding Worker.
Kafka consumer that receives document chunk IDs, calls OpenAI embeddings API,
upserts vectors to Qdrant, saves embedding links in PostgreSQL, and marks documents as COMPLETED.
"""

import asyncio
import logging
from uuid import UUID
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.core.kafka import KafkaConsumer, Topics
from app.core.qdrant import qdrant_manager
from app.models.document import Document, DocumentChunk, Embedding, DocumentStatus
from app.ai.embeddings import EmbeddingGenerator
from app.core.config import settings

# Configure logger
logger = logging.getLogger("embedding_worker")
logging.basicConfig(level=logging.INFO)


async def process_embeddings(document_id_str: str, chunk_ids_str: list[str]) -> None:
    """Generate vector embeddings for document chunks and index them in Qdrant."""
    doc_id = UUID(document_id_str)
    chunk_uuids = [UUID(cid) for cid in chunk_ids_str]

    async with AsyncSessionLocal() as db:
        # 1. Fetch chunks from PostgreSQL
        chunks_stmt = select(DocumentChunk).where(DocumentChunk.id.in_(chunk_uuids))
        chunks_res = await db.execute(chunks_stmt)
        chunks = chunks_res.scalars().all()

        if not chunks:
            logger.warning(f"No chunks found in DB for chunk IDs provided. Skipping.")
            return

        # 2. Extract contents and generate embeddings in batch
        logger.info(f"Generating embeddings for {len(chunks)} chunks of document {doc_id}")
        chunk_contents = [chunk.content for chunk in chunks]
        
        generator = EmbeddingGenerator()
        try:
            vectors = await generator.generate_embeddings(chunk_contents)
        except Exception as exc:
            logger.error(f"Error during OpenAI embedding generation: {exc}", exc_info=True)
            # Update document to FAILED
            doc_stmt = select(Document).where(Document.id == doc_id)
            doc_res = await db.execute(doc_stmt)
            doc = doc_res.scalar_one_or_none()
            if doc:
                doc.status = DocumentStatus.FAILED
                doc.metadata_ = {"error": f"Embedding generation failed: {str(exc)}"}
                db.add(doc)
                await db.commit()
            return

        # 3. Form Qdrant payload points
        qdrant_points = []
        embedding_records = []

        for idx, chunk in enumerate(chunks):
            vector = vectors[idx]
            vector_id = str(chunk.id)  # Cleanest: Use PostgreSQL Chunk ID as Qdrant Vector ID

            # Build metadata payload
            payload = chunk.metadata_ or {}
            payload.update({
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "chunk_index": chunk.chunk_index,
            })

            qdrant_points.append({
                "id": vector_id,
                "vector": vector,
                "payload": payload,
            })

            # Create DB link record
            db_embedding = Embedding(
                chunk_id=chunk.id,
                vector_id=vector_id,
                model_name=settings.EMBEDDING_MODEL,
            )
            embedding_records.append(db_embedding)
            db.add(db_embedding)

        # 4. Upsert to Qdrant
        logger.info(f"Upserting {len(qdrant_points)} vectors into Qdrant for document {doc_id}")
        try:
            await qdrant_manager.create_collection()  # Ensure collection exists
            await qdrant_manager.upsert_vectors(points=qdrant_points)
        except Exception as exc:
            logger.error(f"Qdrant upsert failed: {exc}", exc_info=True)
            doc_stmt = select(Document).where(Document.id == doc_id)
            doc_res = await db.execute(doc_stmt)
            doc = doc_res.scalar_one_or_none()
            if doc:
                doc.status = DocumentStatus.FAILED
                doc.metadata_ = {"error": f"Qdrant vector upsert failed: {str(exc)}"}
                db.add(doc)
                await db.commit()
            return

        # 5. Save Embedding entries in PG and mark Document as COMPLETED
        doc_stmt = select(Document).where(Document.id == doc_id)
        doc_res = await db.execute(doc_stmt)
        doc = doc_res.scalar_one_or_none()

        if doc:
            doc.status = DocumentStatus.COMPLETED
            # Automatically extract and store topics in document metadata if not present
            try:
                # Merge document content chunks for topic extraction
                merged_text = "\n".join([chunk.content for chunk in chunks[:3]])
                topics = await AIService.extract_topics(merged_text)
                doc.metadata_ = doc.metadata_ or {}
                doc.metadata_["topics"] = topics
            except Exception:
                pass
            db.add(doc)

        await db.commit()
        logger.info(f"Successfully processed and indexed document {doc_id} to Qdrant and PostgreSQL.")


async def main() -> None:
    """Worker loop subscribing to EMBEDDING_GENERATION topic."""
    # Connect Qdrant client singleton
    await qdrant_manager.connect()

    consumer = KafkaConsumer(
        topics=[Topics.EMBEDDING_GENERATION],
        group_id="embedding-worker-group",
    )
    await consumer.start()
    logger.info("Embedding Worker started. Listening on topic: embedding.generation")

    try:
        async for message in consumer.consume_messages():
            val = message.get("value", {})
            doc_id_str = val.get("document_id")
            chunk_ids = val.get("chunk_ids", [])
            if doc_id_str and chunk_ids:
                logger.info(f"Received embedding event for document: {doc_id_str} ({len(chunk_ids)} chunks)")
                await process_embeddings(doc_id_str, chunk_ids)
    except asyncio.CancelledError:
        logger.info("Embedding Worker shutdown requested.")
    finally:
        await consumer.stop()
        await qdrant_manager.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting on KeyboardInterrupt")
