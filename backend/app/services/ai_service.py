"""
AI Service for calling OpenAI API.
Handles Embeddings, Summarization, topic extraction, and RAG answering.
"""

from typing import List, Dict, Any, Optional
import json
import logging
from fastapi import HTTPException
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Async OpenAI Client
# Make sure to handle empty api_key gracefully (e.g., fallback or raising error)
openai_client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY or "dummy-key-to-prevent-startup-crash",
    base_url=settings.OPENAI_BASE_URL,
)


class AIService:
    """Service to interact with LLMs and Embedding models."""

    @staticmethod
    async def generate_embedding(text: str | List[str]) -> List[float] | List[List[float]]:
        """Generate vector embedding(s) using OpenAI embedding model."""
        if not settings.OPENAI_API_KEY:
            # Return dummy vectors if API key is not configured (e.g. testing)
            # Default dimension is 1536
            if isinstance(text, list):
                return [[0.0] * 1536 for _ in text]
            return [0.0] * 1536

        try:
            response = await openai_client.embeddings.create(
                model=settings.EMBEDDING_MODEL,
                input=text,
            )
            if isinstance(text, list):
                return [item.embedding for item in response.data]
            return response.data[0].embedding
        except Exception as exc:
            logger.error(f"Error generating embedding: {exc}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate embedding: {str(exc)}"
            ) from exc

    @staticmethod
    async def generate_answer(query: str, chunks: List[Dict[str, Any]]) -> str:
        """Execute RAG question-answering with context chunks."""
        if not settings.OPENAI_API_KEY:
            return "OpenAI API Key is not configured. Unable to generate answer."

        # Format context
        context_items = []
        for idx, chunk in enumerate(chunks):
            title = chunk.get("title", "Unknown Source")
            content = chunk.get("snippet") or chunk.get("content") or ""
            context_items.append(f"Source [{idx+1}]: {title}\nContent: {content}\n")

        context_str = "\n".join(context_items)

        system_prompt = (
            "You are a helpful and expert assistant for the Enterprise Knowledge Hub.\n"
            "Your task is to answer the user's question accurately and objectively, based ONLY on the provided source snippets.\n"
            "If the snippets do not contain enough information to answer, state clearly that you do not know or cannot find the answer in the provided documents.\n"
            "Do not make up facts or extrapolate outside the context. Cite the source numbers (e.g., [1], [2]) in your response when referencing them."
        )

        user_content = (
            f"Context Sources:\n{context_str}\n\n"
            f"User Question: {query}\n\n"
            f"Answer:"
        )

        try:
            response = await openai_client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            logger.error(f"Error generating answer: {exc}")
            return f"An error occurred while generating the answer: {str(exc)}"

    @staticmethod
    async def summarize_document(text: str) -> str:
        """Generate a structured summary of the document text."""
        if not settings.OPENAI_API_KEY:
            return "OpenAI API Key not configured. Summary unavailable."

        # Truncate text to avoid model token limits (approx 12000 words limit)
        truncated_text = text[:48000]

        system_prompt = (
            "You are an expert technical editor. Summarize the following document content.\n"
            "Provide a concise summary structured into three sections:\n"
            "1. Executive Summary: A high-level overview of the document (2-3 sentences).\n"
            "2. Key Takeaways: Bullet points listing the main facts or findings.\n"
            "3. Document Tone/Purpose: A brief description of the document's intent."
        )

        try:
            response = await openai_client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": truncated_text},
                ],
                temperature=0.3,
                max_tokens=600,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            logger.error(f"Error summarizing document: {exc}")
            return f"Summary failed: {str(exc)}"

    @staticmethod
    async def extract_topics(text: str) -> List[str]:
        """Analyze text and extract relevant tags/topics."""
        if not settings.OPENAI_API_KEY:
            return ["general"]

        # Truncate text
        truncated_text = text[:15000]

        system_prompt = (
            "You are a taxonomy extraction assistant.\n"
            "Analyze the given text and extract a JSON list of 3 to 8 relevant keywords, keytopics, or technologies mentioned.\n"
            "Return ONLY a valid JSON array of strings, e.g., [\"Kubernetes\", \"CI/CD\", \"Security\"]. Do not output markdown code blocks or explanations."
        )

        try:
            response = await openai_client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": truncated_text},
                ],
                temperature=0.1,
                max_tokens=150,
            )
            output = response.choices[0].message.content.strip()
            
            # Clean possible markdown formatting
            if output.startswith("```json"):
                output = output.replace("```json", "", 1)
            if output.startswith("```"):
                output = output.replace("```", "", 1)
            if output.endswith("```"):
                output = output[:-3]
            output = output.strip()

            topics = json.loads(output)
            if isinstance(topics, list):
                return [str(t).strip().lower() for t in topics]
            return ["general"]
        except Exception as exc:
            logger.error(f"Error extracting topics: {exc}")
            return ["general"]
