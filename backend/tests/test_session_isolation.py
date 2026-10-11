import pytest
from app.session_manager import SessionManager
from app.schemas.triage import ClinicalAssessment, TriageLevel


def test_session_isolation():
    manager = SessionManager()

    # Create two separate patient sessions
    session_a = manager.create_session(language="hi-IN")
    session_b = manager.create_session(language="bn-IN")

    assert session_a.session_id != session_b.session_id
    assert session_a.language == "hi-IN"
    assert session_b.language == "bn-IN"

    # Add patient turn to session A
    session_a.add_user_turn("Mujhe 2 din se halka bukhar hai")
    assessment_a = ClinicalAssessment(
        assistant_message="क्या आपको खांसी भी है?",
        conversation_complete=False,
        patient_summary="2 days mild fever",
        triage_level=TriageLevel.INSUFFICIENT_INFORMATION,
        care_recommendations=["Aaram karein"],
    )
    session_a.add_assistant_turn(assessment_a.assistant_message, assessment_a)

    # Session B should have no messages or inputs
    assert len(session_b.messages) == 0
    assert len(session_b.user_inputs) == 0
    assert session_b.latest_assessment is None

    # Add patient turn to session B
    session_b.add_user_turn("Amar buke chap lagchhe")
    assessment_b = ClinicalAssessment(
        assistant_message="অবিলম্বে হাসপাতালে যান",
        conversation_complete=True,
        patient_summary="Chest pressure reported",
        triage_level=TriageLevel.EMERGENCY,
        care_recommendations=["১১২ তে কল করুন"],
    )
    session_b.add_assistant_turn(assessment_b.assistant_message, assessment_b)

    # Verify session A was not affected by session B
    assert len(session_a.user_inputs) == 1
    assert session_a.user_inputs[0] == "Mujhe 2 din se halka bukhar hai"
    assert session_a.latest_assessment.triage_level == TriageLevel.INSUFFICIENT_INFORMATION

    # Verify session B is isolated
    assert len(session_b.user_inputs) == 1
    assert session_b.user_inputs[0] == "Amar buke chap lagchhe"
    assert session_b.latest_assessment.triage_level == TriageLevel.EMERGENCY

    # Close session A
    assert manager.close_session(session_a.session_id) is True
    assert manager.get_session(session_a.session_id) is None
    # Session B is still available
    assert manager.get_session(session_b.session_id) is not None
