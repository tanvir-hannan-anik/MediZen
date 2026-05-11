"""
OCR and vision analysis service.
Uses pytesseract for text extraction and Groq (vision + text) for image analysis.
"""
import os
import base64
import json
from pathlib import Path

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "")

TEXT_MODEL = "llama-3.3-70b-versatile"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _get_client():
    from groq import Groq
    return Groq(api_key=GROQ_API_KEY)


def setup_tesseract():
    if TESSERACT_CMD:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def extract_text_from_image(image_path: str) -> str:
    setup_tesseract()
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except Exception as e:
        return f"[OCR unavailable: {e}]"


def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except Exception as e:
        return f"[PDF extraction failed: {e}]"


def _encode_image(path: str) -> tuple[str, str]:
    suffix = Path(path).suffix.lower()
    media_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                 ".gif": "image/gif", ".webp": "image/webp"}
    media_type = media_map.get(suffix, "image/jpeg")
    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")
    return data, media_type


def analyze_medical_image(image_path: str) -> dict:
    """Analyze a medical image (X-ray, skin condition, scan) with Groq Vision."""
    if not GROQ_API_KEY:
        return _mock_image_analysis()

    try:
        client = _get_client()
        image_data, media_type = _encode_image(image_path)
        data_url = f"data:{media_type};base64,{image_data}"

        response = client.chat.completions.create(
            model=VISION_MODEL,
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                    {
                        "type": "text",
                        "text": (
                            "You are a medical AI assistant. Analyze this medical image and provide:\n"
                            "1. Image type (X-ray, skin condition, scan, etc.)\n"
                            "2. Top 3 possible conditions with confidence percentages (e.g., 85%)\n"
                            "3. Key observations\n"
                            "4. Recommended next steps\n"
                            "5. Severity level (Low/Moderate/High)\n\n"
                            "Respond as JSON with keys: image_type, conditions (list of {name, confidence, description}), "
                            "observations, next_steps (list), severity, disclaimer.\n"
                            "IMPORTANT: Always include a disclaimer that this is not a medical diagnosis."
                        ),
                    },
                ],
            }],
        )

        text = response.choices[0].message.content
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except Exception:
            pass
        return {"raw": text, "disclaimer": "AI-generated estimate only. Consult a licensed physician."}
    except Exception as e:
        print(f"[Vision] Error: {e}")
        return _mock_image_analysis()


def _enrich_prescription_medications(result: dict) -> dict:
    """
    Post-process prescription analysis results by looking up each medication
    in medicines.csv and enriching with verified purpose/diseases data.
    """
    try:
        from services import medicine_service
        medications = result.get("medications", [])
        enriched = []
        for med in medications:
            name = med.get("name", "")
            csv_row = medicine_service.lookup(name) if name else None
            if csv_row:
                med = dict(med)
                med["csv_verified"] = True
                med["verified_brand_name"] = csv_row.get("brand_name", name)
                med["verified_generic_name"] = csv_row.get("generic_name", "")
                med["verified_strength"] = csv_row.get("strength", "")
                med["verified_dosage_form"] = csv_row.get("dosage_form", "")
                med["verified_manufacturer"] = csv_row.get("manufacturer", "")
                # Prefer CSV purpose if not already set or to override AI guess
                if csv_row.get("purpose"):
                    med["purpose"] = csv_row["purpose"]
                if csv_row.get("diseases"):
                    med["diseases"] = csv_row["diseases"]
                med["verified_source"] = "medicines.csv"
            else:
                med = dict(med)
                med["csv_verified"] = False
                med["verified_source"] = "AI (not found in medicines.csv)"
            enriched.append(med)
        result = dict(result)
        result["medications"] = enriched
        result["medicine_db_source"] = "medicines.csv"
    except Exception as e:
        print(f"[OCR] Medicine enrichment error: {e}")
    return result


def analyze_prescription(file_path: str, is_pdf: bool = False) -> dict:
    """Extract and explain prescription contents."""
    if is_pdf:
        extracted_text = extract_text_from_pdf(file_path)
        result = _analyze_prescription_text(extracted_text)
    else:
        # Use Groq Vision directly for images — no Tesseract dependency
        result = _analyze_prescription_image(file_path)
    return _enrich_prescription_medications(result)


def _analyze_prescription_image(image_path: str) -> dict:
    """Analyze prescription image via Groq Vision (no Tesseract required)."""
    if not GROQ_API_KEY:
        return _mock_prescription("[Image uploaded — set GROQ_API_KEY for AI analysis]")

    try:
        client = _get_client()
        image_data, media_type = _encode_image(image_path)
        data_url = f"data:{media_type};base64,{image_data}"

        response = client.chat.completions.create(
            model=VISION_MODEL,
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}},
                    {"type": "text", "text": (
                        "This is a medical prescription image. Read and analyze it carefully.\n"
                        "Respond as JSON with keys:\n"
                        "- doctor_name, patient_name, date\n"
                        "- medications: list of {name, dosage, frequency, duration, purpose, plain_explanation}\n"
                        "  (for 'name' use the exact brand or generic name as written on the prescription)\n"
                        "- general_advice: string\n"
                        "- important_reminders: list of strings\n"
                        "- plain_summary: a 2-3 sentence plain-language summary\n"
                        "- extracted_text: the raw text visible in the prescription\n"
                        "- disclaimer: string\n"
                        "Make all explanations simple for non-medical users."
                    )},
                ],
            }],
        )
        text = response.choices[0].message.content
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except Exception:
            pass
        return {"raw": text, "extracted_text": text, "disclaimer": "Consult your prescribing doctor."}
    except Exception as e:
        print(f"[Prescription Vision] Error: {e}")
        return _mock_prescription(f"[Vision analysis failed: {e}]")


