import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Boolean, Text, Integer, DateTime,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    whatsapp: Mapped[str | None] = mapped_column(String(30), nullable=True)
    pais: Mapped[str] = mapped_column(String(2))  # CO | PE
    rol: Mapped[str] = mapped_column(String(10))  # SE | AM | ADMIN
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    opportunities_as_se: Mapped[list["Opportunity"]] = relationship("Opportunity", foreign_keys="Opportunity.se_id", back_populates="se")
    opportunities_as_am: Mapped[list["Opportunity"]] = relationship("Opportunity", foreign_keys="Opportunity.am_id", back_populates="am")


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre_proyecto: Mapped[str] = mapped_column(String(200))
    cliente_nombre: Mapped[str] = mapped_column(String(200))
    cliente_industria: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cliente_pais: Mapped[str | None] = mapped_column(String(2), nullable=True)
    crm_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo_proyecto: Mapped[str | None] = mapped_column(String(20), nullable=True)  # CLOUD | DATA | SW_DEV | AI_AGENT | ML
    estado: Mapped[str] = mapped_column(String(30), default="NUEVO")  # NUEVO | EN_PROGRESO | PROPUESTA_GENERADA | ENVIADA | GANADA | PERDIDA
    se_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    am_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    se: Mapped["User | None"] = relationship("User", foreign_keys=[se_id], back_populates="opportunities_as_se")
    am: Mapped["User | None"] = relationship("User", foreign_keys=[am_id], back_populates="opportunities_as_am")
    agent_outputs: Mapped[list["AgentOutput"]] = relationship("AgentOutput", back_populates="opportunity", cascade="all, delete-orphan")
    proposals: Mapped[list["Proposal"]] = relationship("Proposal", back_populates="opportunity", cascade="all, delete-orphan")


class AgentOutput(Base):
    __tablename__ = "agent_outputs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("opportunities.id"))
    agente: Mapped[str] = mapped_column(String(30))  # qualify | discovery | technical_base | solution_design | calculator | estimation | drawio
    version: Mapped[int] = mapped_column(Integer, default=1)
    input_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    output: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string o XML
    es_activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    opportunity: Mapped["Opportunity"] = relationship("Opportunity", back_populates="agent_outputs")

    __table_args__ = (
        UniqueConstraint("opportunity_id", "agente", "version", name="uq_agent_output_version"),
    )


class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("opportunities.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    html_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_token: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    review_status: Mapped[str] = mapped_column(String(30), default="PENDIENTE")  # PENDIENTE | EN_REVISION | APROBADA | CON_OBSERVACIONES
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    opportunity: Mapped["Opportunity"] = relationship("Opportunity", back_populates="proposals")
    reviews: Mapped[list["ProposalReview"]] = relationship("ProposalReview", back_populates="proposal", cascade="all, delete-orphan")
    success_cases: Mapped[list["ProposalSuccessCase"]] = relationship("ProposalSuccessCase", back_populates="proposal", cascade="all, delete-orphan")


class ProposalReview(Base):
    __tablename__ = "proposal_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("proposals.id"))
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_nombre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    proposal: Mapped["Proposal"] = relationship("Proposal", back_populates="reviews")


class SuccessCase(Base):
    __tablename__ = "success_cases"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)  # CASO-CLOUD-001
    cliente: Mapped[str] = mapped_column(String(100))
    industria: Mapped[str] = mapped_column(String(100))
    tipo_propuesta: Mapped[str] = mapped_column(String(20))
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    proposal_cases: Mapped[list["ProposalSuccessCase"]] = relationship("ProposalSuccessCase", back_populates="case")


class ClientPortfolio(Base):
    __tablename__ = "client_portfolio"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(100))
    industria: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    pais: Mapped[str | None] = mapped_column(String(2), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class ProposalSuccessCase(Base):
    __tablename__ = "proposal_success_cases"

    proposal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("proposals.id"), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(20), ForeignKey("success_cases.id"), primary_key=True)

    proposal: Mapped["Proposal"] = relationship("Proposal", back_populates="success_cases")
    case: Mapped["SuccessCase"] = relationship("SuccessCase", back_populates="proposal_cases")