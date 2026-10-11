import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "sarvam_configured" in data
    # Ensure api key is NOT exposed anywhere in response
    assert "sarvam_api_key" not in data
    assert "api_key" not in data


def test_session_creation_requires_consent():
    # Without consent: must fail with 400
    res_no_consent = client.post("/api/sessions", json={"language": "hi-IN", "consent_given": False})
    assert res_no_consent.status_code == 400
    assert "consent is required" in res_no_consent.json()["detail"].lower()

    # With consent: succeeds
    res_consent = client.post("/api/sessions", json={"language": "hi-IN", "consent_given": True})
    assert res_consent.status_code == 200
    data = res_consent.json()
    assert "session_id" in data
    assert data["language"] == "hi-IN"


def test_invalid_session_returns_404():
    response = client.get("/api/sessions/non-existent-uuid-1234")
    assert response.status_code == 404
