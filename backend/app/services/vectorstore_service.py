"""
Vector store service for pgvector similarity search
"""
from typing import List, Dict, Any, Optional
from app.core.database import get_supabase_client
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def similarity_search(
    query_embedding: List[float],
    top_k: int = None,
    threshold: float = None,
    company_id: str = None,
    allowed_scopes: List[str] = None,
    chatbot_id: str = None,
    use_shared_kb: bool = True,
    selected_document_ids: List[str] = None,
    enable_fallback_threshold: bool = True  # NEW: Enable tiered threshold fallback for typo tolerance
) -> List[Dict[str, Any]]:
    """
    Perform cosine similarity search using pgvector with company and scope filtering.

    TYPO TOLERANCE: When no results found at primary threshold, automatically retries
    at a lower threshold to catch queries with typos (embedding similarity is reduced
    by misspellings). This is a zero-cost, zero-latency approach compared to LLM rewrites.

    Args:
        query_embedding: Query embedding vector
        top_k: Number of results to return (default from settings)
        threshold: Minimum similarity threshold (default from settings)
        company_id: Optional company ID to filter documents (multitenancy)
        allowed_scopes: Optional list of scopes to filter documents (e.g., ['sales', 'support'])
        chatbot_id: Optional chatbot ID to filter documents assigned to specific bot
        use_shared_kb: If True, use shared KB with scope filtering; if False, use only selected documents
        selected_document_ids: When use_shared_kb=False, only these documents are searched
        enable_fallback_threshold: If True and no results found, retry with lower threshold (typo tolerance)

    Returns:
        List[Dict]: List of matching documents with metadata
    """
    try:
        if top_k is None:
            top_k = settings.RAG_TOP_K

        if threshold is None:
            threshold = settings.RAG_SIMILARITY_THRESHOLD

        client = get_supabase_client()

        logger.info(f"Performing similarity search (top_k={top_k}, threshold={threshold}, company_id={company_id}, scopes={allowed_scopes})")
        logger.debug(f"Query embedding dimension: {len(query_embedding)}")

        # Define fallback thresholds for typo tolerance
        # Primary: Use provided threshold
        # Fallback 1: Lower threshold to catch misspellings (typos reduce similarity by ~0.1-0.2)
        # Fallback 2: Minimal threshold for severe typos
        fallback_thresholds = [
            threshold,  # Primary threshold
            max(0.20, threshold - 0.15),  # Fallback 1: 15% lower (handles mild typos)
            0.15  # Fallback 2: Aggressive fallback for severe typos
        ]

        results = []
        threshold_used = threshold

        # Call the match_documents RPC function
        # Note: query_embedding is sent as a Python list, Supabase converts it to vector type
        # CRITICAL: Pass company_id to filter AT DATABASE LEVEL (not post-search filtering)
        try:
            for i, current_threshold in enumerate(fallback_thresholds):
                # Build RPC parameters
                rpc_params = {
                    'query_embedding': query_embedding,  # Send as list, Supabase handles conversion
                    'match_threshold': current_threshold,
                    'match_count': top_k * 2  # Get more results for filtering (doubled to account for filters)
                }

                # MULTITENANCY: Filter at database level for true isolation
                # This prevents other companies' embeddings from filling up the result set
                if company_id:
                    rpc_params['filter_company_id'] = company_id
                    logger.debug(f"RPC filtering by company_id: {company_id}")

                response = client.rpc(
                    'match_documents',
                    rpc_params
                ).execute()

                results = response.data if response.data else []
                threshold_used = current_threshold

                if results:
                    if i > 0:
                        logger.info(f"[TYPO_TOLERANCE] Found {len(results)} results at fallback threshold {current_threshold} (original: {threshold})")
                    break
                elif enable_fallback_threshold and i < len(fallback_thresholds) - 1:
                    logger.info(f"[TYPO_TOLERANCE] No results at threshold {current_threshold}, trying lower threshold...")
                else:
                    break  # Don't retry if fallback disabled or exhausted all thresholds

            logger.info(f"Found {len(results)} matching embeddings (before filtering) at threshold {threshold_used}")

            # MULTITENANCY: Filter by company_id, scope, and KB mode
            if company_id or allowed_scopes or chatbot_id or not use_shared_kb:
                filtered_results = await _apply_document_filters(
                    results,
                    company_id,
                    allowed_scopes,
                    chatbot_id,
                    use_shared_kb,
                    selected_document_ids
                )

                # Limit to requested top_k after filtering
                filtered_results = filtered_results[:top_k]

                logger.info(f"After filtering: {len(filtered_results)} results (company_id={company_id}, scopes={allowed_scopes}, chatbot_id={chatbot_id}, use_shared_kb={use_shared_kb})")

                return filtered_results

            # No filters - return original results (limited to top_k)
            if len(results) == 0:
                logger.warning(f"RPC returned 0 results. Response status: {response.status_code if hasattr(response, 'status_code') else 'N/A'}")
                logger.warning(f"Response data: {response.data}")

        except Exception as rpc_error:
            logger.error(f"RPC call failed: {rpc_error}")
            raise

        return results[:top_k]

    except Exception as e:
        logger.error(f"Error in similarity search: {e}")
        # Return empty list on error instead of failing
        return []


