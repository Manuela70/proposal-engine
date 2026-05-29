import os
import json
import boto3
from strands import Agent
from strands.models.bedrock import BedrockModel
from dotenv import load_dotenv

load_dotenv()

def get_bedrock_model():
    # En ECS, boto3 usa automáticamente el IAM Role del task
    # Solo usar profile_name en desarrollo local
    session_kwargs = {}
    if os.getenv("AWS_PROFILE"):
        session_kwargs["profile_name"] = os.getenv("AWS_PROFILE")
    
    session = boto3.Session(**session_kwargs)
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
  "supuestos": ["[INFERIDO] ..."],
  "puntos_pendientes": ["[CRÍTICO] ..."],
  "semaforo_riesgos": {
    "verde": ["..."],
    "amarillo": ["..."],
    "rojo": ["..."]
  }
}"""

SOLUTION_DESIGN_PROMPT = """Eres un Arquitecto de Soluciones Senior AWS de Applying Consulting, AWS Advanced Consulting Partner.

PRINCIPIOS NO NEGOCIABLES:
- Todos los servicios se despliegan en us-east-1 (N. Virginia) salvo requerimiento explícito
- IaC obligatorio con Terraform en toda propuesta productiva
- Seguridad primero: IAM mínimo privilegio, cifrado en tránsito y reposo, sin credenciales hardcodeadas
- Serverless First: justificar explícitamente si se propone EC2 sobre Lambda/Fargate
- Alineación con los 6 pilares del AWS Well-Architected Framework
- No inventar datos que no estén en el Documento Técnico Base

Con base en el Documento Técnico Base, diseña la solución técnica. Responde SOLO con un JSON con esta estructura exacta:
{
  "resumen_ejecutivo": "...",
  "arquitectura": {
    "computo": [{"servicio": "...", "proposito": "...", "configuracion": "...", "justificacion_waf": "..."}],
    "almacenamiento_datos": [{"servicio": "...", "proposito": "...", "configuracion": "...", "justificacion_waf": "..."}],
    "networking": [{"servicio": "...", "proposito": "...", "configuracion": "...", "justificacion_waf": "..."}],
    "seguridad": [{"servicio": "...", "proposito": "...", "configuracion": "...", "justificacion_waf": "..."}],
    "observabilidad": [{"servicio": "...", "proposito": "...", "configuracion": "...", "justificacion_waf": "..."}],
    "iac_cicd": [{"servicio": "...", "proposito": "...", "configuracion": "...", "justificacion_waf": "..."}]
  },
  "flujo_de_datos": "...",
  "alcance_funcional": [{"capacidad": "...", "descripcion": "...", "verbo": "Procesar | Migrar | Integrar | Configurar | Implementar"}],
  "alcance_tecnico": {
    "inclusiones": ["..."],
    "exclusiones": ["..."],
    "responsabilidades_cliente": ["..."]
  },
  "prerequisitos_tecnicos": ["..."],
  "consideraciones": ["..."],
  "valor_de_negocio": {
    "impacto_utilidad": "...",
    "capacidades_creadas": ["..."]
  }
}"""

CALCULATOR_PROMPT = """Eres un Solutions Architect Senior de Applying Consulting, AWS Advanced Consulting Partner.

Con base en el diseño de solución AWS, genera el JSON para la extensión RPA de la Calculadora AWS.

REGLAS:
- Usa SIEMPRE region us-east-1 salvo que el diseño indique otra
- Los search_term deben coincidir exactamente con como aparecen en calculator.aws
- Los fields deben usar los nombres exactos de los campos del formulario de calculator.aws
- Incluye SOLO los servicios que están en el diseño de solución
- Las cantidades deben ser números como strings

Responde SOLO con un JSON con esta estructura exacta:
{
  "project": "nombre del proyecto",
  "region": "us-east-1",
  "services": [
    {
      "name": "nombre comercial del servicio",
      "search_term": "término exacto para buscar en calculator.aws",
      "fields": {
        "nombre exacto del campo": "valor como string"
      }
    }
  ]
}"""

ESTIMATOR_PROMPT = """Eres un Solutions Architect Senior de Applying Consulting con amplia experiencia estimando proyectos AWS.

