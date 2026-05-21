# Proposal Engine — Applying Consulting

Motor de generación de propuestas técnico-comerciales impulsado por IA. Pipeline completo desde calificación de oportunidades hasta estimación de proyectos y diagramas de arquitectura AWS.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 + Tailwind CSS → AWS Amplify |
| Backend | FastAPI + Strands SDK → ECS Fargate |
| Modelo principal | Amazon Nova Pro (`amazon.nova-pro-v1:0`) via Bedrock |
| Modelo diagramas | Claude Sonnet 4.5 via Bedrock |
| Embeddings | Amazon Titan Embeddings v2 (`amazon.titan-embed-text-v2:0`) |
| Base de datos | Aurora PostgreSQL Serverless v2 + pgvector |
| Infraestructura | Terraform (pendiente) |

---

## Estructura del proyecto

```
proposal-engine/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   └── proposal_agent.py      # Prompts y funciones de todos los agentes
│   │   ├── routers/
│   │   │   ├── opportunity.py         # Endpoints del pipeline de agentes
│   │   │   └── backoffice.py          # CRUD backoffice
│   │   ├── utils/
│   │   │   ├── rag.py                 # embed(), retrieve(), ingest_chunk()
│   │   │   └── inject_estimation.py   # Inyección JSON → xlsx MS Project
│   │   ├── database.py                # Conexión async Aurora con SSL
│   │   ├── models.py                  # Modelos SQLAlchemy
│   │   └── main.py
│   ├── templates/                     # 5 plantillas xlsx MS Project por tipo
│   ├── init_db.py                     # Crea tablas + datos maestros
│   ├── setup_pgvector.py              # Habilita pgvector + crea document_chunks
│   ├── ingest_kb.py                   # Ingesta KB: casos de éxito, estimaciones, docs
│   ├── fix_encoding.py                # Corrige encoding UTF-8 en datos históricos
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── app/
│       ├── page.tsx                   # Hub de herramientas (landing)
│       ├── pipeline/
│       │   └── page.tsx               # Pipeline completo amarrado a oportunidad
│       ├── tools/
│       │   ├── calificador/           # Calificador Go/No Go independiente
│       │   ├── documento-tecnico/     # Generador de doc técnico base
│       │   ├── calculadora/           # Generador JSON para RPA calculator.aws
│       │   ├── diagrama/              # Generador de diagramas Draw.io
│       │   └── estimador/             # Estimador de horas y costos
│       ├── backoffice/                # Dashboard + CRUD usuarios, oportunidades, KB
│       └── components/
│           └── FileUpload.tsx         # Componente reutilizable extracción docs via Bedrock
└── infra/                             # Terraform (pendiente)
```

---

## Agentes implementados

| Endpoint | Agente | Función |
|---|---|---|
| `POST /api/opportunity/qualify` | Calificador | Viabilidad, complejidad, Go/No Go |
| `POST /api/opportunity/discovery` | Discovery | Preguntas técnicas y funcionales |
| `POST /api/opportunity/technical-base` | Doc técnico | Requerimientos, riesgos, actores |
| `POST /api/opportunity/solution-design` | Arquitecto | Diseño AWS + WAF + valor de negocio |
| `POST /api/opportunity/calculator` | Calculadora | JSON para extensión RPA calculator.aws |
| `POST /api/opportunity/estimation` | Estimador | Horas, costos, plan MS Project (.xlsx) |
| `POST /api/opportunity/drawio` | Diagrama | XML Draw.io con iconos AWS oficiales |
| `POST /api/opportunity/drawio/refine` | Refinador | Ajuste libre del diagrama |
| `POST /api/opportunity/estimation/refine` | Refinador | Ajuste libre de la estimación |
| `POST /api/opportunity/estimation/export` | Exportador | Descarga .xlsx MS Project |
| `POST /api/opportunity/extract-context` | Extractor | Lee docs via Bedrock, sin persistir archivos |

---

## Schema de base de datos

```
users                  — SEs, AMs, ADMINs
opportunities          — oportunidades con contexto CRM y estado
agent_outputs          — historial versionado de outputs por agente
proposals              — propuestas HTML generadas (pendiente)
proposal_reviews       — observaciones del líder de estudio (pendiente)
success_cases          — casos de éxito para la KB
client_portfolio       — portafolio de clientes
document_chunks        — chunks + embeddings para RAG (pgvector)
```

