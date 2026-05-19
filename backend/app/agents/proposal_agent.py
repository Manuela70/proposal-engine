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