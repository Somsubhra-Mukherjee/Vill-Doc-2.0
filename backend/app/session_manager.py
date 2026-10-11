"""
VillDoc 2.0 - In-Memory Session Manager
Maintains isolated clinical conversation states, patient turns, and usage analytics.
Zero persistent patient data storage to ensure privacy.
"""

import time
import uuid
from typing import Dict, Optional, List, Any
from app.schemas.triage import ClinicalAssessment, TriageLevel


class SessionData:
    def __init__(self, session_id: str, language: str):
        self.session_id: str = session_id
        self.language: str = language
        self.created_at: float = time.time()
        self.turn_count: int = 0
        self.is_active: bool = True
        self.messages: List[Dict[str, str]] = []  # OpenAI style {"role": "user"|"assistant", "content": ...}
        self.user_inputs: List[str] = []
        self.latest_assessment: Optional[ClinicalAssessment] = None
        self.usage_stats: Dict[str, Any] = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "stt_requests": 0,
            "tts_requests": 0,
            "chat_requests": 0,
            "failed_requests": 0,
        }

    def add_user_turn(self, text: str):
        self.user_inputs.append(text)
        self.messages.append({"role": "user", "content": text})
        self.turn_count += 1

    def add_assistant_turn(self, assistant_text: str, assessment: ClinicalAssessment):
        # We store the assistant's natural message in conversation history so the LLM has natural dialogue context
        self.messages.append({"role": "assistant", "content": assistant_text})
        self.latest_assessment = assessment

    def record_usage(
        self,
        service: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0,
        failed: bool = False,
    ):
        if failed:
            self.usage_stats["failed_requests"] += 1
            return

        if service == "chat":
            self.usage_stats["chat_requests"] += 1
            self.usage_stats["prompt_tokens"] += prompt_tokens
            self.usage_stats["completion_tokens"] += completion_tokens
            self.usage_stats["total_tokens"] += total_tokens
        elif service == "stt":
            self.usage_stats["stt_requests"] += 1
        elif service == "tts":
            self.usage_stats["tts_requests"] += 1


class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, SessionData] = {}

    def create_session(self, language: str = "hi-IN") -> SessionData:
        session_id = str(uuid.uuid4())
        session = SessionData(session_id=session_id, language=language)
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[SessionData]:
        session = self._sessions.get(session_id)
        if session and session.is_active:
            return session
        return None

    def close_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            session = self._sessions[session_id]
            session.is_active = False
            # Clean up conversation content to maintain data privacy
            del self._sessions[session_id]
            return True
        return False

    def get_global_stats(self) -> Dict[str, Any]:
        """Aggregated usage statistics across sessions for dev mode monitor."""
        total_sessions = len(self._sessions)
        total_tokens = sum(s.usage_stats["total_tokens"] for s in self._sessions.values())
        stt_count = sum(s.usage_stats["stt_requests"] for s in self._sessions.values())
        tts_count = sum(s.usage_stats["tts_requests"] for s in self._sessions.values())
        chat_count = sum(s.usage_stats["chat_requests"] for s in self._sessions.values())
        failed_count = sum(s.usage_stats["failed_requests"] for s in self._sessions.values())
        return {
            "active_sessions": total_sessions,
            "total_tokens": total_tokens,
            "stt_requests": stt_count,
            "tts_requests": tts_count,
            "chat_requests": chat_count,
            "failed_requests": failed_count,
        }


session_manager = SessionManager()
