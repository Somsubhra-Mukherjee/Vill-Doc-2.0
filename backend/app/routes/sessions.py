"""
VillDoc 2.0 - Consultation Session Endpoints
Handles session lifecycle, turn processing (voice & text), safety evaluation, and TTS playback.
"""

import time
import base64
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from app.schemas.session import (
    CreateSessionRequest,
    SessionResponse,
    TurnResponse,
    SpeakRequest,
    SpeakResponse,
)
from app.schemas.triage import ClinicalAssessment, TriageLevel
from app.session_manager import session_manager, SessionData
from app.services.sarvam_speech import speech_service
from app.services.sarvam_chat import chat_service
from app.services.sarvam_tts import tts_service
from app.services.triage_safety import apply_safety_guardrails
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

INITIAL_GREETINGS = {
    "en-IN": "Hello. I am VillDoc, your AI health triage assistant. How are you feeling today? Please tell me what symptoms or health concerns you are experiencing.",
    "hi-IN": "नमस्ते। मैं विलडॉक (VillDoc) हूँ, आपका एआई स्वास्थ्य सहायक। आज आप कैसा महसूस कर रहे हैं? कृपया मुझे बताएं कि आपको क्या स्वास्थ्य समस्या या लक्षण हैं।",
    "bn-IN": "নমস্কার। আমি ভিলডক (VillDoc), আপনার এআই স্বাস্থ্য সহায়ক। আজ আপনার শরীর কেমন আছে? আপনার কি সমস্যা বা লক্ষণ হচ্ছে তা দয়া করে বলুন।",
    "ta-IN": "வணக்கம். நான் வில்டாக் (VillDoc), உங்கள் AI சுகாதார உதவியாளர். இன்று உங்கள் உடல்நிலை எப்படி உள்ளது? உங்கள் அறிகுறிகளைப் பற்றி என்னிடம் கூறுங்கள்.",
    "te-IN": "నమస్కారం. నేను విల్‌డాక్ (VillDoc), మీ AI ఆరోగ్య సహాయకుడిని. ఈ రోజు మీకు ఎలా ఉంది? మీ సమస్యలు మరియు లక్షణాలను తెలియజేయండి.",
    "mr-IN": "नमस्कार. मी व्हिलडॉक (VillDoc) आहे, तुमचा AI आरोग्य सहाय्यक. आज तुम्हाला कसे वाटत आहे? कृपया तुमची लक्षणे मला सांगा.",
    "gu-IN": "નમસ્તે. હું વિલડૉક (VillDoc) છું, તમારો AI સ્વાસ્થ્ય સહાયક. આજે તમને કેવું લાગે છે? કૃપા કરીને તમારી તકલીફ જણાવો.",
}


@router.post("", response_model=SessionResponse)
def create_session(request: CreateSessionRequest):
    """
    Creates a new isolated consultation session after confirming patient consent.
    """
    if not request.consent_given:
        raise HTTPException(
            status_code=400,
            detail="Patient consent is required before starting the health consultation."
        )

    session = session_manager.create_session(language=request.language)
    greeting = INITIAL_GREETINGS.get(request.language, INITIAL_GREETINGS["en-IN"])

    # Initial assessment placeholder
    initial_assessment = ClinicalAssessment(
        assistant_message=greeting,
        conversation_complete=False,
        patient_summary="Consultation initiated.",
        triage_level=TriageLevel.INSUFFICIENT_INFORMATION,
        missing_information=["Patient complaint and symptoms"],
        care_recommendations=["Please describe your symptoms to begin triage."],
    )
    session.add_assistant_turn(greeting, initial_assessment)

    return SessionResponse(
        session_id=session.session_id,
        language=session.language,
        created_at=str(session.created_at),
        turn_count=session.turn_count,
        is_active=session.is_active,
    )


