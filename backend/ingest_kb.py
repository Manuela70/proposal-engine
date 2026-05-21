"""
Script de ingesta para la Knowledge Base del Proposal Engine.

Fuentes:
  1. success_cases    — desde Aurora BD (ya existente)
  2. client_portfolio — desde Aurora BD (ya existente)  
  3. estimaciones     — desde Excel (pendiente de operaciones)
  4. documentos       — PDFs/DOCXs en ./kb_docs/

Uso:
  python ingest_kb.py                      # Ingestar todo
  python ingest_kb.py --source casos       # Solo casos de éxito
  python ingest_kb.py --source estimaciones --file estimaciones.xlsx
  python ingest_kb.py --source docs --dir ./kb_docs/
"""
import asyncio
import asyncpg
import os
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

sys.path.insert(0, str(Path(__file__).parent))
from app.utils.rag import ingest_chunk, delete_chunks_by_source, embed_text


# ── Formatters — convierten registros en texto descriptivo para embedding ──────

def format_success_case(row: dict) -> str:
    return f"""Caso de éxito Applying Consulting: {row.get('cliente', '')}
Industria: {row.get('industria', '')}
Tipo de proyecto: {row.get('tipo_propuesta', '')}
Descripción: {row.get('descripcion', '')}
Servicios AWS involucrados: {row.get('servicios_aws', '')}
Duración real: {row.get('duracion_semanas', '')} semanas
Horas Applying: {row.get('horas_totales', '')}h
Resultado medible: {row.get('resultado_medible', '')}
País: {row.get('pais', '')}"""


def format_portfolio(row: dict) -> str:
    return f"""Cliente del portafolio Applying Consulting: {row.get('nombre', '')}
Industria: {row.get('industria', '')}
País: {row.get('pais', '')}"""


def format_estimation(row: dict) -> str:
    roles = row.get('roles', '')
    return f"""Estimación histórica de proyecto Applying Consulting
Proyecto: {row.get('nombre_proyecto', '')}
Cliente: {row.get('cliente', '')}
Tipo: {row.get('tipo_proyecto', '')}
Descripción: {row.get('descripcion', '')}
Horas totales reales: {row.get('horas_reales', '')}h
Horas estimadas: {row.get('horas_estimadas', '')}h
Duración real: {row.get('duracion_real_semanas', '')} semanas
Costo total: ${row.get('costo_usd', '')} USD
Desglose por rol: {roles}
Lecciones aprendidas: {row.get('lecciones', '')}"""


# ── Ingesta desde Aurora BD ────────────────────────────────────────────────────

async def ingest_success_cases():
    print("\n── Ingesta: Casos de Éxito ──")
    conn = await asyncpg.connect(DB_URL, ssl="require")
    rows = await conn.fetch("SELECT * FROM success_cases WHERE activo = true")
    await conn.close()

    count = 0
    for row in rows:
        row_dict = dict(row)
        text = format_success_case(row_dict)
        source_id = str(row_dict["id"])

        await delete_chunks_by_source("success_case", source_id)
        await ingest_chunk(
            content=text,
            source_type="success_case",
            source_id=source_id,
            metadata={
                "cliente": row_dict.get("cliente"),
                "industria": row_dict.get("industria"),
                "tipo": row_dict.get("tipo_propuesta"),
            }
        )
        count += 1
        print(f"  ✓ {row_dict.get('cliente')} ({row_dict.get('tipo_propuesta')})")

    print(f"  Total casos de éxito ingestionados: {count}")


async def ingest_portfolio():
    print("\n── Ingesta: Portafolio de Clientes ──")
    conn = await asyncpg.connect(DB_URL, ssl="require")
    rows = await conn.fetch("SELECT * FROM client_portfolio WHERE activo = true")
    await conn.close()

    count = 0
    for row in rows:
        row_dict = dict(row)
        text = format_portfolio(row_dict)
        source_id = str(row_dict["id"])

        await delete_chunks_by_source("portfolio", source_id)
        await ingest_chunk(
            content=text,
            source_type="portfolio",
            source_id=source_id,
            metadata={
                "nombre": row_dict.get("nombre"),
                "industria": row_dict.get("industria"),
                "pais": row_dict.get("pais"),
            }
        )
        count += 1
        print(f"  ✓ {row_dict.get('nombre')}")

    print(f"  Total clientes ingestionados: {count}")


# ── Ingesta desde Excel de estimaciones ───────────────────────────────────────

