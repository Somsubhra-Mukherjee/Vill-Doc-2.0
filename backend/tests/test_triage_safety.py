import pytest
from app.schemas.triage import ClinicalAssessment, TriageLevel, SymptomItem
from app.services.triage_safety import (
    apply_safety_guardrails,
    check_emergency_signals,
    sanitize_care_advice,
)


def test_emergency_signal_detection_multilingual():
    # English emergency signals
    assert len(check_emergency_signals("I am experiencing severe chest pain and breathlessness")) >= 2
    assert len(check_emergency_signals("Patient has slurred speech and facial drooping")) >= 1
    assert len(check_emergency_signals("Vomiting blood since morning")) >= 1

    # Hindi Devanagari & transliteration signals
    assert len(check_emergency_signals("सीने में दर्द बहुत तेज हो रहा है")) >= 1
    assert len(check_emergency_signals("saans lene me taklif ho rahi hai")) >= 1
    assert len(check_emergency_signals("mareez behosh ho gaya hai")) >= 1

    # Bengali signals
    assert len(check_emergency_signals("আমার বুকে তীব্র ব্যথা এবং শ্বাসকষ্ট হচ্ছে")) >= 2
    assert len(check_emergency_signals("রোগী সংজ্ঞাহীন হয়ে পড়েছে")) >= 1


def test_deterministic_escalation_overrides_model_routine():
    # Simulate a scenario where model erroneously returned routine for a chest pain patient
    naive_assessment = ClinicalAssessment(
        assistant_message="Drink warm water and rest.",
        conversation_complete=False,
        patient_summary="Chest pain reported",
        triage_level=TriageLevel.ROUTINE,
        self_care_advice=["Drink ginger tea", "Lie down and rest"],
        care_recommendations=["Take a rest"],
    )

    history = ["I have severe crushing chest pain since 20 minutes"]
    escalated_assessment, was_escalated = apply_safety_guardrails(
        assessment=naive_assessment,
        user_input_history=history,
        language="en-IN",
    )

    assert was_escalated is True
    assert escalated_assessment.triage_level == TriageLevel.EMERGENCY
    assert escalated_assessment.conversation_complete is True
    # Crucial safety rule: no home remedies in emergency
    assert len(escalated_assessment.self_care_advice) == 0
    # Must advise 112 / emergency care
    assert any("112" in r or "emergency" in r.lower() for r in escalated_assessment.care_recommendations)


def test_sanitize_care_advice_removes_prescriptions_and_antibiotics():
    unvetted_advice = [
        "Drink plenty of fluids and get adequate rest.",
        "Take amoxicillin 500mg twice a day.",
        "Take azithromycin antibiotic course.",
        "Use a cool mist humidifier in the bedroom.",
    ]

    sanitized = sanitize_care_advice(unvetted_advice)
    assert len(sanitized) == 2
    assert "Drink plenty of fluids and get adequate rest." in sanitized
    assert "Use a cool mist humidifier in the bedroom." in sanitized
    assert not any("amoxicillin" in s for s in sanitized)
    assert not any("antibiotic" in s for s in sanitized)
