"""
LangGraph State Machine for Advanced RAG.
Nodes: Retrieve, Grade Chunks, Generate Answer, Refine.
"""

from typing import TypedDict, List, Dict, Any, Optional
from uuid import UUID
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph, END

from app.services.search_service import SearchService
from app.services.ai_service import AIService, openai_client
from app.ai.prompts import GRADE_CHUNKS_PROMPT, REFINE_ANSWER_PROMPT
from app.schemas.search import AskResponse, SearchResult

logger = logging.getLogger(__name__)


class GraphState(TypedDict):
    """State managed by the LangGraph workflow."""
    query: str
    project_id: Optional[UUID]
    db: AsyncSession
    documents: List[SearchResult]
    relevant_documents: List[SearchResult]
    answer: str
    steps: List[str]


# ---------------------------------------------------------------------------
# Node Functions
# ---------------------------------------------------------------------------

async def retrieve_node(state: GraphState) -> Dict[str, Any]:
    """Retrieve document chunks from the search index."""
    query = state["query"]
    project_id = state.get("project_id")
    db = state["db"]
    steps = state.get("steps", []) + ["retrieve"]

    logger.info(f"LangGraph: Retrieving sources for query: {query}")
    # Fetch top 8 documents for grading
    results = await SearchService.hybrid_search(
        db=db,
        query=query,
        project_id=project_id,
        limit=8,
    )

    return {"documents": results, "steps": steps}


async def grade_chunks_node(state: GraphState) -> Dict[str, Any]:
    """Assess retrieved chunks for relevance to the user's query."""
    query = state["query"]
    documents = state.get("documents", [])
    steps = state.get("steps", []) + ["grade_chunks"]

    relevant_docs = []
    logger.info(f"LangGraph: Grading {len(documents)} document chunks")

    for doc in documents:
        # Prompt LLM to assess relevance
        prompt = GRADE_CHUNKS_PROMPT.format(query=query, chunk=doc.snippet)
        try:
            response = await openai_client.chat.completions.create(
                model="gpt-4",  # or settings.LLM_MODEL
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=100,
            )
            output = response.choices[0].message.content.strip()

            # Clean and parse JSON
            if output.startswith("```json"):
                output = output.replace("```json", "", 1)
            if output.startswith("```"):
                output = output.replace("```", "", 1)
            if output.endswith("```"):
                output = output[:-3]
            output = output.strip()

            result = json.loads(output)
            if result.get("relevant") is True:
                relevant_docs.append(doc)
        except Exception as exc:
            logger.error(f"Error grading chunk: {exc}")
            # Fallback: keep document if grading fails to ensure recall
            relevant_docs.append(doc)

    return {"relevant_documents": relevant_docs, "steps": steps}


async def generate_node(state: GraphState) -> Dict[str, Any]:
    """Generate answer based on graded relevant chunks."""
    query = state["query"]
    docs = state.get("relevant_documents", [])
    steps = state.get("steps", []) + ["generate"]

    logger.info(f"LangGraph: Generating answer with {len(docs)} relevant chunks")

    if not docs:
        return {
            "answer": "I could not find any relevant documents in the database to answer your question.",
            "steps": steps,
        }

    chunks_payload = [
        {"title": d.title, "snippet": d.snippet}
        for d in docs
    ]

    answer = await AIService.generate_answer(query=query, chunks=chunks_payload)
    return {"answer": answer, "steps": steps}


async def refine_node(state: GraphState) -> Dict[str, Any]:
    """Refine generated answer using secondary context if available."""
    query = state["query"]
    current_answer = state.get("answer", "")
    docs = state.get("relevant_documents", [])
    steps = state.get("steps", []) + ["refine"]

    # Only refine if we have multiple documents and a generated answer exists
    if len(docs) <= 2 or not current_answer:
        return {"steps": steps}

    logger.info("LangGraph: Refining answer with extra context")
    # Take additional context chunks
    extra_context = "\n\n".join([f"Source: {d.title}\n{d.snippet}" for d in docs[2:]])
    prompt = REFINE_ANSWER_PROMPT.format(query=query, answer=current_answer, context=extra_context)

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=600,
        )
        refined_answer = response.choices[0].message.content.strip()
        return {"answer": refined_answer, "steps": steps}
    except Exception as exc:
        logger.error(f"Error refining answer: {exc}")
        return {"steps": steps}


# ---------------------------------------------------------------------------
# Conditional Edges
# ---------------------------------------------------------------------------

def decide_to_generate(state: GraphState) -> str:
    """Route to generation if relevant documents exist; otherwise go straight to END."""
    docs = state.get("relevant_documents", [])
    if not docs:
        logger.info("LangGraph Edge: No relevant documents found. Routing to END.")
        return "generate"  # Routing to generate will let it print the fallback message
    logger.info("LangGraph Edge: Relevant documents found. Routing to generate node.")
    return "generate"


# ---------------------------------------------------------------------------
# Graph Compilation
# ---------------------------------------------------------------------------

workflow = StateGraph(GraphState)

# Add Nodes
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("grade_chunks", grade_chunks_node)
workflow.add_node("generate", generate_node)
workflow.add_node("refine", refine_node)

# Set Entrypoint
workflow.set_entry_point("retrieve")

# Add Edges
workflow.add_edge("retrieve", "grade_chunks")
workflow.add_conditional_edges(
    "grade_chunks",
    decide_to_generate,
    {
        "generate": "generate",
    }
)
workflow.add_edge("generate", "refine")
workflow.add_edge("refine", END)

# Compile
rag_graph = workflow.compile()


# ---------------------------------------------------------------------------
# Runner Entrypoint
# ---------------------------------------------------------------------------

async def run_rag_graph(
    db: AsyncSession,
    query: str,
    project_id: Optional[UUID] = None,
) -> AskResponse:
    """Run the compiled LangGraph state machine and return structured AskResponse."""
    initial_state = {
        "query": query,
        "project_id": project_id,
        "db": db,
        "documents": [],
        "relevant_documents": [],
        "answer": "",
        "steps": [],
    }

    try:
        final_state = await rag_graph.ainvoke(initial_state)
        # Map relevant documents back to SearchResult
        sources = final_state.get("relevant_documents", [])
        if not sources:
            sources = final_state.get("documents", [])[:3]

        return AskResponse(
            answer=final_state.get("answer", "No answer generated."),
            sources=sources,
        )
    except Exception as exc:
        logger.error(f"Error executing LangGraph pipeline: {exc}")
        # Failover to standard RAG pipeline
        from app.ai.rag import RAGPipeline
        return await RAGPipeline.ask(db=db, query=query, project_id=project_id)