---

## Setup local

### Prerrequisitos

- Python 3.11+
- Node.js 18+
- AWS CLI configurado con perfil `AdministratorAccess-467449736571`
- Acceso a Aurora PostgreSQL en `us-east-1`

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux

pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con DATABASE_URL y AWS_PROFILE

# Crear tablas y datos maestros
python init_db.py

# Configurar pgvector (una sola vez)
python setup_pgvector.py

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Knowledge Base (RAG)

El motor de propuestas usa RAG con Aurora pgvector + Titan Embeddings v2 para enriquecer el contexto de los agentes de solución y estimación con proyectos similares anteriores.

### Ingesta

```bash
cd backend

# Ingestar casos de éxito y portafolio (desde Aurora)
python ingest_kb.py

# Ingestar estimaciones históricas (desde Excel)
python ingest_kb.py --source estimaciones --file estimaciones.xlsx

# Ingestar propuestas anteriores (PDFs/DOCXs)
mkdir kb_docs
# Copiar documentos a kb_docs/
python ingest_kb.py --source docs
```

### Cómo funciona

1. Antes de llamar al agente de solución design o estimador, el backend hace `retrieve()` con el resumen del proyecto como query
2. Los 3-5 chunks más similares se inyectan al final del prompt como contexto histórico
3. El agente calibra su respuesta basándose en proyectos reales anteriores
4. Si la KB está vacía el agente funciona igual — el RAG es completamente opcional

---

## Variables de entorno

```env
# backend/.env
AWS_PROFILE=AdministratorAccess-467449736571
AWS_REGION=us-east-1
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/proposal_engine
```

---

## URLs de producción

| Servicio | URL |
|---|---|
| Frontend (Amplify) | `https://main.d1xg7rdqzh0xm0.amplifyapp.com` |
| Backend (ALB) | `http://proposal-engine-alb-499925788.us-east-1.elb.amazonaws.com` |
| Backend HTTPS | `https://api.proposals.applying.cloud` *(pendiente — bloqueado por DNS)* |

---

## Backlog pendiente

- [ ] **HTTPS** — subdominio `api.proposals.applying.cloud` + ACM + ALB listener (bloqueado por acceso DNS)
- [ ] **Agente de Propuesta HTML** — branding Applying, 18 secciones, export PDF
- [ ] **Vista del líder de estudio** — revisión por token público
- [ ] **Microsoft Entra ID SSO** — proteger pipeline y backoffice, saludo personalizado
- [ ] **Deploy ECS actualizado** — contenedor con nuevos agentes, BD y pgvector
- [ ] **Dockerfile** — agregar dependencias: sqlalchemy, asyncpg, openpyxl, pgvector

---

## Flujo del pipeline

```
CRM Context
    ↓
[1] Calificar → Go / No Go
    ↓
[2] Discovery → Preguntas para la reunión
    ↓
[3] Notas de reunión → Documento Técnico Base
    ↓
[4] Solución Design → Arquitectura AWS + RAG
    ↓
    ├── [5a] JSON Calculadora → Extensión RPA chrome
    ├── [5b] Estimación → xlsx MS Project + RAG
    └── [5c] Diagrama → .drawio con iconos AWS
```

Cada card del pipeline tiene estado: **Confirmar ✓** / **⚠ Desactualizado** / **↺ Actualizar**.
Si el contexto del cliente cambia, todos los agentes aguas abajo se marcan automáticamente como desactualizados.

---

## Herramientas independientes

Además del pipeline completo, cada agente está disponible como herramienta suelta en `/tools/*`. Todas tienen:
- Input en lenguaje natural (no JSON)
- Botón "Cargar ejemplo"
- Botón "Adjuntar documento" — extrae contexto de PDFs/DOCXs via Bedrock sin guardar el archivo
- Botón "+ Convertir en oportunidad" — crea oportunidad en BD y redirige al pipeline con el output precargado

---

*Applying Consulting — AWS Advanced Tier Services Partner — Perú y Colombia*
