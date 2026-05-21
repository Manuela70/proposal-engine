from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from app.agents.proposal_agent import qualify_opportunity, generate_discovery_questions
from app.database import get_db
from app.models import AgentOutput, Opportunity
import json
import io

router = APIRouter()


# ── Helper de persistencia ────────────────────────────────────────────────────

async def save_output(
    db: AsyncSession,
    opportunity_id: Optional[UUID],
    agente: str,
    input_snapshot: dict,
    output: str
):
    if not opportunity_id:
        return
    # Desactivar versiones anteriores
    await db.execute(
        update(AgentOutput)
        .where(AgentOutput.opportunity_id == opportunity_id)
        .where(AgentOutput.agente == agente)
        .values(es_activo=False)
    )
    # Obtener próxima versión
    result = await db.execute(
        select(AgentOutput)
        .where(AgentOutput.opportunity_id == opportunity_id)
        .where(AgentOutput.agente == agente)
        .order_by(AgentOutput.version.desc())
    )
    last = result.scalars().first()
    next_version = (last.version + 1) if last else 1

    db.add(AgentOutput(
        opportunity_id=opportunity_id,
        agente=agente,
        version=next_version,
        input_snapshot=input_snapshot,
        output=output,
        es_activo=True
    ))
    await db.commit()


# ── Modelos ───────────────────────────────────────────────────────────────────

class OpportunityInput(BaseModel):
    crm_context: str
    opportunity_id: Optional[UUID] = None

class TechnicalBaseInput(BaseModel):
    crm_context: str
    discovery_notes: str
    opportunity_id: Optional[UUID] = None

class SolutionDesignInput(BaseModel):
    technical_base: dict
    opportunity_id: Optional[UUID] = None

class SolutionDesignInputCalc(BaseModel):
    solution_design: dict
    opportunity_id: Optional[UUID] = None

class DrawioInput(BaseModel):
    solution_design: dict
    opportunity_id: Optional[UUID] = None

class DrawioRefineInput(BaseModel):
    current_xml: str
    feedback: str
    opportunity_id: Optional[UUID] = None

class EstimationInput(BaseModel):
    solution_design: dict
    technical_base: dict
    opportunity_id: Optional[UUID] = None

class RefinementInput(BaseModel):
    current_estimation: dict
    feedback: str
    opportunity_id: Optional[UUID] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/opportunity/qualify")
async def qualify(input: OpportunityInput, db: AsyncSession = Depends(get_db)):
    try:
        result = qualify_opportunity(input.crm_context)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        await save_output(db, input.opportunity_id, "qualify",
                          {"crm_context": input.crm_context}, json.dumps(parsed, ensure_ascii=False))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/discovery")
async def discovery(input: OpportunityInput, db: AsyncSession = Depends(get_db)):
    try:
        result = generate_discovery_questions(input.crm_context)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        await save_output(db, input.opportunity_id, "discovery",
                          {"crm_context": input.crm_context}, json.dumps(parsed, ensure_ascii=False))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/technical-base")
async def technical_base(input: TechnicalBaseInput, db: AsyncSession = Depends(get_db)):
    try:
        from app.agents.proposal_agent import generate_technical_base
        result = generate_technical_base(input.crm_context, input.discovery_notes)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        await save_output(db, input.opportunity_id, "technical_base",
                          {"crm_context": input.crm_context, "discovery_notes": input.discovery_notes},
                          json.dumps(parsed, ensure_ascii=False))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/solution-design")
async def solution_design(input: SolutionDesignInput, db: AsyncSession = Depends(get_db)):
    try:
        from app.agents.proposal_agent import generate_solution_design
        from app.utils.rag import retrieve, format_retrieval_context

        # RAG — recuperar arquitecturas similares de casos de éxito
        rag_context = ""
        try:
            query = input.technical_base.get("resumen_ejecutivo", "")
            if query:
                results = await retrieve(query, source_types=["success_case"], k=3)
                rag_context = format_retrieval_context(results, "ARQUITECTURAS SIMILARES DE PROYECTOS ANTERIORES")
        except Exception:
            pass

        result = generate_solution_design(input.technical_base, rag_context)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        await save_output(db, input.opportunity_id, "solution_design",
                          {"technical_base": input.technical_base},
                          json.dumps(parsed, ensure_ascii=False))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/calculator")
