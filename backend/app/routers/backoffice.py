from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from app.database import get_db
from app.models import User, SuccessCase, ClientPortfolio, Opportunity, AgentOutput, Proposal

router = APIRouter(prefix="/backoffice", tags=["backoffice"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    nombre: str
    email: str
    whatsapp: Optional[str] = None
    pais: str
    rol: str

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    whatsapp: Optional[str] = None
    pais: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None

class SuccessCaseCreate(BaseModel):
    id: str
    cliente: str
    industria: str
    tipo_propuesta: str
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None

class SuccessCaseUpdate(BaseModel):
    cliente: Optional[str] = None
    industria: Optional[str] = None
    tipo_propuesta: Optional[str] = None
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None
    activo: Optional[bool] = None

class ClientPortfolioCreate(BaseModel):
    nombre: str
    industria: Optional[str] = None
    logo_url: Optional[str] = None
    pais: Optional[str] = None

class ClientPortfolioUpdate(BaseModel):
    nombre: Optional[str] = None
    industria: Optional[str] = None
    logo_url: Optional[str] = None
    pais: Optional[str] = None
    activo: Optional[bool] = None

class OpportunityCreate(BaseModel):
    nombre_proyecto: str
    cliente_nombre: str
    cliente_industria: Optional[str] = None
    cliente_pais: Optional[str] = None
    crm_context: Optional[str] = None
    tipo_proyecto: Optional[str] = None
    se_id: Optional[UUID] = None
    am_id: Optional[UUID] = None

class OpportunityUpdate(BaseModel):
    nombre_proyecto: Optional[str] = None
    cliente_nombre: Optional[str] = None
    cliente_industria: Optional[str] = None
    cliente_pais: Optional[str] = None
    crm_context: Optional[str] = None
    tipo_proyecto: Optional[str] = None
    estado: Optional[str] = None
    se_id: Optional[UUID] = None
    am_id: Optional[UUID] = None


# ── Usuarios ──────────────────────────────────────────────────────────────────

@router.get("/usuarios")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.nombre))
    return [
        {
            "id": str(u.id), "nombre": u.nombre, "email": u.email,
            "whatsapp": u.whatsapp, "pais": u.pais, "rol": u.rol,
            "activo": u.activo, "created_at": u.created_at.isoformat()
        }
        for u in result.scalars().all()
    ]

@router.post("/usuarios")
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user = User(**data.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "nombre": user.nombre, "email": user.email}

@router.patch("/usuarios/{user_id}")
async def update_user(user_id: UUID, data: UserUpdate, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    return {"ok": True}


# ── Casos de éxito ────────────────────────────────────────────────────────────

@router.get("/casos-exito")
async def list_cases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SuccessCase).order_by(SuccessCase.id))
    return [
        {
            "id": c.id, "cliente": c.cliente, "industria": c.industria,
            "tipo_propuesta": c.tipo_propuesta, "descripcion": c.descripcion,
            "logo_url": c.logo_url, "activo": c.activo
        }
        for c in result.scalars().all()
    ]

@router.post("/casos-exito")
async def create_case(data: SuccessCaseCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.get(SuccessCase, data.id)
    if existing:
        raise HTTPException(status_code=400, detail="ID ya existe")
    case = SuccessCase(**data.model_dump())
    db.add(case)
    await db.commit()
    return {"id": case.id}

@router.patch("/casos-exito/{case_id}")
async def update_case(case_id: str, data: SuccessCaseUpdate, db: AsyncSession = Depends(get_db)):
    case = await db.get(SuccessCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(case, field, value)
    await db.commit()
    return {"ok": True}


# ── Portafolio ────────────────────────────────────────────────────────────────

@router.get("/portafolio")
async def list_portfolio(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClientPortfolio).order_by(ClientPortfolio.nombre))
    return [
        {
            "id": str(c.id), "nombre": c.nombre, "industria": c.industria,
            "logo_url": c.logo_url, "pais": c.pais, "activo": c.activo
        }
        for c in result.scalars().all()
    ]

@router.post("/portafolio")
async def create_portfolio(data: ClientPortfolioCreate, db: AsyncSession = Depends(get_db)):
    client = ClientPortfolio(**data.model_dump())
    db.add(client)
    await db.commit()
    return {"id": str(client.id)}

@router.patch("/portafolio/{client_id}")
async def update_portfolio(client_id: UUID, data: ClientPortfolioUpdate, db: AsyncSession = Depends(get_db)):
    client = await db.get(ClientPortfolio, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    await db.commit()
    return {"ok": True}


# ── Oportunidades ─────────────────────────────────────────────────────────────

@router.get("/oportunidades")
async def list_opportunities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunity).order_by(Opportunity.updated_at.desc())
    )
    opps = result.scalars().all()
    out = []
    for o in opps:
        se = await db.get(User, o.se_id) if o.se_id else None
        am = await db.get(User, o.am_id) if o.am_id else None
        out.append({
            "id": str(o.id),
            "nombre_proyecto": o.nombre_proyecto,
            "cliente_nombre": o.cliente_nombre,
            "cliente_industria": o.cliente_industria,
            "cliente_pais": o.cliente_pais,
            "tipo_proyecto": o.tipo_proyecto,
            "estado": o.estado,
            "se": {"id": str(se.id), "nombre": se.nombre} if se else None,
            "am": {"id": str(am.id), "nombre": am.nombre} if am else None,
            "created_at": o.created_at.isoformat(),
            "updated_at": o.updated_at.isoformat(),
        })
    return out