async def store_embedding(
    document_id: str,
    chunk_text: str,
    embedding: List[float],
    company_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Store an embedding in the database

    Args:
        document_id: ID of the source document
        chunk_text: Text chunk
        embedding: Embedding vector
        company_id: Company ID for multi-tenant isolation (CRITICAL for search performance)

    Returns:
        Dict: Created embedding record
    """
    try:
        client = get_supabase_client()

        data = {
            "document_id": document_id,
            "chunk_text": chunk_text,
            "embedding": embedding  # Store as list, Supabase/PostgreSQL handles vector conversion
        }

        # MULTITENANCY: Store company_id for efficient database-level filtering
        if company_id:
            data["company_id"] = company_id

        response = client.table("embeddings").insert(data).execute()

        logger.info(f"Stored embedding for document {document_id} (company_id: {company_id})")

        return response.data[0] if response.data else None

    except Exception as e:
        logger.error(f"Error storing embedding: {e}")
        raise


async def store_embeddings_batch(
    embeddings_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Store multiple embeddings in batch

    Args:
        embeddings_data: List of embedding records. Each record should contain:
            - document_id: str (required)
            - chunk_text: str (required)
            - embedding: List[float] (required)
            - company_id: str (CRITICAL for multi-tenant isolation)

    Note:
        MULTITENANCY: Ensure each embedding record includes company_id for
        efficient database-level filtering during similarity search.
        Without company_id, embeddings may not be found by the tenant's queries.

    Returns:
        List[Dict]: Created embedding records
    """
    try:
        client = get_supabase_client()

        # Log company_id presence for debugging
        if embeddings_data:
            has_company_id = any("company_id" in emb for emb in embeddings_data)
            if not has_company_id:
                logger.warning("Storing embeddings without company_id - they may not be found in multi-tenant searches")

        # Supabase/PostgreSQL will automatically convert list to vector type
        response = client.table("embeddings").insert(embeddings_data).execute()

        logger.info(f"Stored {len(embeddings_data)} embeddings in batch")

        return response.data if response.data else []

    except Exception as e:
        logger.error(f"Error storing batch embeddings: {e}")
        raise


async def delete_embeddings_by_document(document_id: str) -> bool:
    """
    Delete all embeddings for a document

    Args:
        document_id: Document ID

    Returns:
        bool: True if successful
    """
    try:
        client = get_supabase_client()

        response = client.table("embeddings").delete().eq("document_id", document_id).execute()

        logger.info(f"Deleted embeddings for document {document_id}")

        return True

    except Exception as e:
        logger.error(f"Error deleting embeddings: {e}")
        return False


async def _apply_document_filters(
    embedding_results: List[Dict[str, Any]],
    company_id: Optional[str] = None,
    allowed_scopes: Optional[List[str]] = None,
    chatbot_id: Optional[str] = None,
    use_shared_kb: bool = True,
    selected_document_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Filter embedding search results by document metadata (company_id, scope, chatbot_id, KB mode)
    Also enriches results with document metadata (title, scope, source_url) for context awareness.

    Args:
        embedding_results: List of embedding matches from similarity search
        company_id: Filter to specific company
        allowed_scopes: Filter to specific scopes (e.g., ['sales', 'support'])
        chatbot_id: Filter to documents assigned to specific chatbot
        use_shared_kb: If True, use shared KB filtering; if False, use only selected documents
        selected_document_ids: When use_shared_kb=False, only these documents are allowed

    Returns:
        Filtered list of embeddings enriched with document metadata
    """
    try:
        if not embedding_results:
            return []

        # Extract unique document IDs from embeddings
        document_ids = list(set([emb.get("document_id") for emb in embedding_results if emb.get("document_id")]))

        if not document_ids:
            logger.warning("No document IDs found in embedding results")
            return []

        client = get_supabase_client()

        # Handle non-shared KB mode: only use selected documents
        if not use_shared_kb and selected_document_ids:
            # Filter embeddings to only those from selected documents
            selected_set = set(selected_document_ids)

            # Still fetch metadata for enrichment
            meta_response = client.table("documents").select(
                "id, title, scope, source_url, category"
            ).in_("id", list(selected_set)).execute()

            doc_metadata = {doc["id"]: doc for doc in (meta_response.data or [])}

            filtered_embeddings = []
            for emb in embedding_results:
                doc_id = emb.get("document_id")
                if doc_id in selected_set:
                    # Enrich with metadata
                    meta = doc_metadata.get(doc_id, {})
                    emb["doc_title"] = meta.get("title", "")
                    emb["doc_scope"] = meta.get("scope", "")
                    emb["doc_category"] = meta.get("category", "")
                    emb["doc_source_url"] = meta.get("source_url", "")
                    filtered_embeddings.append(emb)

            logger.info(f"Non-shared KB mode: filtered to {len(filtered_embeddings)} embeddings from {len(selected_document_ids)} selected documents")
            return filtered_embeddings

        # Shared KB mode: Fetch document metadata with filters
        # Include additional fields for context awareness
        query = client.table("documents").select(
            "id, company_id, scope, chatbot_id, is_shared, title, source_url, category"
        ).in_("id", document_ids)

        # Apply company filter (CRITICAL for multitenancy isolation)
        if company_id:
            query = query.eq("company_id", company_id)

        # In shared KB mode, only include shared documents (is_shared=TRUE)
        if use_shared_kb:
            query = query.eq("is_shared", True)

        # Apply chatbot filter (chatbot_id NULL means available to all bots in company)
        if chatbot_id:
            query = query.or_(f"chatbot_id.eq.{chatbot_id},chatbot_id.is.null")

        # Apply scope filter (only include documents with matching scopes)
        if allowed_scopes and len(allowed_scopes) > 0:
            # Build OR filter for scopes: scope IN allowed_scopes OR scope IS NULL (general docs)
            scope_filters = [f"scope.eq.{scope}" for scope in allowed_scopes]
            scope_filters.append("scope.is.null")  # Include documents without scope
            query = query.or_(",".join(scope_filters))

        response = query.execute()
        allowed_documents = response.data if response.data else []

        if not allowed_documents:
            logger.info(f"No documents matched filters (company_id={company_id}, scopes={allowed_scopes}, chatbot_id={chatbot_id}, use_shared_kb={use_shared_kb})")
            return []

        # Create lookup dict for metadata enrichment
        doc_metadata = {doc["id"]: doc for doc in allowed_documents}
        allowed_doc_ids = set(doc_metadata.keys())

        logger.info(f"Allowed documents after filtering: {len(allowed_doc_ids)} out of {len(document_ids)}")

        # Filter embeddings and enrich with document metadata
        filtered_embeddings = []
        for emb in embedding_results:
            doc_id = emb.get("document_id")
            if doc_id in allowed_doc_ids:
                meta = doc_metadata[doc_id]
                emb["doc_title"] = meta.get("title", "")
                emb["doc_scope"] = meta.get("scope", "")
                emb["doc_category"] = meta.get("category", "")
                emb["doc_source_url"] = meta.get("source_url", "")
                filtered_embeddings.append(emb)

        return filtered_embeddings

    except Exception as e:
        logger.error(f"Error filtering documents: {e}")
        # On error, return empty list to fail-safe (don't leak data across tenants)
        return []