async def calculator(input: SolutionDesignInputCalc, db: AsyncSession = Depends(get_db)):
    try:
        from app.agents.proposal_agent import generate_calculator_json
        result = generate_calculator_json(input.solution_design)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        await save_output(db, input.opportunity_id, "calculator",
                          {"solution_design": input.solution_design},
                          json.dumps(parsed, ensure_ascii=False))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/drawio")
async def drawio(input: DrawioInput, db: AsyncSession = Depends(get_db)):
    try:
        from app.agents.proposal_agent import generate_drawio
        import xml.etree.ElementTree as ET
        import re
        
        result = generate_drawio(input.solution_design)
        xml = result.strip()
        
        # Limpiar markdown
        if xml.startswith("```"):
            xml = "\n".join(xml.split("\n")[1:])
        if xml.endswith("```"):
            xml = xml.strip()
            if xml.endswith("```"):
                xml = xml[:-3]
        xml = xml.strip()
        
        print("=== XML ORIGINAL (primeras 500 chars) ===")
        print(xml[:500])
        
        # Corrección automática de errores comunes
        # 1. Corregir <mxGeometry .../></mxGeometry> a <mxGeometry .../>
        xml = re.sub(r'<mxGeometry([^>]*)/>\s*</mxGeometry>', r'<mxGeometry\1 />', xml)
        
        # 2. Asegurar que mxGeometry auto-cerrada no tenga cierre
        xml = re.sub(r'<mxGeometry([^>]*)as="geometry"\s*/>\s*</mxGeometry>', r'<mxGeometry\1as="geometry" />', xml)
        
        # 3. Corregir cualquier doble cierre de mxGeometry
        xml = re.sub(r'</mxGeometry>\s*</mxGeometry>', r'</mxGeometry>', xml)
        
        print("=== XML DESPUÉS DE REGEX (primeras 500 chars) ===")
        print(xml[:500])
        
        # Validar que sea XML válido
        try:
            ET.fromstring(xml)
            print("=== XML VÁLIDO ===")
        except ET.ParseError as e:
            print(f"=== ERROR DE PARSING: {e} ===")
            # Intentar una corrección más agresiva
            lines = xml.split('\n')
            corrected_lines = []
            for i, line in enumerate(lines):
                # Si la línea tiene /> y luego </mxGeometry>, quitar el cierre
                if '/>' in line and '</mxGeometry>' in line:
                    print(f"Corrigiendo línea {i}: {line[:100]}")
                    line = line.replace('</mxGeometry>', '')
                corrected_lines.append(line)
            xml = '\n'.join(corrected_lines)
            
            # Validar de nuevo
            try:
                ET.fromstring(xml)
                print("=== XML VÁLIDO DESPUÉS DE CORRECCIÓN AGRESIVA ===")
            except ET.ParseError as e2:
                print(f"=== ERROR FINAL: {e2} ===")
                # Guardar el XML problemático para debugging
                with open("debug_xml_error.xml", "w", encoding="utf-8") as f:
                    f.write(xml)
                print("XML guardado en debug_xml_error.xml")
                raise ValueError(f"No se pudo corregir el XML: {str(e2)}")
        
        await save_output(db, input.opportunity_id, "drawio",
                          {"solution_design": input.solution_design}, xml)
        return {"xml": xml}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/drawio/refine")
