import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    sarvam_api_key: str = ""
    sarvam_chat_model: str = "sarvam-105b-conversations"
    sarvam_stt_model: str = "saaras:v4"
    sarvam_tts_model: str = "bulbul:v4-flash"
    sarvam_tts_speaker: str = "shubh"
    port: int = 8000
    host: str = "0.0.0.0"
    debug: bool = False

    model_config = SettingsConfigDict(
        env_file=(
            str(Path(__file__).resolve().parent.parent / ".env"),
            str(Path(__file__).resolve().parent.parent.parent / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_sarvam_configured(self) -> bool:
        k = self.sarvam_api_key.strip()
        return bool(k and k != "your_actual_key_here" and len(k) > 10)


settings = Settings()
