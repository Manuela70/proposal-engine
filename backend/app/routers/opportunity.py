from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.proposal_agent import qualify_opportunity, generate_discovery_questions
import json

router = APIRouter()

class OpportunityInput(BaseModel):
    crm_context: str

@router.post("/opportunity/qualify")
def qualify(input: OpportunityInput):
    try:
        result = qualify_opportunity(input.crm_context)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/opportunity/discovery")
def discovery(input: OpportunityInput):
    try:
        result = generate_discovery_questions(input.crm_context)
        clean = result.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))