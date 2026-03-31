"""
Outils métier pour l'agent MedAssist.
"""
from langchain_core.tools import tool
from typing import Optional
from models.predictive_engine import get_engine


@tool
def calcul_dosage(
    medicament: str,
    poids_kg: float,
    age_ans: Optional[int] = None,
    indication: Optional[str] = None,
) -> str:
    """
    Calcule la dose recommandée d'un médicament selon le poids et l'âge du patient.
    Utilise ce tool quand l'utilisateur demande un calcul de dosage.
    """
    # Base de données simplifiée — à enrichir avec une vraie source médicale
    DOSAGES = {
        "paracetamol": {"dose_mg_kg": 15, "max_mg": 1000, "intervalle_h": 6},
        "ibuprofene":  {"dose_mg_kg": 10, "max_mg": 400,  "intervalle_h": 8},
        "amoxicilline": {"dose_mg_kg": 25, "max_mg": 500, "intervalle_h": 8},
    }

    med_key = medicament.lower().replace("é", "e").replace("è", "e")
    if med_key not in DOSAGES:
        return f"⚠️ Médicament '{medicament}' non trouvé dans la base locale. Consultez le Vidal."

    data = DOSAGES[med_key]
    dose = min(poids_kg * data["dose_mg_kg"], data["max_mg"])
    return (
        f"💊 {medicament.capitalize()} — Dosage calculé:\n"
        f"  • Dose par prise : {dose:.0f} mg\n"
        f"  • Intervalle : toutes les {data['intervalle_h']}h\n"
        f"  • Dose journalière max : {data['max_mg'] * (24 // data['intervalle_h']):.0f} mg\n"
        f"  ⚠️ Vérifier avec le prescripteur — ceci est une aide, pas une prescription."
    )


@tool
def interactions_medicamenteuses(medicament_a: str, medicament_b: str) -> str:
    """
    Vérifie les interactions médicamenteuses connues entre deux médicaments.
    Utilise ce tool quand l'utilisateur demande une vérification d'interactions.
    """
    INTERACTIONS = {
        ("warfarine", "aspirine"): ("MAJEURE", "Risque hémorragique accru. Association déconseillée."),
        ("metformine", "alcool"):  ("MODÉRÉE", "Risque d'acidose lactique. Éviter la consommation d'alcool."),
        ("paracetamol", "ibuprofene"): ("MINEURE", "Association possible mais surveiller la fonction rénale."),
    }

    key = tuple(sorted([medicament_a.lower(), medicament_b.lower()]))
    if key in INTERACTIONS:
        level, desc = INTERACTIONS[key]
        emoji = "🔴" if level == "MAJEURE" else "🟡" if level == "MODÉRÉE" else "🟢"
        return f"{emoji} Interaction {level}\n{desc}"
    return f"✅ Aucune interaction majeure connue entre {medicament_a} et {medicament_b}.\n(Base locale limitée — vérifier Thériaque pour confirmation.)"


@tool
def recherche_pubmed(query: str, nb_resultats: int = 3) -> str:
    """
    Simule une recherche d'études médicales sur PubMed.
    En production: connecter à l'API NCBI E-utilities.
    """
    return (
        f"🔬 Recherche PubMed: '{query}'\n"
        f"→ En production, ce tool appelle l'API NCBI avec:\n"
        f"   GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        f"?db=pubmed&term={query}&retmax={nb_resultats}\n"
        f"   Retourne les {nb_resultats} articles les plus récents et pertinents."
    )


@tool
def _predict_diagnosis(
    fever: bool,
    pain_level: int,
    duration_days: int,
    age: int,
    gender: str,
) -> str:
    """
    Predict top-3 probable diagnoses from structured symptom inputs.
    fever: boolean value (True if >= 38C)
    pain_level: integer from 1 to 10
    duration_days: duration of symptoms in days
    age: patient age in years
    gender: 'male', 'female', or 'other'
    """
    engine = get_engine()
    res = engine.diagnosis.predict(fever, pain_level, duration_days, age, gender)
    lines = [f"Prédiction de Diagnostic (Confiance: {res.confidence}%) :"]
    for i, d in enumerate(res.top_diagnoses):
        lines.append(f"  {i+1}. {d['diagnosis']} ({d['confidence_pct']}%)")
    lines.append(f"⚠️ {res.disclaimer}")
    return "\n".join(lines)


@tool
def _predict_risk(
    systolic_bp: float,
    diastolic_bp: float,
    glucose: float,
    bmi: float,
    age: int,
) -> str:
    """
    Calculate cardiovascular, diabetes complication, and sepsis risk scores.
    systolic_bp: Systolic Blood Pressure (mmHg)
    diastolic_bp: Diastolic Blood Pressure (mmHg)
    glucose: Fasting blood glucose (mg/dL)
    bmi: Body Mass Index (kg/m^2)
    age: Patient age in years
    """
    engine = get_engine()
    res = engine.risk.score(systolic_bp, diastolic_bp, glucose, bmi, age)
    return (
        f"Scores de Risque Clinique (Niveau global: {res.overall_risk_level}) :\n"
        f"  • Risque Cardiovasculaire: {res.cardiovascular_risk_pct}%\n"
        f"  • Risque de complication Diabète: {res.diabetes_complication_risk_pct}%\n"
        f"  • Risque de Sepsis: {res.sepsis_risk_pct}%\n"
        f"⚠️ {res.disclaimer}"
    )


@tool
def _optimize_dosage(
    drug_name: str,
    weight_kg: float,
    creatinine_clearance: float,
    age: int,
) -> str:
    """
    Recommend adjusted dosage considering renal function (CrCl) and age.
    drug_name: generic drug name (e.g., 'amoxicillin', 'lisinopril')
    weight_kg: patient weight (kg)
    creatinine_clearance: Renal clearance (ml/min)
    age: Patient age in years
    """
    engine = get_engine()
    res = engine.dosage.optimize(drug_name, weight_kg, creatinine_clearance, age)
    adj = "\n  • ".join(res.adjustments_applied)
    return (
        f"Recommandation Posologique pour {res.drug.capitalize()} :\n"
        f"  • Dose recommandée : {res.recommended_dose_mg} {res.dose_unit}\n"
        f"  • Intervalle : toutes les {res.interval_hours}h\n"
        f"Ajustements appliqués :\n  • {adj}\n"
        f"⚠️ {res.disclaimer}"
    )


def get_medical_tools():
    return [
        calcul_dosage, 
        interactions_medicamenteuses, 
        recherche_pubmed,
        _predict_diagnosis,
        _predict_risk,
        _optimize_dosage
    ]

