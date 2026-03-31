from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import get_settings
from routers import chat, predict, index

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 MedAssist AI démarré")
    yield
    print("👋 Arrêt de MedAssist AI")


app = FastAPI(
    title="MedAssist AI",
    description="Chatbot médical intelligent — RAG · Agents · Multimodalité",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(predict.router, prefix="/predict", tags=["Predictive"])
app.include_router(index.router, prefix="/index", tags=["Indexing"])


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "model": settings.ollama_model, "provider": settings.llm_provider}