@router.post("/oportunidades")
async def create_opportunity(data: OpportunityCreate, db: AsyncSession = Depends(get_db)):
    opp = Opportunity(**data.model_dump())
    db.add(opp)
    await db.commit()
    return {"id": str(opp.id)}

@router.get("/oportunidades/{opp_id}")
async def get_opportunity(opp_id: UUID, db: AsyncSession = Depends(get_db)):
    opp = await db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")
    outputs = await db.execute(
        select(AgentOutput)
        .where(AgentOutput.opportunity_id == opp_id)
        .order_by(AgentOutput.agente, AgentOutput.version.desc())
    )
    proposals = await db.execute(
        select(Proposal)
        .where(Proposal.opportunity_id == opp_id)
        .order_by(Proposal.version.desc())
    )
    se = await db.get(User, opp.se_id) if opp.se_id else None
    am = await db.get(User, opp.am_id) if opp.am_id else None
    return {
        "id": str(opp.id),
        "nombre_proyecto": opp.nombre_proyecto,
        "cliente_nombre": opp.cliente_nombre,
        "cliente_industria": opp.cliente_industria,
        "cliente_pais": opp.cliente_pais,
        "crm_context": opp.crm_context,
        "tipo_proyecto": opp.tipo_proyecto,
        "estado": opp.estado,
        "se": {"id": str(se.id), "nombre": se.nombre, "email": se.email} if se else None,
        "am": {"id": str(am.id), "nombre": am.nombre, "email": am.email} if am else None,
        "agent_outputs": [
            {
                "id": str(a.id), "agente": a.agente,
                "version": a.version, "es_activo": a.es_activo,
                "output": a.output,
                "input_snapshot": a.input_snapshot,
                "created_at": a.created_at.isoformat()
            }
            for a in outputs.scalars().all()
        ],
        "proposals": [
            {
                "id": str(p.id), "version": p.version,
                "review_status": p.review_status,
                "review_token": str(p.review_token),
                "created_at": p.created_at.isoformat()
            }
            for p in proposals.scalars().all()
        ],
        "created_at": opp.created_at.isoformat(),
        "updated_at": opp.updated_at.isoformat(),
    }

@router.patch("/oportunidades/{opp_id}")
async def update_opportunity(opp_id: UUID, data: OpportunityUpdate, db: AsyncSession = Depends(get_db)):
    opp = await db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(opp, field, value)
    await db.commit()
    return {"ok": True}


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func

    mes_actual = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    estados = await db.execute(
        select(Opportunity.estado, func.count(Opportunity.id))
        .group_by(Opportunity.estado)
    )
    propuestas_mes = await db.execute(
        select(func.count(Proposal.id))
        .where(Proposal.created_at >= mes_actual)
    )
    ses = await db.execute(
        select(User.nombre, func.count(Opportunity.id).label("total"))
        .join(Opportunity, Opportunity.se_id == User.id)
        .where(User.rol == "SE")
        .group_by(User.nombre)
        .order_by(func.count(Opportunity.id).desc())
    )

    return {
        "oportunidades_por_estado": {e: c for e, c in estados.all()},
        "propuestas_este_mes": propuestas_mes.scalar() or 0,
        "ses_activos": [{"nombre": n, "oportunidades": t} for n, t in ses.all()],
    }
