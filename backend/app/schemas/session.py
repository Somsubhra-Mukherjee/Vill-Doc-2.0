from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.triage import ClinicalAssessment, TriageLevel


class CreateSessionRequest(BaseModel):
    language: str = Field(default="hi-IN", description="Selected BCP-47 language code: hi-IN, bn-IN, en-IN, etc.")
    consent_given: bool = Field(default=False, description="Patient consent confirmation")


class SessionResponse(BaseModel):
    session_id: str
    language: str
    created_at: str
    turn_count: int
    is_active: bool


class TurnRequest(BaseModel):
    text: Optional[str] = Field(default=None, description="Patient text message if typed or edited")
    language: Optional[str] = Field(default=None, description="Optional override language code")


class TurnResponse(BaseModel):
    session_id: str
    transcript: str = Field(default="", description="Recognized or submitted patient text")
    assistant_message: str = Field(..., description="Assistant's conversational reply")
    audio_base64: Optional[str] = Field(default=None, description="Synthesized voice audio in base64")
    triage_level: TriageLevel
    is_emergency: bool = False
    conversation_complete: bool = False
    assessment: ClinicalAssessment
    usage: Dict[str, Any] = Field(default_factory=dict, description="Session and turn usage statistics")


class SpeakRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize")
    language: Optional[str] = Field(default=None, description="Language code")


class SpeakResponse(BaseModel):
    audio_base64: str
    content_type: str = "audio/wav"