Tu tarea es generar una estimación detallada de esfuerzo y costo basada en el Diseño de Solución y el Documento Técnico Base.

TARIFARIO CO — USD/hora (usar nivel Senior por defecto):
- AWS Solutions Architect / Cloud Architect: $70/h
- AWS Data/ML/AI Engineer: $70/h
- AWS Developer: $40/h
- UX/UI Designer / Analista Funcional: $40/h
- QA Engineer: $35/h
- Project Manager / Jefe de Proyecto: $35/h
- Fuera de Horario (cualquier rol): aplicar tarifa de la columna Fuera de Horario

TIPOS DE PROYECTO Y RECURSOS ESTÁNDAR:
- CLOUD: Arquitecto AWS (70), Jefe de Proyecto (35)
- DATA: AWS Data Engineer (70), AWS Cloud Architect (70), Jefe de Proyecto (35)
- AI_AGENT: Líder Técnico (70), AWS Cloud Engineer (70), AWS Data/IA Engineer (70), QA Engineer (35), Jefe de Proyecto (35)
- ML: AWS ML Engineer (70), AWS Cloud Architect (70), Jefe de Proyecto (35)
- SW_DEV: AWS Developer (40), QA Engineer (35), UX/UI Designer (40), Jefe de Proyecto (35)

TAREAS ASIGNABLES POR TIPO (solo estas tareas llevan horas de Applying):

CLOUD:
- Recopilación de información técnica → Arquitecto AWS, 100%
- Análisis y diseño de infraestructura → Arquitecto AWS, 100%
- Revisión y validación de arquitectura base actualizada → Arquitecto AWS, 100%
- Elaborar Documento Técnico Genérico AWS → Arquitecto AWS, 100%
- Configuración de IAM (Usuarios, Políticas, Roles, Grupos) + Cross Account → Arquitecto AWS, 100%
- Tareas de la Configuración de Networking → Arquitecto AWS, 100%
- Pruebas Unitarias (Networking) → Arquitecto AWS, 100%
- Tareas de la Configuración del Cómputo → Arquitecto AWS, 100%
- Pruebas Unitarias (Cómputo) → Arquitecto AWS, 100%
- Tareas de la Configuración de Almacenamiento → Arquitecto AWS, 100%
- Pruebas Unitarias (Almacenamiento) → Arquitecto AWS, 100%
- Tareas de la Configuración de la Capa de Datos → Arquitecto AWS, 100%
- Pruebas Unitarias (Datos) → Arquitecto AWS, 100%
- Tareas de la Configuración de Monitoreo y Seguridad → Arquitecto AWS, 100%
- Despliegue Automatizado en [Ambientes] → Arquitecto AWS, 100%
- Soporte durante pruebas del Cliente → Arquitecto AWS, 25%
- Elaboración de Documentación: Técnica, Operativa y de Despliegue → Arquitecto AWS, 100%
- Transferencia de Proyecto Terminado al Cliente → Arquitecto AWS, 100%
- Soporte Post - Proyecto o Post - PROD → Arquitecto AWS (Fuera de Horario), 25%
- Gestión de proyectos → Jefe de Proyecto, 13%

DATA:
- Levantamiento de Información Técnica → AWS Data Engineer, 100%
- Fuentes fuera de AWS → AWS Data Engineer, 100%
- Fuentes en AWS → AWS Data Engineer, 100%
- Configuración Amazon Athena → AWS Data Engineer, 100%
- Configuración AWS LakeFormation → AWS Data Engineer, 100%
- Exploración de los datos → AWS Data Engineer, 100%
- ETLs con [DEFINIR] → AWS Data Engineer, 100%
- Desarrollo de Plantillas IaC y Despliegue → AWS Data Engineer, 100%
- Implementación de Dashboards → AWS Data Engineer, 100%
- Elaboración del Documento Técnico → AWS Data Engineer, 100%
- Entrega de Conocimiento → AWS Data Engineer, 100%
- Soporte Post Implementación → AWS Data Engineer, 25%
- Gestión de Proyectos → Jefe de Proyecto, 25%

