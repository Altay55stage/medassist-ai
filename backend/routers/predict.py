"""
FastAPI router — Predictive AI endpoints
GET  /predict/health   (sanity check, no LLM needed)
POST /predict/diagnosis
POST /predict/risk
POST /predict/dosage
"""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from models.predictive_engine import get_engine

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic v2 request / response models
# ─────────────────────────────────────────────────────────────────────────────

class PatientSymptoms(BaseModel):
    model_config = {"json_schema_extra": {
        "example": {
            "fever": True,
            "pain_level": 6,
            "duration_days": 4,
            "age": 42,
            "gender": "female",
        }
    }}

    fever: bool = Field(..., description="Patient has fever (≥38 °C)")
    pain_level: Annotated[int, Field(ge=1, le=10)] = Field(
        ..., description="Subjective pain level 1–10"
    )
    duration_days: Annotated[int, Field(ge=1, le=365)] = Field(
        ..., description="Duration of symptoms in days"
    )
    age: Annotated[int, Field(ge=0, le=120)] = Field(..., description="Patient age in years")
    gender: Literal["male", "female", "other"] = Field(..., description="Biological sex")


class DiagnosisEntry(BaseModel):
    diagnosis: str
    confidence_pct: float


class DiagnosisResult(BaseModel):
    top_diagnoses: list[DiagnosisEntry]
    confidence: float
    disclaimer: str


# ── Risk ─────────────────────────────────────────────────────────────────────

class PatientVitals(BaseModel):
    model_config = {"json_schema_extra": {
        "example": {
            "systolic_bp": 145,
            "diastolic_bp": 92,
            "glucose": 180,
            "bmi": 31.5,
            "age": 58,
        }
    }}

    systolic_bp: Annotated[float, Field(ge=60, le=300)] = Field(..., description="Systolic BP in mmHg")
    diastolic_bp: Annotated[float, Field(ge=40, le=200)] = Field(..., description="Diastolic BP in mmHg")
    glucose: Annotated[float, Field(ge=20, le=800)] = Field(..., description="Fasting blood glucose in mg/dL")
    bmi: Annotated[float, Field(ge=10, le=70)] = Field(..., description="Body Mass Index (kg/m²)")
    age: Annotated[int, Field(ge=0, le=120)] = Field(..., description="Patient age in years")

    @model_validator(mode="after")
    def check_bp_order(self) -> "PatientVitals":
        if self.systolic_bp <= self.diastolic_bp:
            raise ValueError("systolic_bp must be greater than diastolic_bp")
        return self


class RiskScoresResponse(BaseModel):
    cardiovascular_risk_pct: float
    diabetes_complication_risk_pct: float
    sepsis_risk_pct: float
    overall_risk_level: str
    confidence: float
    disclaimer: str


# ── Dosage ────────────────────────────────────────────────────────────────────

class DosageRequest(BaseModel):
    model_config = {"json_schema_extra": {
        "example": {
            "drug_name": "amoxicillin",
            "weight_kg": 75.0,
            "creatinine_clearance": 45.0,
            "age": 68,
        }
    }}

    drug_name: str = Field(..., min_length=1, description="Drug name (generic preferred)")
    weight_kg: Annotated[float, Field(ge=1, le=400)] = Field(
        ..., description="Patient weight in kilograms"
    )
    creatinine_clearance: Annotated[float, Field(ge=0, le=200)] = Field(
        ..., description="Cockcroft–Gault CrCl in ml/min"
    )
    age: Annotated[int, Field(ge=0, le=120)] = Field(..., description="Patient age in years")


class DosageRecommendationResponse(BaseModel):
    drug: str
    recommended_dose_mg: float
    dose_unit: str
    interval_hours: int
    daily_dose_mg: float
    adjustments_applied: list[str]
    confidence: float
    disclaimer: str


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health", tags=["Predictive"])
async def predict_health():
    """Verify the predictive engine is loaded (no LLM required)."""
    engine = get_engine()
    return {
        "status": "ok",
        "components": ["diagnosis", "risk", "dosage"],
        "llm_required": False,
    }


@router.post("/diagnosis", response_model=DiagnosisResult, tags=["Predictive"])
async def predict_diagnosis(symptoms: PatientSymptoms) -> DiagnosisResult:
    """
    Predict top-3 probable diagnoses from structured symptom inputs.
    Returns diagnoses ranked by confidence score.
    """
    try:
        engine = get_engine()
        result = engine.diagnosis.predict(
            fever=symptoms.fever,
            pain_level=symptoms.pain_level,
            duration_days=symptoms.duration_days,
            age=symptoms.age,
            gender=symptoms.gender,
        )
        return DiagnosisResult(
            top_diagnoses=[DiagnosisEntry(**d) for d in result.top_diagnoses],
            confidence=result.confidence,
            disclaimer=result.disclaimer,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@router.post("/risk", response_model=RiskScoresResponse, tags=["Predictive"])
async def predict_risk(vitals: PatientVitals) -> RiskScoresResponse:
    """
    Calculate cardiovascular, diabetes complication, and sepsis risk scores
    from patient vitals. Scores are expressed as percentages (0–100).
    """
    try:
        engine = get_engine()
        result = engine.risk.score(
            systolic_bp=vitals.systolic_bp,
            diastolic_bp=vitals.diastolic_bp,
            glucose=vitals.glucose,
            bmi=vitals.bmi,
            age=vitals.age,
        )
        return RiskScoresResponse(
            cardiovascular_risk_pct=result.cardiovascular_risk_pct,
            diabetes_complication_risk_pct=result.diabetes_complication_risk_pct,
            sepsis_risk_pct=result.sepsis_risk_pct,
            overall_risk_level=result.overall_risk_level,
            confidence=result.confidence,
            disclaimer=result.disclaimer,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Risk scoring failed: {exc}") from exc


@router.post("/dosage", response_model=DosageRecommendationResponse, tags=["Predictive"])
async def predict_dosage(request: DosageRequest) -> DosageRecommendationResponse:
    """
    Recommend adjusted dosage considering renal function (CrCl) and age.
    Supports common drugs; falls back to conservative weight-based estimate for unknowns.
    """
    try:
        engine = get_engine()
        result = engine.dosage.optimize(
            drug_name=request.drug_name,
            weight_kg=request.weight_kg,
            creatinine_clearance=request.creatinine_clearance,
            age=request.age,
        )
        return DosageRecommendationResponse(
            drug=result.drug,
            recommended_dose_mg=result.recommended_dose_mg,
            dose_unit=result.dose_unit,
            interval_hours=result.interval_hours,
            daily_dose_mg=result.daily_dose_mg,
            adjustments_applied=result.adjustments_applied,
            confidence=result.confidence,
            disclaimer=result.disclaimer,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Dosage optimization failed: {exc}") from exc
