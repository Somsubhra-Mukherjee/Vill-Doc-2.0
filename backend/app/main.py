"""
VillDoc 2.0 - Main FastAPI Application
AI-powered, multilingual, voice-first health triage assistant for Indian patients.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routes.health import router as health_router
from app.routes.sessions import router as sessions_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s: %(message)s",
)
logger = logging.getLogger("villdoc")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting VillDoc 2.0 Multilingual Voice Health Triage...")
    if settings.is_sarvam_configured:
        logger.info(f"Sarvam API configured. Chat: {settings.sarvam_chat_model}, STT: {settings.sarvam_stt_model}, TTS: {settings.sarvam_tts_model}")
    else:
        logger.warning("SARVAM_API_KEY is not set or set to placeholder. Configure backend/.env for live Sarvam API integration.")
    yield
    logger.info("Shutting down VillDoc 2.0...")


app = FastAPI(
    title="VillDoc 2.0 API",
    description="Multilingual voice-first AI health triage assistant for Indian regional languages.",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(sessions_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again or switch to text input."},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