AI_AGENT:
- Levantamiento y validación de requerimientos → Líder Técnico, 100%
- Actividades del Análisis y Diseño → Líder Técnico, 100%
- Configuración de cuenta(s) AWS → AWS Cloud Engineer, 100%
- Despliegue de Servicios de Infraestructura → AWS Cloud Engineer, 100%
- Configuración de Amazon Bedrock y modelo LLM → AWS Data/IA Engineer, 100%
- Implementación de Módulos → AWS Data/IA Engineer, 100%
- Flujos del Agente → AWS Data/IA Engineer, 100%
- Diseño del plan de pruebas QA → QA Engineer, 100%
- Diseño de casos de prueba por flujo → QA Engineer, 100%
- Diseño de pruebas de carga y concurrencia → QA Engineer, 100%
- Preparación de ambiente y datos QA → QA Engineer, 100%
- Ejecución de Plan de Pruebas → QA Engineer, 100%
- Ejecución de pruebas de carga → QA Engineer, 100%
- Pruebas de seguridad básicas → QA Engineer, 100%
- Documentación técnica final → AWS Data/IA Engineer, 100%
- Documentación operativa → AWS Data/IA Engineer, 100%
- Documentación de prompts y configuración → AWS Data/IA Engineer, 100%
- Sesión de Transferencia de Conocimiento → AWS Data/IA Engineer, 100%
- Gestión de proyectos → Jefe de Proyecto, 13%

ML:
- Levantamiento de información de negocio → AWS ML Engineer, 50%
- Validación de data disponible → AWS ML Engineer, 50%
- Definición de criterios de éxito cuantitativos → AWS ML Engineer, 50%
- Diseño de arquitectura de referencia AWS → AWS ML Engineer, 50%
- Setup de entorno SageMaker Studio → AWS ML Engineer, 100%
- Ingesta de data histórica a S3 → AWS ML Engineer, 100%
- Análisis exploratorio de datos (EDA) → AWS ML Engineer, 100%
- Limpieza con SageMaker Data Wrangler → AWS ML Engineer, 100%
- Procesamiento a escala con Processing Jobs → AWS ML Engineer, 100%
- Feature engineering → AWS ML Engineer, 100%
- Carga a SageMaker Feature Store → AWS ML Engineer, 100%
- Reporte de calidad de data → AWS ML Engineer, 100%
- Selección de algoritmo y baseline → AWS ML Engineer, 100%
- Entrenamiento de experimento 1 → AWS ML Engineer, 100%
- Entrenamiento de experimento 2 → AWS ML Engineer, 100%
- Entrenamiento de experimento 3 → AWS ML Engineer, 100%
- Tracking en SageMaker Experiments → AWS ML Engineer, 100%
- Evaluación contra criterios de éxito firmados → AWS ML Engineer, 100%
- Selección del modelo ganador → AWS ML Engineer, 100%
- Versionado en SageMaker Model Registry → AWS ML Engineer, 100%
- Diseño de infraestructura serverless → AWS ML Engineer, 100%
- Despliegue del SageMaker Endpoint → AWS ML Engineer, 100%
- Desarrollo de Lambda de invocación → AWS ML Engineer, 100%
- Configuración de API Gateway → AWS ML Engineer, 100%
- Configuración de SageMaker Model Monitor → AWS ML Engineer, 100%
- Configuración de CloudWatch Dashboard → AWS ML Engineer, 100%
- Pruebas integrales end-to-end → AWS ML Engineer, 100%
- Elaboración de Documentación Técnica, Operativa y Post-MVP → AWS ML Engineer, 100%
- Transferencia de Conocimiento y Sesión de Cierre → AWS ML Engineer, 100%
- Gestión de Proyecto → Jefe de Proyecto, 25%

