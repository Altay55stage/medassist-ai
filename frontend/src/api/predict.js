/**
 * Predictive AI API client
 * Calls /predict/* endpoints on the FastAPI backend.
 * Works independently of Ollama/LLM.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**  Shared fetch wrapper with error handling */
async function apiFetch(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  return res.json();
}

/**
 * POST /predict/diagnosis
 * @param {{ fever: boolean, pain_level: number, duration_days: number, age: number, gender: string }} data
 */
export async function predictDiagnosis(data) {
  return apiFetch("/predict/diagnosis", data);
}

/**
 * POST /predict/risk
 * @param {{ systolic_bp: number, diastolic_bp: number, glucose: number, bmi: number, age: number }} data
 */
export async function predictRisk(data) {
  return apiFetch("/predict/risk", data);
}

/**
 * POST /predict/dosage
 * @param {{ drug_name: string, weight_kg: number, creatinine_clearance: number, age: number }} data
 */
export async function predictDosage(data) {
  return apiFetch("/predict/dosage", data);
}
