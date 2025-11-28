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
    chatbot_id: str = None
) -> List[Dict[str, Any]]:
    """
    Perform cosine similarity search using pgvector with company and scope filtering

    Args:
        query_embedding: Query embedding vector
        top_k: Number of results to return (default from settings)
        threshold: Minimum similarity threshold (default from settings)
        company_id: Optional company ID to filter documents (multitenancy)
        allowed_scopes: Optional list of scopes to filter documents (e.g., ['sales', 'support'])
        chatbot_id: Optional chatbot ID to filter documents assigned to specific bot

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

        # Call the match_documents RPC function
        # Note: query_embedding is sent as a Python list, Supabase converts it to vector type
        try:
            response = client.rpc(
                'match_documents',
                {
                    'query_embedding': query_embedding,  # Send as list, Supabase handles conversion
                    'match_threshold': threshold,
                    'match_count': top_k * 2  # Get more results for filtering (doubled to account for filters)
                }
            ).execute()

            results = response.data if response.data else []

            logger.info(f"Found {len(results)} matching embeddings (before filtering)")

            # MULTITENANCY: Filter by company_id and scope
            if company_id or allowed_scopes or chatbot_id:
                filtered_results = await _apply_document_filters(
                    results,
                    company_id,
                    allowed_scopes,
                    chatbot_id
                )

                # Limit to requested top_k after filtering
                filtered_results = filtered_results[:top_k]

                logger.info(f"After filtering: {len(filtered_results)} results (company_id={company_id}, scopes={allowed_scopes}, chatbot_id={chatbot_id})")

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
    embedding: List[float]
) -> Dict[str, Any]:
    """
    Store an embedding in the database

    Args:
        document_id: ID of the source document
        chunk_text: Text chunk
        embedding: Embedding vector

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

        response = client.table("embeddings").insert(data).execute()

        logger.info(f"Stored embedding for document {document_id}")

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
        embeddings_data: List of embedding records

    Returns:
        List[Dict]: Created embedding records
    """
    try:
        client = get_supabase_client()

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
    chatbot_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Filter embedding search results by document metadata (company_id, scope, chatbot_id)

    Args:
        embedding_results: List of embedding matches from similarity search
        company_id: Filter to specific company
        allowed_scopes: Filter to specific scopes (e.g., ['sales', 'support'])
        chatbot_id: Filter to documents assigned to specific chatbot

    Returns:
        Filtered list of embeddings
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

        # Fetch document metadata with filters
        query = client.table("documents").select("id, company_id, scope, chatbot_id").in_("id", document_ids)

        # Apply company filter (CRITICAL for multitenancy isolation)
        if company_id:
            query = query.eq("company_id", company_id)

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
            logger.info(f"No documents matched filters (company_id={company_id}, scopes={allowed_scopes}, chatbot_id={chatbot_id})")
            return []

        # Create set of allowed document IDs for fast lookup
        allowed_doc_ids = set([doc["id"] for doc in allowed_documents])

        logger.info(f"Allowed documents after filtering: {len(allowed_doc_ids)} out of {len(document_ids)}")

        # Filter embeddings to only include those from allowed documents
        filtered_embeddings = [
            emb for emb in embedding_results
            if emb.get("document_id") in allowed_doc_ids
        ]

        return filtered_embeddings

    except Exception as e:
        logger.error(f"Error filtering documents: {e}")
        # On error, return empty list to fail-safe (don't leak data across tenants)
        return []