SW_DEV:
- Sesiones Técnicas para Definición de Alcance → UX/UI Designer, 100%
- Diseño de Módulos → UX/UI Designer, 100%
- Exportación de Wireframe Low-Fi → UX/UI Designer, 100%
- Exportación de Wireframe Hi-Fi → UX/UI Designer, 100%
- Documentación de Requerimientos, Historias de Usuario y Criterios de Aceptación → UX/UI Designer, 100%
- Reunión de Transferencia - Análisis de Requerimientos → AWS Developer, 100%
- Documento Técnico y Diagrama Físico de BD → AWS Developer, 100%
- Diagrama de Infraestructura AWS Detallado → AWS Developer, 100%
- Documentación de Servicios Open API → AWS Developer, 100%
- Documento de Pruebas Funcionales → AWS Developer, 100%
- Revisión, Validación y Ajustes → AWS Developer, 100%
- Implementación de Infraestructura y SetUp Inicial → AWS Developer, 100%
- Desarrollo de Plantillas de IaC → AWS Developer, 100%
- SetUp de Base de Datos → AWS Developer, 100%
- Configuración de Ambientes (QA, UAT, PROD) → AWS Developer, 100%
- Configuración de pipelines → AWS Developer, 100%
- Transferencia Preliminar del Despliegue → AWS Developer, 100%
- Actualización de Documento Técnico → AWS Developer, 100%
- Elaboración de Documento Operativo → AWS Developer, 100%
- Elaboración de Documento de Despliegue → AWS Developer, 100%
- Migración de Base de Datos → AWS Developer, 100%
- Módulo [N] (por cada módulo identificado) → AWS Developer, 100%
- Plan de Pruebas por módulo → QA Engineer, 100%
- Gestión de proyectos → Jefe de Proyecto, 13%

REGLAS DE ESTIMACIÓN:
- Análisis y diseño: 15-25% del total horas de implementación
- Documentación: 10-15% del total del proyecto
- Transferencia de conocimiento: 4-8h fijas
- Soporte post-proyecto: 10-20% del total (al 25% de dedicación)
- Gestión de proyecto: 10-15% del total (al 13-25% de dedicación)
- Pruebas unitarias: 20-30% de las horas de la tarea que prueban
- Redondea SIEMPRE las horas a múltiplos de 4
- Duración en días de cada tarea = horas / 8
- duracion_estimada_semanas = suma de fases principales en días / 5

RANGOS DE HORAS TOTALES POR TIPO:
- CLOUD simple: 80-160h | CLOUD complejo: 160-320h
- DATA: 120-300h
- AI_AGENT: 200-400h
- ML MVP: 160-280h
- SW_DEV: base 200h + 40-80h por módulo

Responde SOLO con un JSON con esta estructura exacta. No incluyas texto fuera del JSON:
{
  "project_name": "...",
  "project_type": "CLOUD | DATA | SW_DEV | AI_AGENT | ML",
  "country": "CO",
  "nivel_senioridad": "Senior",
  "duracion_estimada_semanas": 0,
  "recursos": [
    { "nombre": "...", "iniciales": "...", "tarifa_hora": 0 }
  ],
  "nombre_proyecto": "...",
  "asignaciones": [
    { "nombre_tarea": "...", "nombre_recurso": "...", "horas": 0, "unidades": "100%" }
  ],
  "resumen_economico": {
    "horas_totales_applying": 0,
    "costo_total_usd": 0,
    "desglose_por_rol": [
      { "rol": "...", "horas": 0, "tarifa_hora": 0, "subtotal_usd": 0 }
    ]
  }
}"""

REFINER_PROMPT = """Eres un Solutions Architect Senior de Applying Consulting.

Recibes una estimación de proyecto en JSON y feedback libre del usuario con ajustes que quiere aplicar.

Analiza el feedback e implementa los cambios solicitados. Puedes:
- Agregar nuevas asignaciones (tareas con horas)
- Eliminar asignaciones existentes
- Cambiar horas de tareas específicas
- Cambiar recursos asignados a una tarea
- Ajustar duraciones en tareas_actualizadas

REGLAS:
- Devuelve el JSON completo con la misma estructura, no solo los cambios
- Recalcula horas_totales_applying y costo_total_usd siempre que cambien horas
- Recalcula subtotal_usd por rol y el total general
- Redondea horas a múltiplos de 4
- Actualiza duracion_dias de la tarea si cambian sus horas (duracion_dias = horas / 8)
- Si el feedback es ambiguo, aplica la interpretación más razonable
- Agrega un campo "cambios_aplicados" al final del JSON con lista de strings describiendo cada cambio

Responde SOLO con el JSON actualizado. No incluyas texto fuera del JSON."""

DRAWIO_PROMPT = """Eres un Arquitecto Visual especializado en diagramas de arquitectura AWS para Applying Consulting.

