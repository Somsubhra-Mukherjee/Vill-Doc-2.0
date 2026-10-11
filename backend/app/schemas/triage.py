from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class TriageLevel(str, Enum):
    EMERGENCY = "emergency"
    URGENT = "urgent"
    ROUTINE = "routine"
    INSUFFICIENT_INFORMATION = "insufficient_information"


class SymptomItem(BaseModel):
    name: str = Field(..., description="Name of the symptom")
    duration: Optional[str] = Field(default=None, description="Duration or onset, e.g. '2 days'")
    severity: Optional[str] = Field(default="unknown", description="Severity: mild, moderate, severe, or unknown")
    certainty: Optional[str] = Field(default="suspected", description="certainty: confirmed, suspected, or denied")


class PossibleCondition(BaseModel):
    condition_name: str = Field(..., description="Name of plausible condition hypothesis")
    explanation: str = Field(..., description="Short explanation of why symptoms may align")
    uncertainty: str = Field(..., description="Explicit statement that this is a hypothesis, not a diagnosis")


class ClinicalAssessment(BaseModel):
    assistant_message: str = Field(
        ...,
        description="Natural, empathetic conversational response in the patient's selected language"
    )
    conversation_complete: bool = Field(
        default=False,
        description="True if enough information gathered or if an emergency is reached and full summary is ready"
    )
    patient_summary: str = Field(
        default="",
        description="Concise factual summary of symptoms reported by the patient"
    )
    symptoms: List[SymptomItem] = Field(
        default_factory=list,
        description="List of reported symptoms"
    )
    missing_information: List[str] = Field(
        default_factory=list,
        description="Questions or clinical details still pending"
    )
    possible_conditions: List[PossibleCondition] = Field(
        default_factory=list,
        description="Non-definitive hypotheses explaining the symptoms"
    )
    red_flags: List[str] = Field(
        default_factory=list,
        description="Identified emergency or warning signs"
    )
    triage_level: TriageLevel = Field(
        default=TriageLevel.INSUFFICIENT_INFORMATION,
        description="Urgency classification: emergency, urgent, routine, or insufficient_information"
    )
    care_recommendations: List[str] = Field(
        default_factory=list,
        description="Safe, practical next steps"
    )
    self_care_advice: List[str] = Field(
        default_factory=list,
        description="Conservative self-care measures (rest, hydration) when appropriate; empty in emergencies"
    )
    follow_up_guidance: List[str] = Field(
        default_factory=list,
        description="Guidance on when and where to seek professional reassessment or escalate care"
    )
    disclaimer: str = Field(
        default="VillDoc 2.0 is an AI health triage assistant, not a doctor. In an emergency, please call 112 or visit the nearest hospital immediately.",
        description="Standard medical limitation statement"
    )
