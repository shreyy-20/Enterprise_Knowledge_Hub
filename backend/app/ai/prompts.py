"""
Prompt templates and injection sanitization utilities.
"""

import re
from app.core.security import sanitize_input

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

RAG_SYSTEM_PROMPT = (
    "You are an expert enterprise virtual assistant. Answer the user's question "
    "concisely, objectively, and completely based ONLY on the provided context sources.\n"
    "If the source snippets do not contain the answer, state that you do not know. "
    "Do not hallucinate or extrapolate outside the context. Cite sources using [1], [2], etc."
)

RAG_USER_PROMPT = (
    "Context Sources:\n"
    "{context}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

SUMMARY_PROMPT = (
    "Summarize the following document content in a structured format:\n"
    "1. Executive Summary: 2-3 sentences overview.\n"
    "2. Key Takeaways: Bullet points of main findings.\n"
    "3. Document Purpose: Brief statement of document intent.\n\n"
    "Content:\n{text}"
)

TOPICS_PROMPT = (
    "Extract between 3 and 8 relevant tags, keywords, or topics from the text below.\n"
    "Return ONLY a valid JSON list of strings, e.g. [\"Python\", \"Docker\", \"Security\"]. "
    "Do not include markdown headers, quotes, or conversational text.\n\n"
    "Text:\n{text}"
)

GRADE_CHUNKS_PROMPT = (
    "You are a grader assessing relevance of a retrieved document chunk to a user query.\n"
    "Query: {query}\n"
    "Document Chunk:\n{chunk}\n\n"
    "Does this chunk contain information relevant to the user query? Answer with either "
    "'YES' or 'NO' followed by a brief reason. Format your answer as a JSON block with keys "
    "'relevant' (boolean) and 'reason' (string)."
)

REFINE_ANSWER_PROMPT = (
    "You are an answer refiner.\n"
    "Original Question: {query}\n"
    "Current Answer:\n{answer}\n\n"
    "Additional Context:\n{context}\n\n"
    "Refine the current answer to incorporate the new context. Ensure the answer remains "
    "objective and is supported ONLY by the provided source documents. If the new context "
    "does not add value, output the original answer unchanged."
)

# ---------------------------------------------------------------------------
# Injection prevention
# ---------------------------------------------------------------------------

_INJECTION_PATTERNS = [
    re.compile(r"\bignore\b.*\binstruction", re.IGNORECASE),
    re.compile(r"\bsystem\b.*\boverride", re.IGNORECASE),
    re.compile(r"\bdeveloper\b.*\bmode\b", re.IGNORECASE),
    re.compile(r"\byou\b.*\bare\b.*\bnow\b", re.IGNORECASE),
    re.compile(r"\bdo\b.*\bnot\b.*\breferee", re.IGNORECASE),
    re.compile(r"\bpretend\b.*\bto\b.*\bbe\b", re.IGNORECASE),
    re.compile(r"\bprompt\b.*\bleak", re.IGNORECASE),
    re.compile(r"\[system\b", re.IGNORECASE),
    re.compile(r"<system\b", re.IGNORECASE),
]


def sanitize_prompt(text: str) -> str:
    """Sanitize prompt inputs to neutralize prompt injection attacks and strip standard HTML/SQL syntax."""
    # First apply standard HTML & SQL injection sanitization
    cleaned = sanitize_input(text)

    # Scan and neutralize prompt injection triggers
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(cleaned):
            # Replace injection-like phrases with a warning or generic indicator
            cleaned = pattern.sub("[cleaned instruction]", cleaned)

    return cleaned
