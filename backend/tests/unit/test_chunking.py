# backend/tests/unit/test_chunking.py
"""
Unit tests for the DocumentChunker text splitting utility.
"""

import pytest
from app.ai.chunking import DocumentChunker


def test_chunker_basic_txt_splitting():
    """Test text splitting based on character counts and overlaps."""
    # Chunk size 100 characters, overlap 20 characters
    chunker = DocumentChunker(chunk_size=100, chunk_overlap=20, use_tokens=False)
    
    text = (
        "This is a long test document containing multiple lines of text designed to test "
        "the basic recursive character splitter. It should partition this text into smaller "
        "overlapping chunks. Let's make sure it handles punctuation and spacing properly."
    )
    
    chunks = chunker.split_text(text, file_type="TXT")
    
    # Assertions
    assert len(chunks) > 1
    for chunk in chunks:
        # Every chunk should be under/around the chunk_size threshold
        assert len(chunk) <= chunker.chunk_size
        assert len(chunk) > 5  # No empty/extremely small chunks
        
    # Check overlap presence
    # The last part of the first chunk should match the start of the second chunk
    overlap_found = False
    for i in range(len(chunks) - 1):
        c1 = chunks[i]
        c2 = chunks[i+1]
        # Check if any small overlap substring from c1 is at the beginning of c2
        end_snippet = c1[-15:]
        if end_snippet in c2:
            overlap_found = True
            break
    assert overlap_found is True


def test_chunker_markdown_splitting():
    """Test chunker handles Markdown headers as splitting boundaries."""
    chunker = DocumentChunker(chunk_size=150, chunk_overlap=30, use_tokens=False)
    
    markdown_content = (
        "# Header 1\n"
        "This is the first section of the document which is brief.\n\n"
        "## Header 2\n"
        "This is the second section of the document. It contains details that are a bit longer. "
        "We want to test if it preserves heading markers."
    )
    
    chunks = chunker.split_text(markdown_content, file_type="MD")
    
    assert len(chunks) >= 2
    # Check that header strings are preserved in the chunks
    assert any("Header 1" in c for c in chunks)
    assert any("Header 2" in c for c in chunks)


def test_chunker_token_counting():
    """Test token estimation fallback and tiktoken integration."""
    chunker = DocumentChunker(chunk_size=100, chunk_overlap=20, use_tokens=False)
    
    text = "Hello world! This is a simple test sentence."
    # Should use fallback estimate (~4 characters per token)
    estimated = chunker.count_tokens(text)
    
    # Text length is 44 characters, fallback estimate 44 // 4 = 11 tokens
    assert estimated == 11
    
    # Ensure it returns at least 1 token for non-empty text
    assert chunker.count_tokens("a") == 1
    assert chunker.count_tokens("") == 1


def test_chunker_use_tokens_activation():
    """Test initialization with token chunking enabled."""
    chunker = DocumentChunker(chunk_size=50, chunk_overlap=10, use_tokens=True)
    # Check if tiktoken-based tokenization properties are appropriately set
    if chunker.use_tokens:
        assert chunker.tokenizer is not None
        assert chunker._get_length("Hello world") < len("Hello world")
    else:
        assert chunker.tokenizer is None
        assert chunker._get_length("Hello world") == len("Hello world")