@router.get("/{session_id}")
def get_session_info(session_id: str):
    """
    Fetches the current state of an active consultation session.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Consultation session not found or already closed.")

    return {
        "session_id": session.session_id,
        "language": session.language,
        "turn_count": session.turn_count,
        "messages": session.messages,
        "assessment": session.latest_assessment,
        "usage": session.usage_stats,
    }


@router.post("/{session_id}/turn", response_model=TurnResponse)
async def process_turn(
    session_id: str,
    text: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    synthesize_voice: bool = Form(True),
):
    """
    Processes a patient turn either via speech audio or text message:
    1. Transcribes audio with Sarvam Saaras if provided
    2. Feeds transcript to Sarvam Chat Completions
    3. Runs deterministic emergency triage guardrails
    4. Optionally synthesizes the assistant response with Sarvam Bulbul TTS
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Consultation session not found or expired.")

    lang = language or session.language
    user_text = ""

    # 1. Handle Audio Transcription if audio file is uploaded
    if audio_file:
        try:
            audio_bytes = await audio_file.read()
            if not audio_bytes or len(audio_bytes) < 100:
                raise ValueError("Uploaded audio is empty or too short.")

            raw_content_type = audio_file.content_type or "audio/wav"
            clean_content_type = raw_content_type.split(";")[0].strip()
            filename = audio_file.filename or ("recording.webm" if "webm" in clean_content_type else "recording.wav")

            stt_result = await speech_service.transcribe_audio(
                audio_bytes=audio_bytes,
                filename=filename,
                content_type=clean_content_type,
                language_code=lang,
            )
            user_text = stt_result.get("transcript", "").strip()
            session.record_usage("stt")
        except Exception as e:
            session.record_usage("stt", failed=True)
            logger.error(f"Speech transcription failed: {e}")
            raise HTTPException(
                status_code=502,
                detail=f"Speech transcription failed: {str(e)}"
            )

    # If text provided directly or edited transcript passed
    if text and text.strip():
        user_text = text.strip()

    if not user_text:
        raise HTTPException(
            status_code=400,
            detail="No recognizable speech or text input received. Please speak clearly or type your message."
        )

    # 2. Add user input to conversation
    session.add_user_turn(user_text)

    # 3. Call Sarvam Chat Completions
    try:
        assessment, usage_data = await chat_service.generate_turn_assessment(
            messages=session.messages,
            language_code=lang,
        )
        prompt_tokens = usage_data.get("prompt_tokens", 0)
        completion_tokens = usage_data.get("completion_tokens", 0)
        total_tokens = usage_data.get("total_tokens", 0)
        session.record_usage(
            "chat",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )
    except Exception as e:
        session.record_usage("chat", failed=True)
        logger.error(f"Chat completion reasoning failed: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Clinical AI reasoning failed: {str(e)}"
        )

    # 4. Apply Deterministic Triage Safety Layer
    assessment, is_emergency = apply_safety_guardrails(
        assessment=assessment,
        user_input_history=session.user_inputs,
        language=lang,
    )

    # Save turn to session
    session.add_assistant_turn(assessment.assistant_message, assessment)

    # 5. Generate Voice Audio if requested
    audio_base64 = None
    if synthesize_voice and assessment.assistant_message:
        try:
            tts_res = await tts_service.synthesize_speech(
                text=assessment.assistant_message,
                language_code=lang,
            )
            audio_base64 = tts_res.get("audio_base64")
            session.record_usage("tts")
        except Exception as e:
            session.record_usage("tts", failed=True)
            logger.warning(f"Voice synthesis failed (non-blocking): {e}")

    return TurnResponse(
        session_id=session.session_id,
        transcript=user_text,
        assistant_message=assessment.assistant_message,
        audio_base64=audio_base64,
        triage_level=assessment.triage_level,
        is_emergency=is_emergency,
        conversation_complete=assessment.conversation_complete,
        assessment=assessment,
        usage=session.usage_stats,
    )


@router.post("/{session_id}/speak", response_model=SpeakResponse)
async def speak_text(session_id: str, request: SpeakRequest):
    """
    Synthesizes speech on demand for any text in the session.
    """
    session = session_manager.get_session(session_id)
    lang = request.language or (session.language if session else "hi-IN")

    try:
        tts_res = await tts_service.synthesize_speech(
            text=request.text,
            language_code=lang,
        )
        if session:
            session.record_usage("tts")
        return SpeakResponse(
            audio_base64=tts_res["audio_base64"],
            content_type=tts_res.get("content_type", "audio/wav")
        )
    except Exception as e:
        if session:
            session.record_usage("tts", failed=True)
        raise HTTPException(
            status_code=502,
            detail=f"Voice synthesis failed: {str(e)}"
        )


@router.delete("/{session_id}")
def end_session(session_id: str):
    """
    Ends and clears the consultation session for patient privacy.
    """
    success = session_manager.close_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Consultation session not found or already closed.")
    return {"status": "closed", "session_id": session_id, "message": "Session closed and data purged."}