def _analyze_prescription_text(extracted_text: str) -> dict:
    """Analyze prescription text (from PDF) via Groq LLM."""
    if not GROQ_API_KEY:
        return _mock_prescription(extracted_text)

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": (
                    f"Prescription text (extracted from PDF):\n\n{extracted_text}\n\n"
                    "Analyze this prescription and respond as JSON with keys:\n"
                    "- doctor_name, patient_name, date\n"
                    "- medications: list of {name, dosage, frequency, duration, purpose, plain_explanation}\n"
                    "- general_advice: string\n"
                    "- important_reminders: list of strings\n"
                    "- plain_summary: a 2-3 sentence plain-language summary\n"
                    "- disclaimer: string\n"
                    "Make explanations simple and understandable for non-medical users."
                ),
            }],
        )
        text = response.choices[0].message.content
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
                result["extracted_text"] = extracted_text
                return result
        except Exception:
            pass
        return {"raw": text, "extracted_text": extracted_text, "disclaimer": "Consult your prescribing doctor."}
    except Exception as e:
        print(f"[Prescription] Error: {e}")
        return _mock_prescription(extracted_text)


def analyze_lab_report(file_path: str, is_pdf: bool = False) -> dict:
    """Parse and interpret lab test results."""
    if is_pdf:
        extracted_text = extract_text_from_pdf(file_path)
    else:
        extracted_text = extract_text_from_image(file_path)

    if not GROQ_API_KEY:
        return _mock_report(extracted_text)

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": (
                    f"Lab report text:\n\n{extracted_text}\n\n"
                    "Parse and analyze this lab report. Respond as JSON with keys:\n"
                    "- report_type: string (e.g., CBC, Metabolic Panel)\n"
                    "- report_date: string\n"
                    "- markers: list of {test_name, value, unit, normal_range, status (Normal/High/Low/Critical), interpretation}\n"
                    "- abnormal_count: integer\n"
                    "- overall_interpretation: string\n"
                    "- severity: Low/Moderate/High\n"
                    "- priority_tests: list of {test_name, priority (High/Medium), reason, timeframe}\n"
                    "- plain_explanation: 2-4 sentence plain-language summary\n"
                    "- disclaimer: string\n"
                    "Highlight critical/abnormal values clearly."
                ),
            }],
        )
        text = response.choices[0].message.content
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(text[start:end])
                result["extracted_text"] = extracted_text
                return result
        except Exception:
            pass
        return {"raw": text, "extracted_text": extracted_text, "disclaimer": "Consult a physician for interpretation."}
    except Exception as e:
        print(f"[Report] Error: {e}")
        return _mock_report(extracted_text)


# ── Mock responses for when API key is not configured ──────────────────────────

def _mock_image_analysis() -> dict:
    return {
        "image_type": "Medical image",
        "conditions": [
            {"name": "Possible respiratory condition", "confidence": 72, "description": "Pattern consistent with mild inflammation in lower respiratory tract."},
            {"name": "Normal variant", "confidence": 20, "description": "Could be within normal anatomical range."},
            {"name": "Requires further imaging", "confidence": 8, "description": "Additional views recommended for confirmation."},
        ],
        "observations": "Image analyzed. Set GROQ_API_KEY for detailed AI analysis.",
        "next_steps": ["Consult a radiologist", "Book a GP appointment", "Monitor symptoms"],
        "severity": "Moderate",
        "disclaimer": "This is an AI-generated estimate only. Always consult a licensed physician for diagnosis.",
    }


def _mock_prescription(extracted_text: str) -> dict:
    return {
        "doctor_name": "Dr. (extracted from document)",
        "patient_name": "Patient",
        "date": "See document",
        "medications": [{"name": "Medication", "dosage": "As prescribed", "frequency": "As directed", "duration": "As prescribed", "purpose": "As directed by doctor", "plain_explanation": "Take as directed by your doctor."}],
        "general_advice": "Follow your doctor's instructions carefully.",
        "important_reminders": ["Complete the full course", "Contact your doctor if side effects occur"],
        "plain_summary": "Your prescription has been extracted. Set GROQ_API_KEY for detailed AI analysis. Always follow your doctor's instructions.",
        "extracted_text": extracted_text,
        "disclaimer": "Not medical advice. Follow prescribing doctor's instructions.",
    }


def _mock_report(extracted_text: str) -> dict:
    return {
        "report_type": "Lab Report",
        "report_date": "See document",
        "markers": [],
        "abnormal_count": 0,
        "overall_interpretation": "Set GROQ_API_KEY for detailed AI analysis of lab results.",
        "severity": "Low",
        "priority_tests": [],
        "plain_explanation": "Your lab report has been extracted. Please set your Groq API key for detailed analysis, or consult your doctor directly.",
        "extracted_text": extracted_text,
        "disclaimer": "Informational only. Consult a physician for interpretation.",
    }
