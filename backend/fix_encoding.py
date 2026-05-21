"""
Script para corregir encoding UTF-8 en nombres de proyectos y clientes.
Ejecutar una sola vez: python fix_encoding.py
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def fix_encoding():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        # Ver registros con encoding roto
        result = await conn.execute(text("SELECT id, nombre_proyecto, cliente_nombre FROM opportunities"))
        rows = result.fetchall()
        
        fixed = 0
        for row in rows:
            opp_id, nombre, cliente = row
            try:
                # Detectar si tiene encoding roto (latin1 interpretado como UTF-8)
                nombre_fixed = nombre.encode('latin1').decode('utf-8') if nombre else nombre
                cliente_fixed = cliente.encode('latin1').decode('utf-8') if cliente else cliente
                
                if nombre_fixed != nombre or cliente_fixed != cliente:
                    await conn.execute(
                        text("UPDATE opportunities SET nombre_proyecto = :n, cliente_nombre = :c WHERE id = :id"),
                        {"n": nombre_fixed, "c": cliente_fixed, "id": str(opp_id)}
                    )
                    print(f"Corregido: {nombre} → {nombre_fixed} | {cliente} → {cliente_fixed}")
                    fixed += 1
            except (UnicodeDecodeError, UnicodeEncodeError):
                print(f"No se pudo corregir: {nombre} | {cliente}")
        
        print(f"\nTotal corregidos: {fixed}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_encoding())