async def ingest_estimations(filepath: str):
    print(f"\n── Ingesta: Estimaciones históricas desde {filepath} ──")
    import openpyxl
    wb = openpyxl.load_workbook(filepath)
    ws = wb.active

    headers = [cell.value for cell in ws[1]]
    count = 0

    for row in ws.iter_rows(min_row=2, values_only=True):
        row_dict = dict(zip(headers, row))
        if not row_dict.get("nombre_proyecto"):
            continue

        text = format_estimation(row_dict)
        source_id = f"est-{row_dict.get('nombre_proyecto', '').replace(' ', '-')[:50]}"

        await delete_chunks_by_source("estimation", source_id)
        await ingest_chunk(
            content=text,
            source_type="estimation",
            source_id=source_id,
            metadata={
                "tipo_proyecto": row_dict.get("tipo_proyecto"),
                "horas_reales": row_dict.get("horas_reales"),
                "duracion_real_semanas": row_dict.get("duracion_real_semanas"),
            }
        )
        count += 1
        print(f"  ✓ {row_dict.get('nombre_proyecto')}")

    print(f"  Total estimaciones ingestionadas: {count}")


# ── Ingesta desde documentos (PDFs, DOCXs) ────────────────────────────────────

async def ingest_documents(docs_dir: str):
    print(f"\n── Ingesta: Documentos desde {docs_dir} ──")
    import boto3

    docs_path = Path(docs_dir)
    if not docs_path.exists():
        print(f"  ⚠ Directorio {docs_dir} no existe.")
        return

    session = boto3.Session(profile_name=os.getenv("AWS_PROFILE"))
    client = session.client("bedrock-runtime", region_name="us-east-1")

    SUPPORTED = [".pdf", ".docx", ".txt", ".md", ".csv", ".html"]
    files = [f for f in docs_path.iterdir() if f.suffix.lower() in SUPPORTED]

    if not files:
        print(f"  ⚠ No hay documentos soportados en {docs_dir}")
        return

    count = 0
    for filepath in files:
        print(f"  Procesando {filepath.name}...")
        try:
            with open(filepath, "rb") as f:
                file_bytes = f.read()

            ext = filepath.suffix.lower().lstrip(".")
            fmt_map = {"pdf": "pdf", "docx": "docx", "txt": "txt",
                       "md": "md", "csv": "csv", "html": "html"}
            fmt = fmt_map.get(ext, "txt")

            import re
            clean_name = re.sub(r'[^a-zA-Z0-9\s\-\(\)\[\]]', '', filepath.stem)[:100].strip() or "documento"

            response = client.converse(
                modelId="amazon.nova-pro-v1:0",
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "document": {
                                "format": fmt,
                                "name": clean_name,
                                "source": {"bytes": file_bytes}
                            }
                        },
                        {
                            "text": """Extrae y estructura el contenido de este documento en chunks de texto.
Para cada sección importante, escribe un párrafo descriptivo que incluya:
- El tema principal de la sección
- Los datos clave (números, tecnologías, resultados)
- El contexto del proyecto

Separa cada chunk con '---CHUNK---'.
Responde solo con el texto extraído."""
                        }
                    ]
                }]
            )

            raw = response["output"]["message"]["content"][0]["text"]
            chunks = [c.strip() for c in raw.split("---CHUNK---") if c.strip()]

            source_id = filepath.stem[:100]
            await delete_chunks_by_source("proposal", source_id)

            for i, chunk in enumerate(chunks):
                if len(chunk) < 50:
                    continue
                await ingest_chunk(
                    content=chunk,
                    source_type="proposal",
                    source_id=f"{source_id}-{i}",
                    metadata={"filename": filepath.name, "chunk_index": i}
                )

            count += 1
            print(f"  ✓ {filepath.name} — {len(chunks)} chunks")

        except Exception as e:
            print(f"  ✗ Error en {filepath.name}: {e}")

    print(f"  Total documentos ingestionados: {count}")


# ── Main ───────────────────────────────────────────────────────────────────────

async def main(args):
    source = args.source

    if source in (None, "casos"):
        await ingest_success_cases()

    if source in (None, "portafolio"):
        await ingest_portfolio()

    if source == "estimaciones":
        if not args.file:
            print("Error: --file requerido para estimaciones")
            return
        await ingest_estimations(args.file)

    if source == "docs":
        docs_dir = args.dir or "./kb_docs"
        await ingest_documents(docs_dir)

    print("\n✓ Ingesta completada.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["casos", "portafolio", "estimaciones", "docs"],
                        help="Fuente a ingestar (default: todas)")
    parser.add_argument("--file", help="Ruta al Excel de estimaciones")
    parser.add_argument("--dir", help="Directorio de documentos (default: ./kb_docs)")
    args = parser.parse_args()
    asyncio.run(main(args))
