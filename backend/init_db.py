import asyncio
import os
import ssl
from dotenv import load_dotenv

load_dotenv()

import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.models import SuccessCase, ClientPortfolio, User
from app.database import Base

HOST = os.getenv("DB_HOST", "proposal-engine-db.cluster-c2pkieg846gv.us-east-1.rds.amazonaws.com")
USER = os.getenv("DB_USER", "proposaladmin")
PASSWORD = os.getenv("DB_PASSWORD", "1097780927Ma_")
DB_NAME = os.getenv("DB_NAME", "proposal_engine")

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

DATABASE_URL = f"postgresql+asyncpg://{USER}:{PASSWORD}@{HOST}:5432/{DB_NAME}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={"ssl": ssl_ctx}
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


SUCCESS_CASES = [
    {"id": "CASO-CLOUD-001", "cliente": "Experian Perú",     "industria": "Finanzas",          "tipo_propuesta": "CLOUD", "descripcion": "Migración y optimización de infraestructura AWS para operaciones de crédito."},
    {"id": "CASO-CLOUD-002", "cliente": "Tiendas Isimo",     "industria": "Retail",             "tipo_propuesta": "CLOUD", "descripcion": "Administración y gobierno de cuenta AWS para cadena de tiendas."},
    {"id": "CASO-CLOUD-003", "cliente": "Empsii",            "industria": "Tecnología",         "tipo_propuesta": "CLOUD", "descripcion": "Migración completa de workloads on-premise a AWS."},
    {"id": "CASO-CLOUD-004", "cliente": "Diners Club",       "industria": "Finanzas",           "tipo_propuesta": "CLOUD", "descripcion": "Infraestructura AWS de alta disponibilidad para servicios financieros."},
    {"id": "CASO-CLOUD-005", "cliente": "Morado",            "industria": "Fintech",            "tipo_propuesta": "CLOUD", "descripcion": "Infraestructura cloud-native para plataforma fintech."},
    {"id": "CASO-DATA-001",  "cliente": "Pulso Salud",       "industria": "Salud",              "tipo_propuesta": "DATA",  "descripcion": "Implementación de agentes IA y GenAI para automatización clínica."},
    {"id": "CASO-DATA-002",  "cliente": "Konecta",           "industria": "BPO",                "tipo_propuesta": "DATA",  "descripcion": "Plataforma de analytics y data engineering para operaciones BPO."},
    {"id": "CASO-DATA-003",  "cliente": "Innova Schools",    "industria": "Educación",          "tipo_propuesta": "DATA",  "descripcion": "Analytics educativo y dashboards para red de colegios."},
    {"id": "CASO-DATA-004",  "cliente": "Morado",            "industria": "Fintech",            "tipo_propuesta": "DATA",  "descripcion": "Centralización de datos y data lake para plataforma fintech."},
    {"id": "CASO-DATA-005",  "cliente": "Zytrust",           "industria": "Tecnología",         "tipo_propuesta": "DATA",  "descripcion": "Migración analítica y modernización de plataforma de datos."},
    {"id": "CASO-SW-001",    "cliente": "Innova Schools",    "industria": "Educación",          "tipo_propuesta": "SW",    "descripcion": "Desarrollo de plataforma educativa a medida sobre AWS."},
    {"id": "CASO-SW-002",    "cliente": "Become Digital",    "industria": "Tecnología",         "tipo_propuesta": "SW",    "descripcion": "Desarrollo de software a medida para agencia digital."},
    {"id": "CASO-SW-003",    "cliente": "FullMovil",         "industria": "Telecomunicaciones", "tipo_propuesta": "SW",    "descripcion": "Modernización de aplicaciones móviles sobre infraestructura AWS."},
]

CLIENT_PORTFOLIO = [
    {"nombre": "Experian",       "industria": "Finanzas",          "pais": "PE"},
    {"nombre": "Diners Club",    "industria": "Finanzas",          "pais": "CO"},
    {"nombre": "Morado",         "industria": "Fintech",           "pais": "PE"},
    {"nombre": "Innova Schools", "industria": "Educación",         "pais": "PE"},
    {"nombre": "Konecta",        "industria": "BPO",               "pais": "CO"},
    {"nombre": "Pulso Salud",    "industria": "Salud",             "pais": "CO"},
    {"nombre": "Zytrust",        "industria": "Tecnología",        "pais": "PE"},
    {"nombre": "Empsii",         "industria": "Tecnología",        "pais": "CO"},
    {"nombre": "Tiendas Isimo",  "industria": "Retail",            "pais": "CO"},
    {"nombre": "Become Digital", "industria": "Tecnología",        "pais": "CO"},
    {"nombre": "FullMovil",      "industria": "Telecomunicaciones","pais": "CO"},
]

USERS = [
    {"nombre": "Manuela Ballen",   "email": "manuela.ballen@applying.cloud",   "pais": "CO", "rol": "SE", "whatsapp": "+573001234567"},
    {"nombre": "Estefano Bullón",  "email": "estefano.bullon@applying.cloud",  "pais": "PE", "rol": "SE", "whatsapp": None},
    {"nombre": "Vladimir Vivar",   "email": "vladimir.vivar@applying.cloud",   "pais": "CO", "rol": "ADMIN", "whatsapp": None},
]


async def create_database_if_not_exists():
    """Conecta a postgres y crea proposal_engine si no existe."""
    conn = await asyncpg.connect(
        host=HOST, port=5432,
        user=USER, password=PASSWORD,
        database="postgres", ssl=ssl_ctx
    )
    exists = await conn.fetchval(
        "SELECT 1 FROM pg_database WHERE datname=$1", DB_NAME
    )
    if not exists:
        await conn.execute(f'CREATE DATABASE "{DB_NAME}"')
        print(f"✓ Base de datos '{DB_NAME}' creada")
    else:
        print(f"✓ Base de datos '{DB_NAME}' ya existe")
    await conn.close()


async def init():
    await create_database_if_not_exists()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✓ Tablas creadas")

    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        # Casos de éxito
        for data in SUCCESS_CASES:
            exists = await session.get(SuccessCase, data["id"])
            if not exists:
                session.add(SuccessCase(**data))

        # Portafolio
        result = await session.execute(select(ClientPortfolio))
        if not result.scalars().first():
            for data in CLIENT_PORTFOLIO:
                session.add(ClientPortfolio(**data))

        # Usuarios base
        for data in USERS:
            result = await session.execute(select(User).where(User.email == data["email"]))
            if not result.scalars().first():
                session.add(User(**data))

        await session.commit()
        print("✓ Datos maestros cargados")


if __name__ == "__main__":
    asyncio.run(init())