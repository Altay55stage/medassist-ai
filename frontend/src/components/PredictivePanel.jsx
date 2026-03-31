import React, { useState } from "react";
import { predictDiagnosis, predictRisk, predictDosage } from "../api/predict";

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function Disclaimer() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-300 mb-6">
      <span className="mt-0.5 text-base">⚠️</span>
      <span>
        <strong className="text-red-200">Medical Disclaimer:</strong> This tool
        is for <strong>informational purposes only</strong>. It does{" "}
        <strong>not</strong> constitute medical advice, diagnosis, or treatment.
        Always consult a licensed physician before making any health-related
        decisions.
      </span>
    </div>
  );
}

function ProgressBar({ value, color = "blue", label }) {
  const clamp = Math.min(100, Math.max(0, value));
  const colorMap = {
    blue:   "from-blue-500 to-blue-400",
    green:  "from-emerald-500 to-emerald-400",
    yellow: "from-amber-500 to-amber-400",
    red:    "from-red-500 to-red-400",
    purple: "from-purple-500 to-purple-400",
  };
  const gradient = colorMap[color] || colorMap.blue;

  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{label}</span>
          <span className="font-semibold text-white">{clamp.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-gray-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
          style={{ width: `${clamp}%` }}
        />
      </div>
    </div>
  );
}

function RiskBadge({ level }) {
  const map = {
    Low:      "border-emerald-500 bg-emerald-950/60 text-emerald-300",
    Moderate: "border-amber-500  bg-amber-950/60  text-amber-300",
    High:     "border-orange-500 bg-orange-950/60 text-orange-300",
    Critical: "border-red-500    bg-red-950/60    text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
        map[level] || map.Moderate
      }`}
    >
      {level === "Critical" && "🚨 "}
      {level === "High" && "🔴 "}
      {level === "Moderate" && "🟡 "}
      {level === "Low" && "🟢 "}
      {level}
    </span>
  );
}

function ConfidenceBadge({ value }) {
  const color =
    value >= 75 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      Model confidence: {value.toFixed(1)}%
    </span>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-gray-800/80 border border-gray-600/50 px-4 py-2.5 text-sm text-white placeholder-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all";

const selectCls =
  "w-full rounded-xl bg-gray-800/80 border border-gray-600/50 px-4 py-2.5 text-sm text-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all";

function SubmitBtn({ loading, label = "Analyze" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`mt-2 w-full rounded-xl py-2.5 px-6 text-sm font-bold tracking-wide transition-all
        ${
          loading
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-900/30"
        }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Analyzing…
        </span>
      ) : (
        `🔮 ${label}`
      )}
    </button>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-red-900/40 border border-red-500/40 px-4 py-3 text-sm text-red-300 mt-4">
      ❌ {message}
    </div>
  );
}

// ─── Tab 1: Diagnosis ─────────────────────────────────────────────────────────