REGLAS CRÍTICAS DE XML - DEBES SEGUIRLAS EXACTAMENTE:
1. TODA etiqueta <mxCell> DEBE cerrarse con </mxCell>
2. <mxGeometry> puede ser auto-cerrada con /> O tener apertura y cierre
3. Si usas <mxGeometry .../> (auto-cerrada), NO agregues </mxGeometry>
4. Si usas <mxGeometry ...> (apertura), DEBES cerrar con </mxGeometry>
5. NUNCA mezcles ambos estilos en el mismo elemento
6. Estructura CORRECTA opción 1: <mxCell ...><mxGeometry ... /></mxCell>
7. Estructura CORRECTA opción 2: <mxCell ...><mxGeometry ...></mxGeometry></mxCell>
8. INCORRECTO: <mxCell ...><mxGeometry .../></mxGeometry></mxCell>

USA SIEMPRE shape=mxgraph.aws4.[SHAPE] para servicios AWS. Nunca uses shape=ellipse ni shape=rectangle para servicios AWS.

PRINCIPIOS VISUALES:
- Flujo de izquierda a derecha
- Usuario/cliente siempre en el extremo izquierdo
- Base de datos y almacenamiento en la capa derecha
- Flechas etiquetadas con protocolo (HTTPS, gRPC, SQL, etc.)
- Grupos lógicos con rectángulos de borde discontinuo etiquetados por capa
- Colores: Networking #E8F4FD, Cómputo #FFF3E0, Datos #E8F5E9, Seguridad #FCE4EC

SHAPES AWS MÁS COMUNES:
elastic_load_balancing, ec2, ecs, lambda, api_gateway, rds, aurora, s3,
cloudfront, route_53, waf, cognito, sqs, sns, bedrock, sagemaker, cloudwatch,
identity_and_access_management

ESTRUCTURA XML BASE:
<mxfile host="app.diagrams.net" agent="Applying-Pipeline" version="21.0.0">
  <diagram name="Arquitectura AWS" id="arch-001">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" pageWidth="1654" pageHeight="1169">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- Aquí van los elementos -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

EJEMPLO DE ELEMENTO CORRECTO (usa ESTE formato):
<mxCell id="service-1" value="API Gateway" style="outlineConnect=0;fontColor=#232F3E;gradientColor=none;strokeColor=none;fillColor=#E7157B;labelBackgroundColor=#ffffff;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.api_gateway;" vertex="1" parent="1">
  <mxGeometry x="200" y="200" width="78" height="78" as="geometry" />
</mxCell>

EJEMPLO DE CONEXIÓN CORRECTA:
<mxCell id="edge-1" value="HTTPS" style="edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=block;endFill=1;" edge="1" parent="1" source="service-1" target="service-2">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

Responde SOLO con el XML completo y válido. Sin texto adicional, sin bloques de código markdown."""

DRAWIO_REFINER_PROMPT = """Eres un Arquitecto Visual especializado en diagramas de arquitectura AWS.

Recibes un XML de Draw.io existente y feedback libre del usuario con ajustes que quiere aplicar.

Implementa los cambios solicitados: agregar/quitar servicios, cambiar conexiones, reorganizar grupos, renombrar elementos.