async def drawio_refine(input: DrawioRefineInput, db: AsyncSession = Depends(get_db)):
    try:
        from app.agents.proposal_agent import refine_drawio
        import xml.etree.ElementTree as ET
        import re
        
        result = refine_drawio(input.current_xml, input.feedback)
        xml = result.strip()
        
        # Limpiar markdown
        if xml.startswith("```"):
            xml = "\n".join(xml.split("\n")[1:])
        if xml.endswith("```"):
            xml = xml.strip()
            if xml.endswith("```"):
                xml = xml[:-3]
        xml = xml.strip()
        
        # Corrección automática de errores comunes
        xml = re.sub(r'<mxGeometry([^>]*)/>\s*</mxGeometry>', r'<mxGeometry\1 />', xml)
        xml = re.sub(r'<mxGeometry([^>]*)as="geometry"\s*/>\s*</mxGeometry>', r'<mxGeometry\1as="geometry" />', xml)
        xml = re.sub(r'</mxGeometry>\s*</mxGeometry>', r'</mxGeometry>', xml)
        
        # Validar que sea XML válido
        try:
            ET.fromstring(xml)
        except ET.ParseError as e:
            # Intentar corrección agresiva
            lines = xml.split('\n')
            corrected_lines = []
            for line in lines:
                if '/>' in line and '</mxGeometry>' in line:
                    line = line.replace('</mxGeometry>', '')
                corrected_lines.append(line)
            xml = '\n'.join(corrected_lines)
            
            try:
                ET.fromstring(xml)
            except ET.ParseError as e2:
                raise ValueError(f"No se pudo corregir el XML: {str(e2)}")
        
        await save_output(db, input.opportunity_id, "drawio",
                          {"feedback": input.feedback}, xml)
        return {"xml": xml}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/estimation")
async def estimation(input: EstimationInput, db: AsyncSession = Depends(get_db)):
    try:
        from app.agents.proposal_agent import generate_estimation
        from app.utils.rag import retrieve, format_retrieval_context

        # RAG — recuperar estimaciones históricas similares
        rag_context = ""
        try:
            query = (
                input.technical_base.get("resumen_ejecutivo", "") + " " +
                input.solution_design.get("resumen_ejecutivo", "")
            ).strip()
            if query:
                results = await retrieve(query, source_types=["estimation", "success_case"], k=4)
                rag_context = format_retrieval_context(results, "PROYECTOS SIMILARES COMPLETADOS")
        except Exception:
            pass  # RAG es opcional, no bloquea

        result = generate_estimation(input.solution_design, input.technical_base, rag_context)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        await save_output(db, input.opportunity_id, "estimation",
                          {"solution_design": input.solution_design, "technical_base": input.technical_base},
                          json.dumps(parsed, ensure_ascii=False))
        if input.opportunity_id and parsed.get("project_type"):
            await db.execute(
                update(Opportunity)
                .where(Opportunity.id == input.opportunity_id)
                .values(tipo_proyecto=parsed["project_type"])
            )
            await db.commit()
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/estimation/refine")
async def refine_estimation(input: RefinementInput, db: AsyncSession = Depends(get_db)):
    try:
        from app.agents.proposal_agent import refine_estimation
        result = refine_estimation(input.current_estimation, input.feedback)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        await save_output(db, input.opportunity_id, "estimation",
                          {"feedback": input.feedback},
                          json.dumps(parsed, ensure_ascii=False))
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/opportunity/estimation/export")
async def export_estimation(estimation_data: dict, db: AsyncSession = Depends(get_db)):
    try:
        from app.utils.inject_estimation import inject_estimation
        xlsx_bytes = inject_estimation(estimation_data)
        safe_name = estimation_data.get("project_name", "estimacion").replace(" ", "_")
        filename = f"{safe_name}_plan.xlsx"
        return StreamingResponse(
            io.BytesIO(xlsx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Extracción de contexto desde documento ──────────────────────────────────────────────────

class ExtractContextInput(BaseModel):
    file_base64: str
    file_format: str
    file_name: str
    existing_context: Optional[str] = ""


@router.post("/opportunity/extract-context")
async def extract_context(input: ExtractContextInput):
    try:
        import base64
        from app.agents.proposal_agent import extract_document_context
        file_bytes = base64.b64decode(input.file_base64)
        extracted = extract_document_context(
            file_bytes=file_bytes,
            file_format=input.file_format,
            file_name=input.file_name,
            existing_context=input.existing_context or ""
        )
        return {"extracted_text": extracted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
