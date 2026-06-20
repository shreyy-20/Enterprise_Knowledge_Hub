"""
Document chunker utilizing recursive text splitting with overlap, optimized for Plain Text and Markdown.
"""

from typing import List, Optional
import re

try:
    import tiktoken
    _has_tiktoken = True
except ImportError:
    _has_tiktoken = False


class DocumentChunker:
    """Recursively split text files into clean chunks with overlap. Markdown-aware splitting included."""

    def __init__(
        self,
        chunk_size: int = 1000,  # Max characters or tokens per chunk
        chunk_overlap: int = 200,  # Overlap between chunks
        use_tokens: bool = False,  # If True, chunk by token count (requires tiktoken)
        encoding_name: str = "cl100k_base",
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.use_tokens = use_tokens and _has_tiktoken
        self.tokenizer = tiktoken.get_encoding(encoding_name) if self.use_tokens else None

    def _get_length(self, text: str) -> int:
        """Helper to get length of text in characters or tokens."""
        if self.use_tokens and self.tokenizer:
            return len(self.tokenizer.encode(text))
        return len(text)

    def _split_by_delimiters(self, text: str, delimiters: List[str]) -> List[str]:
        """Split a string by a list of hierarchical delimiters."""
        if not delimiters:
            return [text]

        delim = delimiters[0]
        # Split on the first delimiter
        if delim == "":
            return list(text)

        parts = []
        if delim == "\n\n" or delim == "\n":
            # Retain the separator to keep markdown headers/paragraphs grouped
            raw_parts = text.split(delim)
            for idx, part in enumerate(raw_parts):
                if idx < len(raw_parts) - 1:
                    parts.append(part + delim)
                else:
                    parts.append(part)
        else:
            parts = text.split(delim)

        # Filter empty parts
        parts = [p for p in parts if p.strip()]

        # For parts that are still too large, recursively split using subsequent delimiters
        final_parts = []
        for part in parts:
            if self._get_length(part) > self.chunk_size:
                final_parts.extend(self._split_by_delimiters(part, delimiters[1:]))
            else:
                final_parts.append(part)

        return final_parts

    def split_text(self, text: str, file_type: str = "TXT") -> List[str]:
        """Split document text into overlapping chunks, applying markdown formatting boundaries if appropriate."""
        is_markdown = file_type.upper() in ["MD", "MARKDOWN"]

        # Delimiters ranked from largest logical blocks to smallest characters
        if is_markdown:
            delimiters = [
                "\n# ", "\n## ", "\n### ", "\n#### ",  # Header boundaries
                "\n```",                              # Code blocks
                "\n\n",                               # Paragraphs
                "\n",                                 # Lines
                " ",                                  # Words
                ""                                    # Characters
            ]
        else:
            delimiters = ["\n\n", "\n", " ", ""]

        # Run hierarchical separation
        raw_chunks = self._split_by_delimiters(text, delimiters)

        # Merge separated parts into chunks of size <= chunk_size with overlap
        chunks = []
        current_chunk_parts = []
        current_len = 0

        for part in raw_chunks:
            part_len = self._get_length(part)
            if current_len + part_len <= self.chunk_size:
                current_chunk_parts.append(part)
                current_len += part_len
            else:
                # Store completed chunk
                if current_chunk_parts:
                    chunks.append("".join(current_chunk_parts).strip())

                # Prepare the next chunk with overlap
                overlap_parts = []
                overlap_len = 0
                # Pull from the end of current_chunk_parts to satisfy overlap requirement
                for prev_part in reversed(current_chunk_parts):
                    p_len = self._get_length(prev_part)
                    if overlap_len + p_len <= self.chunk_overlap:
                        overlap_parts.insert(0, prev_part)
                        overlap_len += p_len
                    else:
                        break

                current_chunk_parts = overlap_parts + [part]
                current_len = overlap_len + part_len

        # Append last chunk
        if current_chunk_parts:
            chunks.append("".join(current_chunk_parts).strip())

        # Filter out empty or extremely small chunks
        return [c for c in chunks if len(c) > 5]

    def count_tokens(self, text: str) -> int:
        """Estimate token count for database metrics."""
        if _has_tiktoken and self.tokenizer:
            return len(self.tokenizer.encode(text))
        # Simple fallback estimate: ~4 characters per token
        return max(1, len(text) // 4)