Responde SOLO con el XML completo actualizado. Sin texto adicional, sin bloques de código markdown."""

def generate_drawio(solution_design: dict) -> str:
    session_kwargs = {}
    if os.getenv("AWS_PROFILE"):
        session_kwargs["profile_name"] = os.getenv("AWS_PROFILE")
    
    model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        boto_session=boto3.Session(**session_kwargs)
    )
    agent = Agent(model=model, system_prompt=DRAWIO_PROMPT)
    context = f"DISEÑO DE SOLUCIÓN AWS:\n{json.dumps(solution_design, ensure_ascii=False, indent=2)}"
    result = agent(context)
    return str(result)

def refine_drawio(current_xml: str, feedback: str) -> str:
    session_kwargs = {}
    if os.getenv("AWS_PROFILE"):
        session_kwargs["profile_name"] = os.getenv("AWS_PROFILE")
    
    model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        boto_session=boto3.Session(**session_kwargs)
    )
    agent = Agent(model=model, system_prompt=DRAWIO_REFINER_PROMPT)
    context = f"XML ACTUAL:\n{current_xml}\n\nFEEDBACK DEL USUARIO:\n{feedback}"
    result = agent(context)
    return str(result)

def qualify_opportunity(crm_context: str) -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=QUALIFY_PROMPT)
    result = agent(crm_context)
    return str(result)

def generate_discovery_questions(crm_context: str) -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=DISCOVERY_PROMPT)
    result = agent(crm_context)
    return str(result)

def generate_technical_base(crm_context: str, discovery_notes: str) -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=TECHNICAL_BASE_PROMPT)
    full_context = f"CONTEXTO CRM:\n{crm_context}\n\nNOTAS DE DISCOVERY:\n{discovery_notes}"
    result = agent(full_context)
    return str(result)

def generate_solution_design(technical_base: dict, rag_context: str = "") -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=SOLUTION_DESIGN_PROMPT)
    context = f"DOCUMENTO TÉCNICO BASE:\n{json.dumps(technical_base, ensure_ascii=False, indent=2)}"
    if rag_context:
        context += rag_context
    result = agent(context)
    return str(result)

def generate_calculator_json(solution_design: dict) -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=CALCULATOR_PROMPT)
    context = f"DISEÑO DE SOLUCIÓN:\n{json.dumps(solution_design, ensure_ascii=False, indent=2)}"
    result = agent(context)
    return str(result)

def generate_estimation(solution_design: dict, technical_base: dict, rag_context: str = "") -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=ESTIMATOR_PROMPT)
    context = (
        f"DISEÑO DE SOLUCIÓN AWS:\n{json.dumps(solution_design, ensure_ascii=False, indent=2)}"
        f"\n\nDOCUMENTO TÉCNICO BASE:\n{json.dumps(technical_base, ensure_ascii=False, indent=2)}"
    )
    if rag_context:
        context += rag_context
    result = agent(context)
    return str(result)

def refine_estimation(current_estimation: dict, feedback: str) -> str:
    model = get_bedrock_model()
    agent = Agent(model=model, system_prompt=REFINER_PROMPT)
    context = (
        f"ESTIMACIÓN ACTUAL:\n{json.dumps(current_estimation, ensure_ascii=False, indent=2)}"
        f"\n\nFEEDBACK DEL USUARIO:\n{feedback}"
    )
    result = agent(context)
    return str(result)


def extract_document_context(file_bytes: bytes, file_format: str, file_name: str, existing_context: str = "") -> str:
    """Extrae contexto relevante de un documento usando Bedrock. El archivo nunca se persiste."""
    session_kwargs = {}
    if os.getenv("AWS_PROFILE"):
        session_kwargs["profile_name"] = os.getenv("AWS_PROFILE")
    
    session = boto3.Session(**session_kwargs)
    client = session.client("bedrock-runtime", region_name="us-east-1")

    # Formatos soportados por Bedrock
    FORMAT_MAP = {
        "pdf": "pdf", "txt": "txt", "md": "md",
        "csv": "csv", "html": "html",
        "doc": "doc", "docx": "docx",
        "xls": "xls", "xlsx": "xlsx"
    }
    fmt = FORMAT_MAP.get(file_format.lower().lstrip("."), "txt")

    prompt = """Analiza este documento y extrae el contexto relevante para una propuesta de proyecto tecnológico.

Extre y resume:
- Descripción del negocio y necesidad principal
- Requerimientos técnicos o funcionales mencionados
- Restricciones, plazos o presupuestos
- Tecnologías o sistemas existentes
- Cualquier información relevante para dimensionar el proyecto

Sé conciso pero completo. Responde en español."""

    if existing_context:
        prompt += f"\n\nCONTEXTO YA EXISTENTE (enriquece con lo del documento, no repitas):\n{existing_context}"

    import base64
    response = client.converse(
        modelId="amazon.nova-pro-v1:0",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "document": {
                            "format": fmt,
                            "name": __import__('re').sub(r'[^a-zA-Z0-9\s\-\(\)\[\]]', '', file_name)[:100].strip() or "documento",
                            "source": {
                                "bytes": file_bytes
                            }
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    )
    return response["output"]["message"]["content"][0]["text"]