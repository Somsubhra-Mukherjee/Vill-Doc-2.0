import json
import pytest
from app.schemas.triage import ClinicalAssessment, TriageLevel
from app.services.sarvam_chat import SarvamChatService


def test_schema_valid_json_parsing():
    service = SarvamChatService()
    valid_payload = json.dumps({
        "assistant_message": "আপনাকে বুঝতে পারছি। আপনার কাশি কি শুকনো না কফযুক্ত?",
        "conversation_complete": False,
        "patient_summary": "২ দিন ধরে কাশি এবং সর্দি",
        "symptoms": [
            {"name": "cough", "duration": "2 days", "severity": "mild", "certainty": "confirmed"}
        ],
        "missing_information": ["কফের ধরন এবং জ্বর আছে কিনা"],
        "possible_conditions": [
            {
                "condition_name": "Viral Upper Respiratory Infection",
                "explanation": "কাশি ও সর্দির সাধারণ কারণ",
                "uncertainty": "এটি কেবল একটি সম্ভাবনা, রোগ নির্ণয় নয়"
            }
        ],
        "red_flags": [],
        "triage_level": "insufficient_information",
        "care_recommendations": ["লক্ষণ পর্যবেক্ষণ করুন"],
        "self_care_advice": ["পর্যাপ্ত বিশ্রাম এবং কুসুম গরম জল পান করুন"],
        "follow_up_guidance": ["শ্বাসকষ্ট বা উচ্চ জ্বর হলে চিকিৎসকের পরামর্শ নিন"],
        "disclaimer": "VillDoc 2.0 AI সহায়ক, কোনো চিকিৎসক নয়।"
    })

    assessment = service._parse_and_validate_assessment(valid_payload, "bn-IN")
    assert assessment.triage_level == TriageLevel.INSUFFICIENT_INFORMATION
    assert len(assessment.symptoms) == 1
    assert assessment.symptoms[0].name == "cough"
    assert len(assessment.possible_conditions) == 1


def test_schema_markdown_wrapped_json_parsing():
    service = SarvamChatService()
    raw_markdown = """```json
    {
        "assistant_message": "क्या आपको बुखार भी महसूस हो रहा है?",
        "conversation_complete": false,
        "patient_summary": "Gale me dard",
        "symptoms": [{"name": "sore throat", "duration": "1 day", "severity": "mild"}],
        "missing_information": ["Fever status"],
        "possible_conditions": [],
        "red_flags": [],
        "triage_level": "insufficient_information",
        "care_recommendations": [],
        "self_care_advice": ["Gargle with warm salt water"],
        "follow_up_guidance": [],
        "disclaimer": "VillDoc 2.0 limitation statement"
    }
    ```"""

    assessment = service._parse_and_validate_assessment(raw_markdown, "hi-IN")
    assert assessment.triage_level == TriageLevel.INSUFFICIENT_INFORMATION
    assert len(assessment.symptoms) == 1


def test_schema_malformed_json_fallback():
    service = SarvamChatService()
    broken_payload = "This is not valid json! {broken: [missing bracket"

    assessment = service._parse_and_validate_assessment(broken_payload, "en-IN")
    # Must gracefully return safe insufficient_information assessment rather than raising uncaught exception
    assert assessment.triage_level == TriageLevel.INSUFFICIENT_INFORMATION
    assert assessment.conversation_complete is False
    assert len(assessment.care_recommendations) > 0
