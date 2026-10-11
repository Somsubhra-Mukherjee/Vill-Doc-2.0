"""
VillDoc 2.0 - Sarvam Chat Completions Service
Handles clinical reasoning, conversation history, and structured assessment generation.
"""

import json
import logging
import re
from typing import List, Dict, Any, Tuple
import httpx
from app.config import settings
from app.schemas.triage import ClinicalAssessment, TriageLevel, SymptomItem, PossibleCondition

logger = logging.getLogger(__name__)

SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions"

SYSTEM_PROMPT = """You are VillDoc 2.0, a compassionate, calm, and clinically astute AI health triage assistant for Indian patients.
You are an AI triage assistant, NOT a licensed human doctor, and you must never claim to be a licensed doctor or provide a definitive diagnosis.

Your clinical objective:
1. Conduct an empathetic, structured clinical history taking with the patient in their selected language ({language_name}).
2. Ask only 1 or 2 focused, relevant questions per turn. Never overwhelm the patient with long question lists or medical monologues.
3. Inquire about: main complaint, onset, duration, severity, progression, and associated symptoms when relevant.
4. If warning signs or red flags (e.g., severe chest pain, extreme breathlessness, stroke signs, unconsciousness, severe bleeding, anaphylaxis) are reported:
   - Immediately STOP routine questioning.
   - Set triage_level to "emergency".
   - Set conversation_complete to true.
   - Instruct the patient clearly to seek immediate emergency care or call 112 in India.
5. Consider multiple plausible clinical explanations (hypotheses), not a single definitive disease.
6. Express uncertainty plainly. Possible conditions are hypotheses, never confirmed diagnoses.
7. NEVER prescribe antibiotics, prescription drugs, controlled medicines, or specific dosages.
8. NEVER advise stopping prescribed chronic medications.
9. For routine/mild issues, offer conservative, non-prescription guidance (rest, hydration) and clear worsening indicators.
10. If key information is missing, mark triage_level as "insufficient_information" and ask a focused clarifying question.

You MUST always respond with a valid JSON object matching this exact schema:
{{
  "assistant_message": "Warm, natural conversational reply in {language_name} addressed directly to the patient",
  "conversation_complete": false,
  "patient_summary": "Concise factual summary of symptoms reported by the patient so far",
  "symptoms": [
    {{
      "name": "symptom name",
      "duration": "e.g. 2 days or null",
      "severity": "mild | moderate | severe | unknown",
      "certainty": "confirmed | suspected | denied"
    }}
  ],
  "missing_information": ["specific questions or clinical details still needed"],
  "possible_conditions": [
    {{
      "condition_name": "Hypothesis name",
      "explanation": "Why this aligns with reported symptoms",
      "uncertainty": "Plain statement that this is a possibility to be evaluated by a healthcare professional"
    }}
  ],
  "red_flags": ["any emergency warning signs observed or reported"],
  "triage_level": "emergency | urgent | routine | insufficient_information",
  "care_recommendations": ["clear, safe recommended next steps"],
  "self_care_advice": ["conservative self-care measures like rest, hydration (empty if emergency)"],
  "follow_up_guidance": ["when and where to seek clinical evaluation if symptoms worsen or persist"],
  "disclaimer": "VillDoc 2.0 is an AI health triage assistant, not a doctor. If you experience severe symptoms, call 112 immediately."
}}
"""

LANGUAGE_NAMES = {
    "en-IN": "Indian English",
    "hi-IN": "Hindi (हिन्दी)",
    "bn-IN": "Bengali (বাংলা)",
    "ta-IN": "Tamil (தமிழ்)",
    "te-IN": "Telugu (తెలుగు)",
    "mr-IN": "Marathi (मराठी)",
    "gu-IN": "Gujarati (ગુજરાતી)",
    "kn-IN": "Kannada (ಕನ್ನಡ)",
    "ml-IN": "Malayalam (മലയാളം)",
    "pa-IN": "Punjabi (ਪੰਜਾਬੀ)",
    "od-IN": "Odia (ଓଡ଼ିଆ)",
}


