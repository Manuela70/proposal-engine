import os
import boto3
from strands import Agent
from strands.models.bedrock import BedrockModel
from dotenv import load_dotenv

load_dotenv()

def get_bedrock_model():
    session = boto3.Session(
        profile_name=os.getenv("AWS_PROFILE", "AdministratorAccess-467449736571")
    )
    return BedrockModel(
        model_id="amazon.nova-pro-v1:0",
        boto_session=session
    )

QUALIFY_PROMPT = """Eres un Solutions Architect Senior de Applying Consulting, AWS Advanced Consulting Partner.

Analiza el contexto de la oportunidad y responde SOLO con un JSON con esta estructura exacta:
{
  "viabilidad": "Sí | No | Parcial",
  "complejidad": "Simple | Media | Alta",
  "justificacion_complejidad": "...",
  "riesgos": ["...", "...", "..."],
  "decision": "Go | Discovery Profundo | No Go",
  "justificacion_decision": "..."
}"""

DISCOVERY_PROMPT = """Eres un Solutions Architect Senior de Applying Consulting, AWS Advanced Consulting Partner.

Genera las preguntas de discovery técnico para esta oportunidad. Responde SOLO con un JSON:
{
  "preguntas_funcionales": ["...", "..."],
  "preguntas_tecnicas": ["...", "..."],
  "preguntas_arquitectura": ["...", "..."]
}"""
TECHNICAL_BASE_PROMPT = """Eres un Solutions Architect Senior de Applying Consulting, AWS Advanced Consulting Partner.

Con base en el contexto del discovery, genera el Documento Técnico Base. Responde SOLO con un JSON con esta estructura exacta:
{
  "resumen_ejecutivo": "...",
  "actores": [{"nombre": "...", "rol": "...", "responsabilidad": "..."}],
  "requerimientos_funcionales": [{"id": "RF-01", "descripcion": "...", "prioridad": "Alta | Media | Baja"}],
  "requerimientos_no_funcionales": [{"id": "RNF-01", "descripcion": "...", "categoria": "..."}],
  "reglas_de_negocio": ["..."],
  "integraciones": [{"sistema": "...", "tipo": "...", "descripcion": "..."}],
  "supuestos": ["[INFERIDO] ..." ],
  "puntos_pendientes": ["[CRÍTICO] ..."],
  "semaforo_riesgos": {
    "verde": ["..."],
    "amarillo": ["..."],
    "rojo": ["..."]
  }
}"""

def generate_technical_base(crm_context: str, discovery_notes: str) -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=TECHNICAL_BASE_PROMPT)
    full_context = f"CONTEXTO CRM:\n{crm_context}\n\nNOTAS DE DISCOVERY:\n{discovery_notes}"
    result = agent(full_context)
    return str(result)
    
def qualify_opportunity(crm_context: str) -> dict:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=QUALIFY_PROMPT)
    result = agent(crm_context)
    return str(result)

def generate_discovery_questions(crm_context: str) -> dict:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=DISCOVERY_PROMPT)
    result = agent(crm_context)
    return str(result)