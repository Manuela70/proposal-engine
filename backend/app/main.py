from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import opportunity, backoffice

app = FastAPI(title="Proposal Engine API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://main.d1xg7rdqzh0xm0.amplifyapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(opportunity.router, prefix="/api")
app.include_router(backoffice.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "service": "proposal-engine-api"}