class SarvamChatService:
    def __init__(self):
        self.model = settings.sarvam_chat_model

    async def generate_turn_assessment(
        self,
        messages: List[Dict[str, str]],
        language_code: str = "hi-IN",
        max_retries: int = 2,
    ) -> Tuple[ClinicalAssessment, Dict[str, Any]]:
        """
        Sends conversation history to Sarvam Chat Completions and returns parsed ClinicalAssessment and usage stats.
        """
        if not settings.is_sarvam_configured:
            raise ValueError(
                "Sarvam API key is missing or not configured. "
                "Please set SARVAM_API_KEY in your backend .env file."
            )

        lang_name = LANGUAGE_NAMES.get(language_code, "the patient's language")
        formatted_system = SYSTEM_PROMPT.format(language_name=lang_name)

        full_messages = [{"role": "system", "content": formatted_system}] + messages

        headers = {
            "api-subscription-key": settings.sarvam_api_key.strip(),
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": full_messages,
            "temperature": 0.25,
            "max_tokens": 1200,
            "response_format": {"type": "json_object"},
        }

        backoff = 1.0
        last_error = None
        raw_content = ""
        usage_data = {}

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(
                        SARVAM_CHAT_URL,
                        headers=headers,
                        json=payload,
                    )

                if response.status_code == 200:
                    resp_json = response.json()
                    choices = resp_json.get("choices", [])
                    if not choices:
                        raise ValueError("No completion choices returned by Sarvam Chat API.")
                    raw_content = choices[0].get("message", {}).get("content", "")
                    usage_data = resp_json.get("usage", {})
                    break

                if response.status_code in (401, 403):
                    logger.error("Sarvam Chat authentication failed.")
                    raise PermissionError("Sarvam API authentication failed for Chat Completions.")

                if response.status_code in (429, 500, 502, 503, 504):
                    last_error = f"HTTP {response.status_code}: {response.text}"
                    if attempt < max_retries:
                        logger.warning(f"Sarvam Chat transient error, retrying in {backoff}s...")
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue

                response.raise_for_status()

            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                last_error = f"Network connection error: {str(exc)}"
                if attempt < max_retries:
                    logger.warning(f"Sarvam Chat network error on attempt {attempt + 1}, retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                raise ConnectionError(f"Failed to connect to Sarvam Chat service: {str(exc)}") from exc

        if not raw_content:
            raise RuntimeError(f"Sarvam Chat failed after {max_retries + 1} attempts. Detail: {last_error}")

        assessment = self._parse_and_validate_assessment(raw_content, language_code)
        return assessment, usage_data

    def _parse_and_validate_assessment(self, content_str: str, language_code: str) -> ClinicalAssessment:
        """
        Parses JSON content and validates with ClinicalAssessment schema.
        Handles markdown json wrappers safely.
        """
        cleaned = content_str.strip()
        # Remove markdown codeblock fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            parsed = json.loads(cleaned)
            return ClinicalAssessment.model_validate(parsed)
        except Exception as e:
            logger.warning(f"Failed to parse LLM structured output as JSON: {e}. Raw content: {cleaned[:200]}")
            # Safe fallback if model output is malformed
            return ClinicalAssessment(
                assistant_message=cleaned if len(cleaned) < 300 else "I understand your symptoms. Could you please tell me how long you have been feeling this way and if anything makes it worse?",
                conversation_complete=False,
                patient_summary="Patient reported symptoms; clarifying details needed.",
                triage_level=TriageLevel.INSUFFICIENT_INFORMATION,
                missing_information=["Duration and severity of symptoms"],
                care_recommendations=["Please answer the follow-up question so I can provide safe triage guidance."],
            )


chat_service = SarvamChatService()
