"""
VillDoc 2.0 - Sarvam Saaras Speech-to-Text Service
Integrates with POST https://api.sarvam.ai/speech-to-text
"""

import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"


class SarvamSpeechService:
    def __init__(self):
        self.api_key = settings.sarvam_api_key
        self.model = settings.sarvam_stt_model

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        content_type: str = "audio/wav",
        language_code: str = "unknown",
        max_retries: int = 2,
    ) -> Dict[str, Any]:
        """
        Transcribes audio using Sarvam Saaras STT API with bounded retries on transient errors.
        """
        if not settings.is_sarvam_configured:
            raise ValueError(
                "Sarvam API key is missing or not configured. "
                "Please set SARVAM_API_KEY in your backend .env file."
            )

        headers = {
            "api-subscription-key": settings.sarvam_api_key.strip(),
        }

        # Normalize language code for Sarvam: e.g. 'en-IN', 'hi-IN', 'bn-IN', or 'unknown'
        lang = language_code if language_code and language_code != "auto" else "unknown"

        data = {
            "model": self.model,
            "language_code": lang,
        }

        clean_mime = (content_type or "audio/wav").split(";")[0].strip()
        files = {
            "file": (filename, audio_bytes, clean_mime)
        }

        backoff = 1.0
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        SARVAM_STT_URL,
                        headers=headers,
                        data=data,
                        files=files,
                    )

                if response.status_code == 200:
                    resp_data = response.json()
                    transcript = resp_data.get("transcript", "").strip()
                    detected_lang = resp_data.get("language_code", lang)
                    request_id = resp_data.get("request_id", "")
                    return {
                        "transcript": transcript,
                        "language_code": detected_lang,
                        "request_id": request_id,
                        "success": True,
                    }

                # Non-retriable auth or bad request errors
                if response.status_code in (401, 403):
                    logger.error("Sarvam STT authentication failed (401/403).")
                    raise PermissionError("Sarvam API authentication failed. Please check your SARVAM_API_KEY.")

                if response.status_code == 400:
                    error_detail = response.text
                    logger.error(f"Sarvam STT invalid audio or bad request: {error_detail}")
                    raise ValueError(f"Audio format error: {error_detail}")

                # Transient errors (429 rate limit or 5xx server error)
                if response.status_code in (429, 500, 502, 503, 504):
                    last_error = f"HTTP {response.status_code}: {response.text}"
                    if attempt < max_retries:
                        logger.warning(f"Sarvam STT transient error {response.status_code}, retrying in {backoff}s...")
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue

                response.raise_for_status()

            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                last_error = f"Network connection error: {str(exc)}"
                if attempt < max_retries:
                    logger.warning(f"Sarvam STT network error on attempt {attempt + 1}, retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                raise ConnectionError(f"Failed to connect to Sarvam STT service: {str(exc)}") from exc

        raise RuntimeError(f"Sarvam STT failed after {max_retries + 1} attempts. Detail: {last_error}")


speech_service = SarvamSpeechService()
