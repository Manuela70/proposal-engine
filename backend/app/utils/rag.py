"""
RAG utilities — embed, retrieve, ingest.
Usa Titan Embeddings v2 + Aurora pgvector.
Sin OpenSearch, sin S3 extra, sin costo adicional.
"""
import os
import json
import boto3
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
AWS_PROFILE = os.getenv("AWS_PROFILE", "AdministratorAccess-467449736571")

TITAN_MODEL = "amazon.titan-embed-text-v2:0"
EMBED_DIM = 1024


def get_bedrock_client():
    session = boto3.Session(profile_name=AWS_PROFILE)
    return session.client("bedrock-runtime", region_name="us-east-1")


def embed_text(text: str) -> list[float]:
    """Genera embedding de 1024 dimensiones con Titan Embeddings v2."""
    client = get_bedrock_client()
    response = client.invoke_model(
        modelId=TITAN_MODEL,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({
            "inputText": text[:8000],  # Titan v2 soporta hasta 8192 tokens
            "dimensions": EMBED_DIM,
            "normalize": True
        })
    )
    return json.loads(response["body"].read())["embedding"]


async def retrieve(
    query: str,
    source_types: list[str] | None = None,
    k: int = 5
) -> list[dict]:
    """
    Busca los k chunks más relevantes para la query.
    
    Args:
        query: texto de búsqueda
        source_types: filtrar por tipo ['success_case', 'estimation', 'proposal', 'portfolio']
        k: número de resultados
    
    Returns:
        Lista de dicts con content, source_type, source_id, metadata, similarity
    """
    query_embedding = embed_text(query)
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

    conn = await asyncpg.connect(DB_URL, ssl="require")
    await conn.execute("SET LOCAL enable_seqscan = off;")

    try:
        if source_types:
            placeholders = ", ".join(f"${i+2}" for i in range(len(source_types)))
            sql = f"""
                SELECT
                    content,
                    source_type,
                    source_id,
                    metadata,
                    1 - (embedding <=> $1::vector) AS similarity
                FROM document_chunks
                WHERE source_type IN ({placeholders})
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> $1::vector
                LIMIT {k};
            """
            rows = await conn.fetch(sql, embedding_str, *source_types)
        else:
            sql = f"""
                SELECT
                    content,
                    source_type,
                    source_id,
                    metadata,
                    1 - (embedding <=> $1::vector) AS similarity
                FROM document_chunks
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> $1::vector
                LIMIT {k};
            """
            rows = await conn.fetch(sql, embedding_str)

        return [
            {
                "content": r["content"],
                "source_type": r["source_type"],
                "source_id": r["source_id"],
                "metadata": dict(r["metadata"]) if r["metadata"] else {},
                "similarity": float(r["similarity"])
            }
            for r in rows
        ]
    finally:
        await conn.close()


async def ingest_chunk(
    content: str,
    source_type: str,
    source_id: str,
    metadata: dict
) -> None:
    """Inserta un chunk con su embedding en document_chunks."""
    embedding = embed_text(content)
    embedding_str = "[" + ",".join(map(str, embedding)) + "]"

    conn = await asyncpg.connect(DB_URL, ssl="require")
    try:
        await conn.execute("""
            INSERT INTO document_chunks (content, source_type, source_id, metadata, embedding)
            VALUES ($1, $2, $3, $4, $5::vector)
            ON CONFLICT DO NOTHING;
        """, content, source_type, source_id, json.dumps(metadata), embedding_str)
    finally:
        await conn.close()


async def delete_chunks_by_source(source_type: str, source_id: str) -> int:
    """Elimina todos los chunks de una fuente específica (para re-ingestar)."""
    conn = await asyncpg.connect(DB_URL, ssl="require")
    try:
        result = await conn.execute(
            "DELETE FROM document_chunks WHERE source_type = $1 AND source_id = $2",
            source_type, source_id
        )
        return int(result.split()[-1])
    finally:
        await conn.close()


def format_retrieval_context(results: list[dict], label: str = "CONTEXTO HISTÓRICO RELEVANTE") -> str:
    """Formatea los resultados de retrieve() para inyectar en un prompt."""
    if not results:
        return ""
    
    lines = [f"\n\n--- {label} ---"]
    for i, r in enumerate(results, 1):
        sim_pct = int(r["similarity"] * 100)
        lines.append(f"\n[{i}] Similitud: {sim_pct}% | Tipo: {r['source_type']} | Fuente: {r['source_id']}")
        lines.append(r["content"])
    lines.append("--- FIN CONTEXTO ---\n")
    return "\n".join(lines)
