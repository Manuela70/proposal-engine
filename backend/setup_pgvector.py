"""
Setup pgvector en Aurora PostgreSQL.
Ejecutar UNA SOLA VEZ: python setup_pgvector.py
"""
import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

# Parsear la URL de asyncpg
DB_URL = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


async def setup():
    conn = await asyncpg.connect(DB_URL, ssl="require")

    print("Habilitando extensión pgvector...")
    await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    print("Creando tabla document_chunks...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content     TEXT NOT NULL,
            source_type VARCHAR(50) NOT NULL,  -- success_case | portfolio | proposal | estimation
            source_id   VARCHAR(100),           -- ID del registro origen
            metadata    JSONB,                  -- campos extra: cliente, tipo_proyecto, etc.
            embedding   vector(1024),
            created_at  TIMESTAMPTZ DEFAULT now()
        );
    """)

    print("Creando índice HNSW para búsqueda eficiente...")
    await conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_chunks_embedding
        ON document_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """)

    print("Creando índice en source_type para filtrar...")
    await conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_chunks_source_type
        ON document_chunks (source_type);
    """)

    await conn.close()
    print("\n✓ pgvector configurado correctamente.")
    print("✓ Tabla document_chunks lista.")
    print("✓ Índices creados.")
    print("\nPróximo paso: python ingest_kb.py")


if __name__ == "__main__":
    asyncio.run(setup())
