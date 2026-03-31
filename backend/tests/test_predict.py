"""
Unit tests for the Predictive AI endpoints.
Run with: pytest backend/tests/test_predict.py -v
(No Ollama / LLM dependency required.)
"""
from __future__ import annotations

import sys
import os

# Ensure the backend package root is importable when running from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient

# We import main lazily inside fixtures to avoid loading LangChain/Ollama chains
# at module-import time, which might fail in CI with no Ollama instance.


@pytest.fixture(scope="module")
def client():
    from main import app
    return TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# /predict/health
# ─────────────────────────────────────────────────────────────────────────────

def test_predict_health(client):
    resp = client.get("/predict/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "diagnosis" in data["components"]
    assert data["llm_required"] is False


# ─────────────────────────────────────────────────────────────────────────────
# /predict/diagnosis
# ─────────────────────────────────────────────────────────────────────────────

DIAG_PAYLOAD_VALID = {
    "fever": True,
    "pain_level": 6,
    "duration_days": 5,
    "age": 45,
    "gender": "female",
}


def test_diagnosis_returns_three_results(client):
    resp = client.post("/predict/diagnosis", json=DIAG_PAYLOAD_VALID)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["top_diagnoses"]) == 3


def test_diagnosis_confidence_in_range(client):
    resp = client.post("/predict/diagnosis", json=DIAG_PAYLOAD_VALID)
    data = resp.json()
    for d in data["top_diagnoses"]:
        assert 0.0 <= d["confidence_pct"] <= 100.0


def test_diagnosis_has_disclaimer(client):
    resp = client.post("/predict/diagnosis", json=DIAG_PAYLOAD_VALID)
    data = resp.json()
    assert "disclaimer" in data
    assert len(data["disclaimer"]) > 10


def test_diagnosis_invalid_pain_level(client):
    payload = {**DIAG_PAYLOAD_VALID, "pain_level": 11}
    resp = client.post("/predict/diagnosis", json=payload)
    assert resp.status_code == 422


def test_diagnosis_invalid_gender(client):
    payload = {**DIAG_PAYLOAD_VALID, "gender": "unknown"}
    resp = client.post("/predict/diagnosis", json=payload)
    assert resp.status_code == 422


def test_diagnosis_no_fever_male(client):
    payload = {
        "fever": False,
        "pain_level": 3,
        "duration_days": 1,
        "age": 30,
        "gender": "male",
    }
    resp = client.post("/predict/diagnosis", json=payload)
    assert resp.status_code == 200
    assert len(resp.json()["top_diagnoses"]) == 3


# ─────────────────────────────────────────────────────────────────────────────
# /predict/risk
# ─────────────────────────────────────────────────────────────────────────────

VITALS_PAYLOAD_VALID = {
    "systolic_bp": 145,
    "diastolic_bp": 92,
    "glucose": 180,
    "bmi": 31.5,
    "age": 58,
}


def test_risk_returns_three_scores(client):
    resp = client.post("/predict/risk", json=VITALS_PAYLOAD_VALID)
    assert resp.status_code == 200
    data = resp.json()
    assert "cardiovascular_risk_pct" in data
    assert "diabetes_complication_risk_pct" in data
    assert "sepsis_risk_pct" in data


def test_risk_scores_in_range(client):
    resp = client.post("/predict/risk", json=VITALS_PAYLOAD_VALID)
    data = resp.json()
    for key in ("cardiovascular_risk_pct", "diabetes_complication_risk_pct", "sepsis_risk_pct"):
        assert 0.0 <= data[key] <= 100.0


def test_risk_overall_level_valid(client):
    resp = client.post("/predict/risk", json=VITALS_PAYLOAD_VALID)
    data = resp.json()
    assert data["overall_risk_level"] in ("Low", "Moderate", "High", "Critical")


def test_risk_has_disclaimer(client):
    resp = client.post("/predict/risk", json=VITALS_PAYLOAD_VALID)
    assert "disclaimer" in resp.json()


def test_risk_critical_hypertension(client):
    payload = {**VITALS_PAYLOAD_VALID, "systolic_bp": 200, "diastolic_bp": 110, "age": 75}
    resp = client.post("/predict/risk", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_risk_level"] in ("High", "Critical")


def test_risk_invalid_bp_order(client):
    """systolic must be > diastolic."""
    payload = {**VITALS_PAYLOAD_VALID, "systolic_bp": 80, "diastolic_bp": 100}
    resp = client.post("/predict/risk", json=payload)
    assert resp.status_code == 422


def test_risk_low_values(client):
    payload = {
        "systolic_bp": 115,
        "diastolic_bp": 75,
        "glucose": 90,
        "bmi": 22.0,
        "age": 28,
    }
    resp = client.post("/predict/risk", json=payload)
    assert resp.status_code == 200
    assert resp.json()["overall_risk_level"] == "Low"


# ─────────────────────────────────────────────────────────────────────────────
# /predict/dosage
# ─────────────────────────────────────────────────────────────────────────────

DOSAGE_PAYLOAD_VALID = {
    "drug_name": "amoxicillin",
    "weight_kg": 75.0,
    "creatinine_clearance": 90.0,
    "age": 40,
}


def test_dosage_known_drug_normal_renal(client):
    resp = client.post("/predict/dosage", json=DOSAGE_PAYLOAD_VALID)
    assert resp.status_code == 200
    data = resp.json()
    assert data["drug"] == "amoxicillin"
    assert data["recommended_dose_mg"] == 500.0
    assert data["interval_hours"] == 8


def test_dosage_renal_adjustment_applied(client):
    payload = {**DOSAGE_PAYLOAD_VALID, "creatinine_clearance": 20.0}
    resp = client.post("/predict/dosage", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # CrCl 20 < threshold 30 → dose should be reduced (×0.5)
    assert data["recommended_dose_mg"] == 250.0
    assert any("Renal" in adj or "renal" in adj for adj in data["adjustments_applied"])


def test_dosage_metformin_contraindicated_low_crcl(client):
    """Metformin is contraindicated when CrCl < 45."""
    payload = {
        "drug_name": "metformin",
        "weight_kg": 80.0,
        "creatinine_clearance": 30.0,
        "age": 65,
    }
    resp = client.post("/predict/dosage", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # dose should be 0 (contraindicated)
    assert data["recommended_dose_mg"] == 0.0
    assert any("CONTRAINDICATED" in adj for adj in data["adjustments_applied"])


def test_dosage_geriatric_reduction(client):
    payload = {**DOSAGE_PAYLOAD_VALID, "drug_name": "lisinopril", "age": 80}
    resp = client.post("/predict/dosage", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert any("Geriatric" in adj or "geriatric" in adj for adj in data["adjustments_applied"])


def test_dosage_unknown_drug_fallback(client):
    payload = {**DOSAGE_PAYLOAD_VALID, "drug_name": "unknowndrug_xyz"}
    resp = client.post("/predict/dosage", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["confidence"] == 30.0


def test_dosage_has_disclaimer(client):
    resp = client.post("/predict/dosage", json=DOSAGE_PAYLOAD_VALID)
    assert "disclaimer" in resp.json()


def test_dosage_invalid_weight(client):
    payload = {**DOSAGE_PAYLOAD_VALID, "weight_kg": 0}
    resp = client.post("/predict/dosage", json=payload)
    assert resp.status_code == 422
