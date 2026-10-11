"""
VillDoc 2.0 - Sarvam Bulbul Text-to-Speech Service
Integrates with POST https://api.sarvam.ai/text-to-speech
"""

import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"


class SarvamTTSService:
    def __init__(self):
        self.model = settings.sarvam_tts_model
        self.default_speaker = settings.sarvam_tts_speaker

    async def synthesize_speech(
        self,
        text: str,
        language_code: str = "hi-IN",
        speaker: Optional[str] = None,
        max_retries: int = 2,
    ) -> Dict[str, Any]:
        """
        Synthesizes speech using Sarvam Bulbul TTS API with bounded retries.
        Returns a dictionary containing the base64-encoded audio and format.
        """
        if not settings.is_sarvam_configured:
            raise ValueError(
                "Sarvam API key is missing or not configured. "
                "Please set SARVAM_API_KEY in your backend .env file."
            )

        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text to synthesize cannot be empty.")

        # Bulbul has a 2500 character limit per request; clip if needed
        if len(clean_text) > 2400:
            clean_text = clean_text[:2400] + "..."

        headers = {
            "api-subscription-key": settings.sarvam_api_key.strip(),
            "Content-Type": "application/json",
        }

        # Language code fallback
        lang = language_code if language_code and language_code != "unknown" else "hi-IN"

        payload = {
            "text": clean_text,
            "model": self.model,
            "language_code": lang,
            "pace": 1.0,
        }

        chosen_speaker = speaker or self.default_speaker
        if chosen_speaker:
            payload["speaker"] = chosen_speaker

        backoff = 1.0
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        SARVAM_TTS_URL,
                        headers=headers,
                        json=payload,
                    )

                if response.status_code == 200:
                    data = response.json()
                    audios = data.get("audios", [])
                    if not audios:
                        raise ValueError("Sarvam TTS returned empty audio list.")
                    return {
                        "audio_base64": audios[0],
                        "content_type": "audio/wav",
                        "success": True,
                    }

                if response.status_code in (401, 403):
                    logger.error("Sarvam TTS authentication failed.")
                    raise PermissionError("Sarvam API authentication failed for TTS.")

                if response.status_code == 400:
                    err = response.text
                    logger.error(f"Sarvam TTS bad request: {err}")
                    raise ValueError(f"Sarvam TTS input error: {err}")

                if response.status_code in (429, 500, 502, 503, 504):
                    last_error = f"HTTP {response.status_code}: {response.text}"
                    if attempt < max_retries:
                        logger.warning(f"Sarvam TTS transient error, retrying in {backoff}s...")
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue

                response.raise_for_status()

            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                last_error = f"Network connection error: {str(exc)}"
                if attempt < max_retries:
                    logger.warning(f"Sarvam TTS network error, retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                raise ConnectionError(f"Failed to connect to Sarvam TTS service: {str(exc)}") from exc

        raise RuntimeError(f"Sarvam TTS failed after {max_retries + 1} attempts. Detail: {last_error}")


tts_service = SarvamTTSService()