function DiagnosisTab() {
  const [form, setForm] = useState({
    fever: false,
    pain_level: 5,
    duration_days: 3,
    age: 35,
    gender: "male",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await predictDiagnosis(form);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Disclaimer />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fever toggle */}
        <div className="sm:col-span-2 flex items-center gap-3 rounded-xl bg-gray-800/60 border border-gray-700/50 px-4 py-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setForm((p) => ({ ...p, fever: !p.fever }))}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                form.fever ? "bg-red-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.fever ? "translate-x-5" : ""
                }`}
              />
            </div>
            <span className="text-sm text-gray-300">
              🌡️ Fever present{" "}
              <span className="text-gray-500">(≥ 38 °C / 100.4 °F)</span>
            </span>
          </label>
        </div>

        <FieldRow label="Pain Level (1–10)">
          <div className="flex items-center gap-3">
            <input
              type="range"
              name="pain_level"
              min={1}
              max={10}
              value={form.pain_level}
              onChange={handleChange}
              className="flex-1 accent-violet-500"
            />
            <span className="w-6 text-center text-sm font-bold text-white">
              {form.pain_level}
            </span>
          </div>
        </FieldRow>

        <FieldRow label="Duration (days)">
          <input
            type="number"
            name="duration_days"
            min={1}
            max={365}
            value={form.duration_days}
            onChange={handleChange}
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Patient Age">
          <input
            type="number"
            name="age"
            min={0}
            max={120}
            value={form.age}
            onChange={handleChange}
            className={inputCls}
          />
        </FieldRow>

        <FieldRow label="Biological Sex">
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className={selectCls}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other / Prefer not to say</option>
          </select>
        </FieldRow>

        <div className="sm:col-span-2">
          <SubmitBtn loading={loading} label="Predict Diagnosis" />
        </div>
      </form>

      <ErrorBanner message={error} />

      {result && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
              Top 3 Probable Diagnoses
            </h3>
            <ConfidenceBadge value={result.confidence} />
          </div>

          {result.top_diagnoses.map((d, i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-800/60 border border-gray-700/40 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                  <span className="text-sm font-semibold text-white">{d.diagnosis}</span>
                </div>
              </div>
              <ProgressBar
                value={d.confidence_pct}
                color={i === 0 ? "purple" : i === 1 ? "blue" : "green"}
              />
            </div>
          ))}

          <p className="text-[11px] text-gray-500 leading-relaxed">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Risk Score ────────────────────────────────────────────────────────

function RiskTab() {
  const [form, setForm] = useState({
    systolic_bp: 130,
    diastolic_bp: 85,
    glucose: 110,
    bmi: 26,
    age: 50,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await predictRisk(form);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskItems = result
    ? [
        {
          label: "Cardiovascular Risk",
          value: result.cardiovascular_risk_pct,
          icon: "🫀",
          color: "red",
        },
        {
          label: "Diabetes Complication Risk",
          value: result.diabetes_complication_risk_pct,
          icon: "💉",
          color: "yellow",
        },
        {
          label: "Sepsis Risk",
          value: result.sepsis_risk_pct,
          icon: "🦠",
          color: "purple",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Disclaimer />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { name: "systolic_bp",  label: "Systolic BP (mmHg)",    min: 60,  max: 300 },
          { name: "diastolic_bp", label: "Diastolic BP (mmHg)",   min: 40,  max: 200 },
          { name: "glucose",      label: "Fasting Glucose (mg/dL)",min: 20, max: 800 },
          { name: "bmi",          label: "BMI (kg/m²)",            min: 10,  max: 70,  step: 0.1 },
          { name: "age",          label: "Age (years)",            min: 0,   max: 120 },
        ].map(({ name, label, min, max, step = 1 }) => (
          <FieldRow key={name} label={label}>
            <input
              type="number"
              name={name}
              min={min}
              max={max}
              step={step}
              value={form[name]}
              onChange={handleChange}
              className={inputCls}
            />
          </FieldRow>
        ))}

        <div className="sm:col-span-2">
          <SubmitBtn loading={loading} label="Calculate Risk Scores" />
        </div>
      </form>

      <ErrorBanner message={error} />

      {result && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
              Clinical Risk Profile
            </h3>
            <div className="flex items-center gap-3">
              <RiskBadge level={result.overall_risk_level} />
              <ConfidenceBadge value={result.confidence} />
            </div>
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/40 p-5 space-y-5">
            {riskItems.map(({ label, value, icon, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
                <ProgressBar value={value} color={color} label="" />
                <div className="text-right text-xs text-gray-400">{value.toFixed(1)}%</div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Dosage ────────────────────────────────────────────────────────────

const KNOWN_DRUGS = [
  "amoxicillin", "metformin", "lisinopril", "atorvastatin",
  "vancomycin", "ciprofloxacin", "ibuprofen", "omeprazole",
  "warfarin", "metoprolol", "acetaminophen", "furosemide",
];

function DosageTab() {
  const [form, setForm] = useState({
    drug_name: "amoxicillin",
    weight_kg: 75,
    creatinine_clearance: 90,
    age: 40,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customDrug, setCustomDrug] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await predictDosage(form);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Disclaimer />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-2">
          <FieldRow label="Drug Name">
            {customDrug ? (
              <input
                type="text"
                name="drug_name"
                value={form.drug_name}
                onChange={handleChange}
                placeholder="Enter generic drug name…"
                className={inputCls}
              />
            ) : (
              <select
                name="drug_name"
                value={form.drug_name}
                onChange={handleChange}
                className={selectCls}
              >
                {KNOWN_DRUGS.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </FieldRow>
          <button
            type="button"
            onClick={() => {
              setCustomDrug((p) => !p);
              setForm((p) => ({ ...p, drug_name: customDrug ? "amoxicillin" : "" }));
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {customDrug ? "← Pick from list" : "Enter custom drug name →"}
          </button>
        </div>

        {[
          { name: "weight_kg",             label: "Patient Weight (kg)",          min: 1,  max: 400, step: 0.5 },
          { name: "creatinine_clearance",  label: "CrCl — Cockcroft–Gault (ml/min)", min: 0, max: 200, step: 0.5 },
          { name: "age",                   label: "Age (years)",                  min: 0,  max: 120 },
        ].map(({ name, label, min, max, step = 1 }) => (
          <FieldRow key={name} label={label}>
            <input
              type="number"
              name={name}
              min={min}
              max={max}
              step={step}
              value={form[name]}
              onChange={handleChange}
              className={inputCls}
            />
          </FieldRow>
        ))}

        <div className="sm:col-span-2">
          <SubmitBtn loading={loading} label="Calculate Dosage" />
        </div>
      </form>

      <ErrorBanner message={error} />

      {result && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            Dosage Recommendation
          </h3>

          {result.recommended_dose_mg === 0 ? (
            <div className="rounded-xl bg-red-950/60 border border-red-500/50 p-4 text-red-300 text-sm font-semibold">
              🚫 {result.adjustments_applied[0]}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/40 p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-gray-900/60 p-3">
                  <div className="text-xl font-black text-white">
                    {result.recommended_dose_mg}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {result.dose_unit} per dose
                  </div>
                </div>
                <div className="rounded-lg bg-gray-900/60 p-3">
                  <div className="text-xl font-black text-white">
                    {result.interval_hours}h
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">interval</div>
                </div>
                <div className="rounded-lg bg-gray-900/60 p-3">
                  <div className="text-xl font-black text-white">
                    {result.daily_dose_mg}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{result.dose_unit}/day</div>
                </div>
              </div>

              <ProgressBar
                value={result.confidence}
                label="Algorithm Confidence"
                color={result.confidence >= 75 ? "green" : result.confidence >= 50 ? "yellow" : "red"}
              />

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Adjustments Applied
                </p>
                {result.adjustments_applied.map((adj, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-violet-400 mt-0.5">•</span>
                    <span>{adj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main PredictivePanel ─────────────────────────────────────────────────────

const TABS = [
  { id: "diagnosis", label: "🧬 Diagnosis",   Component: DiagnosisTab },
  { id: "risk",      label: "📊 Risk Score",   Component: RiskTab      },
  { id: "dosage",    label: "💊 Dosage",        Component: DosageTab    },
];

export default function PredictivePanel() {
  const [activeTab, setActiveTab] = useState("diagnosis");
  const Active = TABS.find((t) => t.id === activeTab);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 bg-gray-800/80 border-b border-gray-700/60">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all
              ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-violet-600/80 to-blue-600/80 text-white shadow-lg"
                  : "text-gray-400 hover:bg-gray-700/60 hover:text-gray-200"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {Active && <Active.Component />}
      </div>
    </div>
  );
}
