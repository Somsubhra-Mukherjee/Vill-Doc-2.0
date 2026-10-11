"""
VillDoc 2.0 - Health & Diagnostic Endpoints
"""

import time
from fastapi import APIRouter
from app.config import settings
from app.session_manager import session_manager

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def get_health():
    """
    Returns application health without exposing any credentials.
    """
    return {
        "status": "ok",
        "service": "VillDoc 2.0 Multilingual AI Health Triage",
        "version": "2.0.0",
        "timestamp": time.time(),
        "sarvam_configured": settings.is_sarvam_configured,
        "models": {
            "chat": settings.sarvam_chat_model,
            "stt": settings.sarvam_stt_model,
            "tts": settings.sarvam_tts_model,
            "speaker": settings.sarvam_tts_speaker,
        },
    }


@router.get("/stats")
def get_stats():
    """
    Returns aggregated token usage, request counts, and session stats for developer panel.
    """
    return session_manager.get_global_stats()
