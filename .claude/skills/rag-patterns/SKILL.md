---
name: rag-patterns
description: Retrieval-Augmented Generation patterns combining vector search and LLMs for knowledge-intensive tasks including chunking strategies, hybrid search, and reranking.
---

# RAG Patterns

Retrieval-Augmented Generation combines parametric (LLM) and non-parametric (vector database) memory for knowledge-intensive tasks. Originally proposed by Lewis et al. (2020), RAG retrieves relevant documents and uses them as context for LLM generation.

**Sources:** Lewis et al. [NeurIPS 2020](https://arxiv.org/abs/2005.11401), [LangChain Docs](https://python.langchain.com/v0.2/docs/tutorials/rag/), [Pinecone RAG Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

## Core Architecture

1. **Document Ingestion**: Chunk documents, generate embeddings, store in vector DB
2. **Retrieval**: Query embedding → similarity search → retrieve top-k chunks
3. **Generation**: Inject retrieved context into LLM prompt → generate answer with citations

---

## Chunking Strategies

**Fixed-Size**: Split by tokens/characters (500-1500 chars) with 10-20% overlap. Simple but ignores semantic boundaries.

**Semantic**: Group sentences by embedding similarity. Preserves meaning but computationally expensive.

**Recursive**: Split by structure (headers, paragraphs, sentences). Best for structured docs.

**Document-Based**: Use Markdown structure, code classes, tables as boundaries.

**Recommendation**: Start with 1000 chars + 200 overlap. Tune based on query patterns and embedding model context window.

---

## Embeddings

| Model | Dims | Use Case |
|-------|------|----------|
| text-embedding-3-small | 1536 | Cost-effective, general |
| text-embedding-3-large | 3072 | Higher accuracy |
| Cohere embed-v3 | 1024 | Multilingual |

**Best Practice**: Use instruction prefixes (`query:` for searches, `passage:` for docs). Store original text in metadata to avoid separate DB lookup.

---

## Hybrid Search

Combine semantic (dense vectors) + keyword (BM25) for robust retrieval.

**BM25**: TF-IDF refinement for exact term matching (handles acronyms, names, IDs)

**Dense Vectors**: Semantic similarity (handles paraphrases, synonyms)

**Reciprocal Rank Fusion (RRF)**: Merge results from both methods
```
score = 1 / (60 + rank)  // constant k=60
```

Retrieve 2x desired results from each method, merge with RRF, return top-k.

---

## Reranking

After retrieval, rerank with cross-encoder models (e.g., BGE Reranker) that score query-document pairs directly. More expensive but significantly improves precision.

**Pattern**: Retrieve 20-50 candidates → Rerank → Return top 5-10

Rerankers focus on relevance vs similarity - crucial for multi-hop reasoning.

---

## Context Injection

**Metadata Filtering**: Pre-filter by date, author, category before semantic search. Vastly more efficient than post-filtering.

**Prompt Template**:
```
Context: [Retrieved chunks with sources]

Instructions:
- Answer using only provided context
- Cite sources as [Source N]
- Say "insufficient information" if context lacks answer

Question: {query}
```

**Citation Parsing**: Extract `[Source N]` patterns, map to original document metadata.

---

## Common Issues

**Irrelevant Results**: Add hybrid search, metadata filters, reranking

**Missing Context**: Increase overlap (20%), use parent document retrieval (store small chunks but retrieve larger parent)

**Hallucination**: Enforce citation requirements, lower temperature (0.1-0.3), validate claims against sources

**Slow Performance**: Cache embeddings (by hash), batch requests, use approximate nearest neighbor (HNSW, IVF)

---

## Evaluation

**Retrieval**: Precision (relevant/retrieved), Recall (relevant/total), MRR (mean reciprocal rank)

**Generation**: Faithfulness (uses only context), Answer Relevancy (addresses question), Context Precision (minimal irrelevant chunks)

Use test sets with ground truth Q&A pairs. Measure retrieval quality separately from generation quality.

---

## Resources

- [Lewis et al. RAG Paper](https://arxiv.org/abs/2005.11401) - Original academic paper (NeurIPS 2020)
- [LangChain RAG Tutorial](https://python.langchain.com/v0.2/docs/tutorials/rag/) - Implementation guide
- [Pinecone RAG Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/) - Production best practices
- [Weaviate Chunking Strategies](https://weaviate.io/blog/chunking-strategies-for-rag) - Comprehensive chunking guide
- [Superlinked Hybrid Search](https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking) - Advanced retrieval patterns
