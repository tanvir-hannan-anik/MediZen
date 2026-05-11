"""
Medicine Service — central source of truth for all medicine-related lookups.

Reads medicines.csv once into memory and provides:
  - search(query)          : fuzzy search by brand or generic name
  - lookup(name)           : best single match
  - enrich(row)            : adds purpose/diseases to a medicine row
  - detect_in_text(text)   : finds medicine mentions inside free text
"""
import csv
import os
import re
from difflib import SequenceMatcher

_CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medicines.csv")

_medicines: list[dict] = []
_brand_index: dict[str, list[int]] = {}   # lowercase brand name → row indices
_generic_index: dict[str, list[int]] = {} # lowercase generic keyword → row indices
_loaded = False


# ---------------------------------------------------------------------------
# Purpose & diseases map  (keyed by lowercase keywords inside generic_name)
# ---------------------------------------------------------------------------
GENERIC_PURPOSE_MAP: dict[str, dict] = {
    # Analgesics / Antipyretics
    "paracetamol": {
        "purpose": "Pain relief and fever reduction",
        "diseases": ["Fever", "Headache", "Mild to moderate pain", "Toothache", "Body ache"],
    },
    "ibuprofen": {
        "purpose": "Anti-inflammatory pain relief (NSAID)",
        "diseases": ["Pain", "Fever", "Arthritis", "Menstrual cramps", "Inflammation"],
    },
    "diclofenac": {
        "purpose": "Anti-inflammatory and pain relief (NSAID)",
        "diseases": ["Arthritis", "Pain", "Inflammation", "Musculoskeletal disorders", "Menstrual pain"],
    },
    "naproxen": {
        "purpose": "Anti-inflammatory pain relief (NSAID)",
        "diseases": ["Arthritis", "Pain", "Gout", "Inflammation", "Menstrual cramps"],
    },
    "aspirin": {
        "purpose": "Pain relief, blood thinning, and anti-inflammatory",
        "diseases": ["Pain", "Fever", "Heart attack prevention", "Blood clot prevention", "Inflammation"],
    },
    "ketorolac": {
        "purpose": "Short-term moderate-to-severe pain relief (NSAID)",
        "diseases": ["Post-operative pain", "Acute pain", "Inflammation"],
    },
    "tramadol": {
        "purpose": "Moderate to severe pain management (Opioid-like analgesic)",
        "diseases": ["Moderate pain", "Severe pain", "Chronic pain", "Post-operative pain"],
    },
    # Antibiotics
    "amoxicillin": {
        "purpose": "Bacterial infection treatment (Penicillin antibiotic)",
        "diseases": ["Pneumonia", "Ear infection", "UTI", "Skin infection", "Throat infection", "Bronchitis"],
    },
    "cefixime": {
        "purpose": "Bacterial infection treatment (3rd-generation Cephalosporin)",
        "diseases": ["UTI", "Gonorrhea", "Typhoid", "Respiratory infection", "Ear infection"],
    },
    "ceftriaxone": {
        "purpose": "Bacterial infection treatment (3rd-generation Cephalosporin, injectable)",
        "diseases": ["Severe pneumonia", "Meningitis", "Septicemia", "Typhoid", "Gonorrhea"],
    },
    "cefalexin": {
        "purpose": "Bacterial infection treatment (1st-generation Cephalosporin)",
        "diseases": ["Skin infection", "UTI", "Respiratory infection", "Bone infection"],
    },
    "azithromycin": {
        "purpose": "Bacterial infection treatment (Macrolide antibiotic)",
        "diseases": ["Respiratory tract infection", "Pneumonia", "Typhoid", "Skin infection", "STI"],
    },
    "ciprofloxacin": {
        "purpose": "Bacterial infection treatment (Fluoroquinolone antibiotic)",
        "diseases": ["UTI", "Diarrhea", "Typhoid", "Respiratory infection", "Bone infection"],
    },
    "levofloxacin": {
        "purpose": "Bacterial infection treatment (Fluoroquinolone antibiotic)",
        "diseases": ["Pneumonia", "UTI", "Sinusitis", "Skin infection", "Anthrax exposure"],
    },
    "moxifloxacin": {
        "purpose": "Bacterial infection treatment (Fluoroquinolone antibiotic)",
        "diseases": ["Pneumonia", "Sinusitis", "Skin infection", "Intra-abdominal infection"],
    },
    "metronidazole": {
        "purpose": "Antibiotic and antiparasitic for anaerobic infections",
        "diseases": ["Amoebiasis", "Giardiasis", "Bacterial vaginosis", "Dental infection", "C. difficile"],
    },
    "erythromycin": {
        "purpose": "Bacterial infection treatment (Macrolide antibiotic)",
        "diseases": ["Respiratory infection", "Skin infection", "STI", "Diphtheria", "Whooping cough"],
    },
    "clarithromycin": {
        "purpose": "Bacterial infection treatment (Macrolide antibiotic)",
        "diseases": ["Pneumonia", "H. pylori (with PPI)", "Skin infection", "Sinusitis"],
    },
    "doxycycline": {
        "purpose": "Antibiotic and antiparasitic (Tetracycline class)",
        "diseases": ["Malaria prevention", "Acne", "Pneumonia", "Lyme disease", "Chlamydia"],
    },
    "tetracycline": {
        "purpose": "Broad-spectrum antibiotic (Tetracycline class)",
        "diseases": ["Acne", "Respiratory infection", "Chlamydia", "H. pylori", "Rickettsial disease"],
    },
    "cloxacillin": {
        "purpose": "Staphylococcal infection treatment (Penicillinase-resistant antibiotic)",
        "diseases": ["Skin infection", "Bone infection", "Staphylococcal infection", "Wound infection"],
    },
    "flucloxacillin": {
        "purpose": "Staphylococcal infection treatment (Penicillinase-resistant antibiotic)",
        "diseases": ["Skin infection", "Bone infection", "Staphylococcal infection", "Wound infection"],
    },
    "amoxiclav": {
        "purpose": "Broad-spectrum antibiotic (Amoxicillin + Clavulanate)",
        "diseases": ["Sinusitis", "Ear infection", "UTI", "Skin infection", "Dental infection"],
    },
    "co-amoxiclav": {
        "purpose": "Broad-spectrum antibiotic (Amoxicillin + Clavulanate)",
        "diseases": ["Sinusitis", "Ear infection", "UTI", "Skin infection", "Dental infection"],
    },
    "clavulanate": {
        "purpose": "Beta-lactamase inhibitor (enhances antibiotic coverage)",
        "diseases": ["Antibiotic-resistant bacterial infection"],
    },
    "trimethoprim": {
        "purpose": "Bacterial infection treatment (Antifolate antibiotic)",
        "diseases": ["UTI", "Respiratory infection", "Prostatitis"],
    },
    "sulfamethoxazole": {
        "purpose": "Bacterial and parasitic infection treatment (Sulfonamide)",
        "diseases": ["UTI", "Pneumocystis pneumonia", "Traveler's diarrhea", "Toxoplasmosis"],
    },
    "nitrofurantoin": {
        "purpose": "Urinary tract infection treatment",
        "diseases": ["UTI", "Bladder infection", "Cystitis"],
    },
    "rifampicin": {
        "purpose": "Tuberculosis and leprosy treatment (Rifamycin antibiotic)",
        "diseases": ["Tuberculosis (TB)", "Leprosy", "Meningococcal prophylaxis"],
    },
    "isoniazid": {
        "purpose": "Tuberculosis treatment and prevention",
        "diseases": ["Tuberculosis (TB)", "Latent TB"],
    },
    "pyrazinamide": {
        "purpose": "Tuberculosis treatment",
        "diseases": ["Tuberculosis (TB)"],
    },
    "ethambutol": {
        "purpose": "Tuberculosis treatment",
        "diseases": ["Tuberculosis (TB)"],
    },
    # Antifungals
    "fluconazole": {
        "purpose": "Antifungal treatment (Azole)",
        "diseases": ["Thrush", "Candida infection", "Fungal meningitis", "Vaginal yeast infection"],
    },
    "ketoconazole": {
        "purpose": "Antifungal treatment (Azole, systemic and topical)",
        "diseases": ["Fungal infection", "Dandruff", "Seborrhoeic dermatitis", "Ringworm"],
    },
    "clotrimazole": {
        "purpose": "Antifungal treatment (Topical and oral)",
        "diseases": ["Thrush", "Ringworm", "Athlete's foot", "Vaginal yeast infection", "Skin fungal infection"],
    },
    "miconazole": {
        "purpose": "Antifungal treatment (Topical and oral)",
        "diseases": ["Fungal skin infection", "Oral thrush", "Vaginal candidiasis", "Athlete's foot"],
    },
    "terbinafine": {
        "purpose": "Antifungal treatment (Allylamine)",
        "diseases": ["Athlete's foot", "Ringworm", "Nail fungal infection", "Tinea infections"],
    },
    "nystatin": {
        "purpose": "Antifungal treatment (Polyene, topical and oral)",
        "diseases": ["Oral thrush", "Intestinal candidiasis", "Vaginal candidiasis", "Skin candidiasis"],
    },
    "griseofulvin": {
        "purpose": "Fungal skin and nail infection treatment",
        "diseases": ["Ringworm", "Tinea capitis", "Nail fungal infection"],
    },
    # Antihypertensives
    "amlodipine": {
        "purpose": "Blood pressure reduction and angina treatment (Calcium channel blocker)",
        "diseases": ["Hypertension", "Angina", "Coronary artery disease"],
    },
    "nifedipine": {
        "purpose": "Blood pressure reduction and angina (Calcium channel blocker)",
        "diseases": ["Hypertension", "Angina", "Raynaud's phenomenon"],
    },
    "losartan": {
        "purpose": "Blood pressure reduction (ARB — Angiotensin receptor blocker)",
        "diseases": ["Hypertension", "Diabetic nephropathy", "Heart failure", "Stroke prevention"],
    },
    "valsartan": {
        "purpose": "Blood pressure reduction and heart failure treatment (ARB)",
        "diseases": ["Hypertension", "Heart failure", "Post-MI", "Diabetic nephropathy"],
    },
    "telmisartan": {
        "purpose": "Blood pressure reduction (ARB)",
        "diseases": ["Hypertension", "Cardiovascular risk reduction", "Diabetic nephropathy"],
    },
    "enalapril": {
        "purpose": "Blood pressure reduction and heart failure treatment (ACE inhibitor)",
        "diseases": ["Hypertension", "Heart failure", "Diabetic nephropathy", "Post-MI"],
    },
    "ramipril": {
        "purpose": "Blood pressure reduction and heart failure (ACE inhibitor)",
        "diseases": ["Hypertension", "Heart failure", "Post-MI", "Diabetic nephropathy"],
    },
    "lisinopril": {
        "purpose": "Blood pressure and heart failure treatment (ACE inhibitor)",
        "diseases": ["Hypertension", "Heart failure", "Post-MI", "Diabetic nephropathy"],
    },
    "atenolol": {
        "purpose": "Blood pressure reduction and heart rate control (Beta-blocker)",
        "diseases": ["Hypertension", "Angina", "Arrhythmia", "Heart attack prevention"],
    },
    "metoprolol": {
        "purpose": "Blood pressure and heart rate control (Beta-blocker)",
        "diseases": ["Hypertension", "Angina", "Heart failure", "Arrhythmia", "Migraine prevention"],
    },
    "bisoprolol": {
        "purpose": "Blood pressure and heart failure treatment (Beta-blocker)",
        "diseases": ["Hypertension", "Heart failure", "Angina", "Arrhythmia"],
    },
    "propranolol": {
        "purpose": "Blood pressure, arrhythmia, and anxiety control (Beta-blocker)",
        "diseases": ["Hypertension", "Angina", "Arrhythmia", "Tremor", "Migraine prevention", "Anxiety"],
    },
    "carvedilol": {
        "purpose": "Heart failure and blood pressure treatment (Alpha/Beta-blocker)",
        "diseases": ["Heart failure", "Hypertension", "Post-MI"],
    },
    "hydralazine": {
        "purpose": "Blood pressure reduction (Vasodilator)",
        "diseases": ["Hypertension", "Heart failure", "Hypertensive emergency in pregnancy"],
    },
    "isosorbide mononitrate": {
        "purpose": "Angina prevention and treatment (Nitrate)",
        "diseases": ["Angina", "Coronary artery disease", "Heart failure"],
    },
    "isosorbide dinitrate": {
        "purpose": "Angina treatment (Nitrate)",
        "diseases": ["Angina", "Heart failure", "Coronary artery disease"],
    },
    "furosemide": {
        "purpose": "Fluid removal (Loop diuretic)",
        "diseases": ["Edema", "Heart failure", "Hypertension", "Pulmonary edema", "Kidney disease"],
    },
    "spironolactone": {
        "purpose": "Fluid removal and heart failure treatment (Potassium-sparing diuretic)",
        "diseases": ["Heart failure", "Hypertension", "Edema", "PCOS", "Hyperaldosteronism"],
    },
    "hydrochlorothiazide": {
        "purpose": "Blood pressure reduction and fluid removal (Thiazide diuretic)",
        "diseases": ["Hypertension", "Edema", "Heart failure", "Kidney stones (calcium)"],
    },
    # Diabetes
    "metformin": {
        "purpose": "Blood sugar control (Biguanide antidiabetic)",
        "diseases": ["Type 2 diabetes", "Prediabetes", "Polycystic ovary syndrome (PCOS)"],
    },
    "glibenclamide": {
        "purpose": "Blood sugar lowering (Sulfonylurea antidiabetic)",
        "diseases": ["Type 2 diabetes"],
    },
    "glimepiride": {
        "purpose": "Blood sugar control (Sulfonylurea antidiabetic)",
        "diseases": ["Type 2 diabetes"],
    },
    "glipizide": {
        "purpose": "Blood sugar control (Sulfonylurea antidiabetic)",
        "diseases": ["Type 2 diabetes"],
    },
    "sitagliptin": {
        "purpose": "Blood sugar control (DPP-4 inhibitor antidiabetic)",
        "diseases": ["Type 2 diabetes"],
    },
    "empagliflozin": {
        "purpose": "Blood sugar control and heart/kidney protection (SGLT2 inhibitor)",
        "diseases": ["Type 2 diabetes", "Heart failure", "Diabetic kidney disease"],
    },
    "dapagliflozin": {
        "purpose": "Blood sugar control and heart/kidney protection (SGLT2 inhibitor)",
        "diseases": ["Type 2 diabetes", "Heart failure", "Diabetic kidney disease"],
    },
    "insulin": {
        "purpose": "Blood glucose regulation",
        "diseases": ["Type 1 diabetes", "Type 2 diabetes", "Diabetic ketoacidosis"],
    },
    "pioglitazone": {
        "purpose": "Blood sugar control (Thiazolidinedione antidiabetic)",
        "diseases": ["Type 2 diabetes"],
    },
    # GI / Stomach
    "omeprazole": {
        "purpose": "Stomach acid reduction (Proton pump inhibitor)",
        "diseases": ["GERD", "Peptic ulcer", "H. pylori infection", "Zollinger-Ellison syndrome", "Heartburn"],
    },
    "pantoprazole": {
        "purpose": "Stomach acid reduction (Proton pump inhibitor)",
        "diseases": ["GERD", "Peptic ulcer", "Heartburn", "Acid reflux"],
    },
    "esomeprazole": {
        "purpose": "Stomach acid reduction (Proton pump inhibitor)",
        "diseases": ["GERD", "Peptic ulcer", "Heartburn", "Acid reflux"],
    },
    "lansoprazole": {
        "purpose": "Stomach acid reduction (Proton pump inhibitor)",
        "diseases": ["GERD", "Peptic ulcer", "H. pylori", "Heartburn"],
    },
    "rabeprazole": {
        "purpose": "Stomach acid reduction (Proton pump inhibitor)",
        "diseases": ["GERD", "Peptic ulcer", "Heartburn"],
    },
    "ranitidine": {
        "purpose": "Stomach acid reduction (H2 blocker)",
        "diseases": ["GERD", "Peptic ulcer", "Heartburn", "Zollinger-Ellison syndrome"],
    },
    "famotidine": {
        "purpose": "Stomach acid reduction (H2 blocker)",
        "diseases": ["GERD", "Peptic ulcer", "Heartburn", "Acid reflux"],
    },
    "domperidone": {
        "purpose": "Nausea/vomiting control and gastric motility enhancement",
        "diseases": ["Nausea", "Vomiting", "Gastroparesis", "Bloating", "Acid reflux"],
    },
    "metoclopramide": {
        "purpose": "Nausea/vomiting control and gastric motility (Prokinetic)",
        "diseases": ["Nausea", "Vomiting", "GERD", "Diabetic gastroparesis"],
    },
    "ondansetron": {
        "purpose": "Anti-nausea and anti-vomiting (5-HT3 antagonist)",
        "diseases": ["Chemotherapy-induced nausea", "Post-operative nausea", "Vomiting", "Gastroenteritis"],
    },
    "mebeverine": {
        "purpose": "Antispasmodic for gut cramps",
        "diseases": ["Irritable bowel syndrome (IBS)", "Abdominal cramps", "Colonic spasm", "Diarrhea"],
    },
    "hyoscine": {
        "purpose": "Antispasmodic for abdominal cramps",
        "diseases": ["Abdominal cramps", "IBS", "Travel sickness", "Nausea"],
    },
    "loperamide": {
        "purpose": "Diarrhea control (Antidiarrheal)",
        "diseases": ["Acute diarrhea", "Chronic diarrhea", "IBS-diarrhea"],
    },
    "bisacodyl": {
        "purpose": "Constipation relief (Stimulant laxative)",
        "diseases": ["Constipation", "Bowel preparation for procedures"],
    },
    "lactulose": {
        "purpose": "Constipation and hepatic encephalopathy treatment (Osmotic laxative)",
        "diseases": ["Constipation", "Hepatic encephalopathy", "Chronic constipation"],
    },
    "aluminium hydroxide": {
        "purpose": "Antacid to relieve acidity",
        "diseases": ["Heartburn", "Indigestion", "Peptic ulcer", "GERD", "Hyperphosphatemia"],
    },
    "magnesium hydroxide": {
        "purpose": "Antacid and mild laxative",
        "diseases": ["Heartburn", "Constipation", "Indigestion", "Hyperacidity"],
    },
    "sucralfate": {
        "purpose": "Gastric ulcer protective coating",
        "diseases": ["Peptic ulcer", "GERD", "Stress ulcer prevention"],
    },
    # Respiratory / Allergy
    "salbutamol": {
        "purpose": "Airway opening for breathing difficulties (Short-acting Beta-2 agonist bronchodilator)",
        "diseases": ["Asthma", "COPD", "Bronchospasm", "Wheezing", "Exercise-induced bronchospasm"],
    },
    "salmeterol": {
        "purpose": "Long-acting bronchodilator for asthma and COPD",
        "diseases": ["Asthma", "COPD", "Nocturnal asthma"],
    },
    "formoterol": {
        "purpose": "Long-acting bronchodilator",
        "diseases": ["Asthma", "COPD"],
    },
    "ipratropium": {
        "purpose": "Bronchodilator for COPD (Anticholinergic)",
        "diseases": ["COPD", "Asthma", "Bronchospasm"],
    },
    "theophylline": {
        "purpose": "Bronchodilator for asthma and COPD",
        "diseases": ["Asthma", "COPD", "Bronchitis"],
    },
    "budesonide": {
        "purpose": "Inhaled or nasal corticosteroid for airway inflammation",
        "diseases": ["Asthma", "COPD", "Allergic rhinitis", "Crohn's disease"],
    },
    "fluticasone": {
        "purpose": "Inhaled corticosteroid for airway inflammation",
        "diseases": ["Asthma", "COPD", "Allergic rhinitis"],
    },
    "beclomethasone": {
        "purpose": "Inhaled corticosteroid for asthma",
        "diseases": ["Asthma", "Allergic rhinitis"],
    },
    "montelukast": {
        "purpose": "Asthma and allergy prevention (Leukotriene receptor antagonist)",
        "diseases": ["Asthma", "Allergic rhinitis", "Exercise-induced bronchoconstriction"],
    },
    "cetirizine": {
        "purpose": "Allergy symptom relief (Antihistamine)",
        "diseases": ["Allergic rhinitis", "Urticaria (hives)", "Hay fever", "Allergic conjunctivitis", "Skin allergy"],
    },
    "loratadine": {
        "purpose": "Allergy symptom relief (Non-drowsy antihistamine)",
        "diseases": ["Allergic rhinitis", "Urticaria", "Hay fever", "Skin allergy"],
    },
    "fexofenadine": {
        "purpose": "Allergy relief (Non-drowsy antihistamine)",
        "diseases": ["Allergic rhinitis", "Urticaria", "Hay fever"],
    },
    "desloratadine": {
        "purpose": "Allergy relief (Non-drowsy antihistamine)",
        "diseases": ["Allergic rhinitis", "Urticaria", "Hay fever"],
    },
    "chlorphenamine": {
        "purpose": "Allergy and cold symptom relief (Antihistamine)",
        "diseases": ["Allergic rhinitis", "Urticaria", "Common cold", "Hay fever"],
    },
    "promethazine": {
        "purpose": "Allergy, nausea, and sedation (Antihistamine/Phenothiazine)",
        "diseases": ["Nausea", "Vomiting", "Allergy", "Travel sickness", "Insomnia"],
    },
    "dextromethorphan": {
        "purpose": "Cough suppression (Antitussive)",
        "diseases": ["Dry cough", "Cold", "Upper respiratory tract infection"],
    },
    "bromhexine": {
        "purpose": "Chest congestion relief (Expectorant/mucolytic)",
        "diseases": ["Productive cough", "Bronchitis", "COPD", "Respiratory tract infection"],
    },
    "ambroxol": {
        "purpose": "Mucolytic and expectorant for productive cough",
        "diseases": ["Bronchitis", "Productive cough", "COPD", "Respiratory tract infection"],
    },
    "acetylcysteine": {
        "purpose": "Mucolytic and antidote (Acetaminophen overdose)",
        "diseases": ["Productive cough", "COPD", "Paracetamol overdose", "Cystic fibrosis"],
    },
    "pseudoephedrine": {
        "purpose": "Nasal decongestion",
        "diseases": ["Nasal congestion", "Sinusitis", "Common cold"],
    },
    "xylometazoline": {
        "purpose": "Nasal decongestion (Nasal spray)",
        "diseases": ["Nasal congestion", "Sinusitis", "Common cold"],
    },
    # Vitamins & Supplements
    "thiamine": {
        "purpose": "Vitamin B1 supplementation",
        "diseases": ["Thiamine deficiency", "Beriberi", "Wernicke encephalopathy", "Neuropathy"],
    },
    "riboflavin": {
        "purpose": "Vitamin B2 supplementation",
        "diseases": ["Riboflavin deficiency", "Migraine prevention", "Angular stomatitis"],
    },
    "pyridoxine": {
        "purpose": "Vitamin B6 supplementation",
        "diseases": ["B6 deficiency", "Morning sickness", "Peripheral neuropathy", "Isoniazid-induced neuropathy"],
    },
    "cyanocobalamin": {
        "purpose": "Vitamin B12 supplementation",
        "diseases": ["Pernicious anemia", "B12 deficiency anemia", "Neuropathy", "Fatigue"],
    },
    "methylcobalamin": {
        "purpose": "Active Vitamin B12 supplementation",
        "diseases": ["B12 deficiency", "Peripheral neuropathy", "Diabetic neuropathy"],
    },
    "folic acid": {
        "purpose": "Folate supplementation",
        "diseases": ["Folic acid deficiency", "Anemia", "Neural tube defect prevention", "Pregnancy support"],
    },
    "ascorbic acid": {
        "purpose": "Vitamin C supplementation and antioxidant",
        "diseases": ["Scurvy", "Vitamin C deficiency", "Immune support", "Iron absorption"],
    },
    "cholecalciferol": {
        "purpose": "Vitamin D3 supplementation",
        "diseases": ["Vitamin D deficiency", "Rickets", "Osteomalacia", "Osteoporosis", "Immune support"],
    },
    "ergocalciferol": {
        "purpose": "Vitamin D2 supplementation",
        "diseases": ["Vitamin D deficiency", "Rickets", "Hypoparathyroidism"],
    },
    "retinol": {
        "purpose": "Vitamin A supplementation",
        "diseases": ["Vitamin A deficiency", "Night blindness", "Measles prevention", "Xerophthalmia"],
    },
    "tocopherol": {
        "purpose": "Vitamin E supplementation and antioxidant",
        "diseases": ["Vitamin E deficiency", "Neuropathy", "Antioxidant support"],
    },
    "phytomenadione": {
        "purpose": "Vitamin K supplementation and blood clotting",
        "diseases": ["Vitamin K deficiency", "Bleeding disorder", "Newborn haemorrhagic disease"],
    },
    "calcium carbonate": {
        "purpose": "Calcium supplementation and antacid",
        "diseases": ["Calcium deficiency", "Osteoporosis", "Heartburn", "Hypocalcemia"],
    },
    "zinc": {
        "purpose": "Zinc supplementation",
        "diseases": ["Zinc deficiency", "Diarrhea in children", "Wound healing support", "Immune support"],
    },
    "ferrous sulfate": {
        "purpose": "Iron supplementation",
        "diseases": ["Iron deficiency anemia", "Anemia", "Fatigue from iron deficiency"],
    },
    "ferrous gluconate": {
        "purpose": "Iron supplementation (gentle on stomach)",
        "diseases": ["Iron deficiency anemia", "Anemia"],
    },
    "magnesium": {
        "purpose": "Magnesium supplementation",
        "diseases": ["Magnesium deficiency", "Muscle cramps", "Migraine prevention", "Constipation"],
    },
    "multivitamin": {
        "purpose": "General nutritional supplementation",
        "diseases": ["Vitamin deficiency", "Nutritional support", "Malnutrition prevention"],
    },
    # Neurological
    "gabapentin": {
        "purpose": "Nerve pain control and seizure prevention",
        "diseases": ["Neuropathic pain", "Epilepsy", "Restless legs syndrome", "Post-herpetic neuralgia"],
    },
    "pregabalin": {
        "purpose": "Nerve pain control and anticonvulsant",
        "diseases": ["Neuropathic pain", "Fibromyalgia", "Epilepsy", "Anxiety disorder"],
    },
    "carbamazepine": {
        "purpose": "Seizure control and nerve pain (Anticonvulsant)",
        "diseases": ["Epilepsy", "Trigeminal neuralgia", "Bipolar disorder"],
    },
    "phenytoin": {
        "purpose": "Seizure control (Anticonvulsant)",
        "diseases": ["Epilepsy", "Status epilepticus", "Trigeminal neuralgia"],
    },
    "valproic acid": {
        "purpose": "Seizure control and mood stabilization",
        "diseases": ["Epilepsy", "Bipolar disorder", "Migraine prevention"],
    },
    "levetiracetam": {
        "purpose": "Seizure control (Modern anticonvulsant)",
        "diseases": ["Epilepsy", "Partial seizures", "Myoclonic seizures"],
    },
    "phenobarbitone": {
        "purpose": "Seizure control (Barbiturate anticonvulsant)",
        "diseases": ["Epilepsy", "Febrile seizures", "Status epilepticus"],
    },
    "sumatriptan": {
        "purpose": "Migraine attack treatment (Triptan)",
        "diseases": ["Migraine", "Cluster headache"],
    },
    # Psychiatric / CNS
    "fluoxetine": {
        "purpose": "Depression and anxiety treatment (SSRI antidepressant)",
        "diseases": ["Depression", "OCD", "Panic disorder", "Bulimia nervosa", "PTSD"],
    },
    "sertraline": {
        "purpose": "Depression and anxiety treatment (SSRI antidepressant)",
        "diseases": ["Depression", "Anxiety", "PTSD", "OCD", "Panic disorder"],
    },
    "escitalopram": {
        "purpose": "Depression and anxiety treatment (SSRI antidepressant)",
        "diseases": ["Depression", "Generalized anxiety disorder", "Panic disorder"],
    },
    "paroxetine": {
        "purpose": "Depression and anxiety treatment (SSRI antidepressant)",
        "diseases": ["Depression", "Anxiety", "OCD", "PTSD", "Social anxiety"],
    },
    "amitriptyline": {
        "purpose": "Depression and neuropathic pain treatment (Tricyclic antidepressant)",
        "diseases": ["Depression", "Neuropathic pain", "Migraine prevention", "Insomnia"],
    },
    "diazepam": {
        "purpose": "Anxiety and muscle spasm relief (Benzodiazepine)",
        "diseases": ["Anxiety", "Insomnia", "Muscle spasm", "Seizures", "Alcohol withdrawal"],
    },
    "alprazolam": {
        "purpose": "Anxiety and panic disorder treatment (Benzodiazepine)",
        "diseases": ["Anxiety disorder", "Panic disorder", "Insomnia"],
    },
    "clonazepam": {
        "purpose": "Seizure and anxiety treatment (Benzodiazepine)",
        "diseases": ["Epilepsy", "Panic disorder", "Anxiety", "Restless legs syndrome"],
    },
    "lorazepam": {
        "purpose": "Anxiety and seizure treatment (Benzodiazepine)",
        "diseases": ["Anxiety", "Insomnia", "Seizures", "Alcohol withdrawal"],
    },
    "haloperidol": {
        "purpose": "Antipsychotic for psychosis and agitation",
        "diseases": ["Schizophrenia", "Psychosis", "Severe agitation", "Tourette syndrome"],
    },
    "risperidone": {
        "purpose": "Antipsychotic for psychosis and bipolar disorder",
        "diseases": ["Schizophrenia", "Bipolar disorder", "Autism-related irritability"],
    },
    "olanzapine": {
        "purpose": "Antipsychotic for psychosis and bipolar disorder",
        "diseases": ["Schizophrenia", "Bipolar disorder", "Manic episodes"],
    },
    "lithium": {
        "purpose": "Mood stabilizer for bipolar disorder",
        "diseases": ["Bipolar disorder", "Mania", "Depression (adjunct)"],
    },
    "zolpidem": {
        "purpose": "Insomnia treatment (Sedative-hypnotic)",
        "diseases": ["Insomnia", "Sleep-onset difficulty"],
    },
    # Steroids / Corticosteroids
    "prednisolone": {
        "purpose": "Inflammation and immune suppression (Corticosteroid)",
        "diseases": ["Asthma", "Rheumatoid arthritis", "Allergic reactions", "Inflammatory bowel disease", "Lupus"],
    },
    "prednisone": {
        "purpose": "Inflammation and immune suppression (Corticosteroid)",
        "diseases": ["Asthma", "Rheumatoid arthritis", "Allergic reactions", "Inflammatory conditions"],
    },
    "dexamethasone": {
        "purpose": "Potent anti-inflammatory and immune suppressant (Corticosteroid)",
        "diseases": ["Severe allergic reaction", "Cerebral edema", "ARDS", "Croup", "COVID-19 (severe)"],
    },
    "hydrocortisone": {
        "purpose": "Adrenal hormone replacement and anti-inflammatory (Corticosteroid)",
        "diseases": ["Adrenal insufficiency", "Inflammation", "Allergic reactions", "Skin conditions"],
    },
    "betamethasone": {
        "purpose": "Potent anti-inflammatory corticosteroid (topical and systemic)",
        "diseases": ["Skin inflammation", "Fetal lung maturity", "Severe allergic reaction", "Arthritis"],
    },
    "triamcinolone": {
        "purpose": "Anti-inflammatory corticosteroid (topical, injectable)",
        "diseases": ["Skin conditions", "Joint inflammation", "Allergic rhinitis", "Asthma"],
    },
    # Cholesterol-lowering
    "atorvastatin": {
        "purpose": "Cholesterol lowering and cardiovascular protection (Statin)",
        "diseases": ["High cholesterol", "Cardiovascular disease prevention", "Hyperlipidemia"],
    },
    "rosuvastatin": {
        "purpose": "Cholesterol lowering (Statin)",
        "diseases": ["High cholesterol", "Hyperlipidemia", "Cardiovascular prevention"],
    },
    "simvastatin": {
        "purpose": "Cholesterol lowering (Statin)",
        "diseases": ["High cholesterol", "Cardiovascular disease prevention", "Hyperlipidemia"],
    },
    "pravastatin": {
        "purpose": "Cholesterol lowering (Statin)",
        "diseases": ["High cholesterol", "Hyperlipidemia", "Cardiovascular prevention"],
    },
    "fenofibrate": {
        "purpose": "Triglyceride lowering (Fibrate)",
        "diseases": ["Hypertriglyceridemia", "Mixed dyslipidemia"],
    },
    "ezetimibe": {
        "purpose": "Cholesterol absorption reduction",
        "diseases": ["High cholesterol", "Hyperlipidemia"],
    },
    # Anticoagulants / Antiplatelet
    "warfarin": {
        "purpose": "Blood clot prevention (Anticoagulant)",
        "diseases": ["Deep vein thrombosis", "Pulmonary embolism", "Atrial fibrillation", "Stroke prevention"],
    },
    "heparin": {
        "purpose": "Blood clot prevention and treatment (Anticoagulant, injectable)",
        "diseases": ["DVT", "Pulmonary embolism", "Acute coronary syndrome", "Dialysis anticoagulation"],
    },
    "enoxaparin": {
        "purpose": "Blood clot prevention (Low molecular weight heparin)",
        "diseases": ["DVT", "Pulmonary embolism", "Acute coronary syndrome", "Post-surgical clot prevention"],
    },
    "clopidogrel": {
        "purpose": "Blood clot and stroke prevention (Antiplatelet)",
        "diseases": ["Heart attack prevention", "Stroke prevention", "Peripheral artery disease", "Coronary stent"],
    },
    "dabigatran": {
        "purpose": "Blood clot prevention (Direct thrombin inhibitor, oral)",
        "diseases": ["Atrial fibrillation", "DVT", "Pulmonary embolism"],
    },
    "rivaroxaban": {
        "purpose": "Blood clot prevention (Factor Xa inhibitor, oral)",
        "diseases": ["DVT", "Pulmonary embolism", "Atrial fibrillation", "Stroke prevention"],
    },
    # Antimalaria / Antiparasitic
    "chloroquine": {
        "purpose": "Malaria treatment and prevention (Antimalarial)",
        "diseases": ["Malaria", "Lupus", "Rheumatoid arthritis"],
    },
    "hydroxychloroquine": {
        "purpose": "Antimalarial and immune modulator",
        "diseases": ["Malaria", "Rheumatoid arthritis", "Lupus", "Systemic lupus erythematosus"],
    },
    "artemether": {
        "purpose": "Malaria treatment (Artemisinin derivative)",
        "diseases": ["Malaria", "Plasmodium falciparum infection"],
    },
    "lumefantrine": {
        "purpose": "Malaria treatment (Artemisinin combination therapy)",
        "diseases": ["Malaria", "Uncomplicated falciparum malaria"],
    },
    "quinine": {
        "purpose": "Malaria treatment and leg cramp relief",
        "diseases": ["Malaria", "Severe falciparum malaria", "Nocturnal leg cramps"],
    },
    "ivermectin": {
        "purpose": "Antiparasitic treatment",
        "diseases": ["Strongyloidiasis", "Scabies", "River blindness", "Lymphatic filariasis", "Head lice"],
    },
    "mebendazole": {
        "purpose": "Intestinal worm treatment (Anthelmintic)",
        "diseases": ["Roundworm", "Hookworm", "Whipworm", "Pinworm", "Intestinal parasites"],
    },
    "albendazole": {
        "purpose": "Broad-spectrum antiparasitic (Anthelmintic)",
        "diseases": ["Roundworm", "Hookworm", "Tapeworm", "Hydatid disease", "Neurocysticercosis"],
    },
    "praziquantel": {
        "purpose": "Tapeworm and fluke treatment (Anthelmintic)",
        "diseases": ["Tapeworm infection", "Schistosomiasis", "Neurocysticercosis"],
    },
    # Thyroid
    "levothyroxine": {
        "purpose": "Thyroid hormone replacement",
        "diseases": ["Hypothyroidism", "Thyroid cancer (post-surgery)", "Goiter", "Myxedema"],
    },
    "carbimazole": {
        "purpose": "Hyperthyroidism treatment (Antithyroid)",
        "diseases": ["Hyperthyroidism", "Graves' disease", "Thyrotoxicosis"],
    },
    "propylthiouracil": {
        "purpose": "Hyperthyroidism treatment (Antithyroid)",
        "diseases": ["Hyperthyroidism", "Graves' disease", "Thyroid storm"],
    },
    # Hormones / Reproductive
    "ulipristal acetate": {
        "purpose": "Emergency contraception",
        "diseases": ["Unintended pregnancy prevention"],
    },
    "mifepristone": {
        "purpose": "Medical abortion and emergency contraception",
        "diseases": ["Termination of pregnancy", "Emergency contraception"],
    },
    "misoprostol": {
        "purpose": "Uterine contraction stimulation (Prostaglandin)",
        "diseases": ["Peptic ulcer prevention (with NSAIDs)", "Medical abortion", "Postpartum hemorrhage"],
    },
    "oxytocin": {
        "purpose": "Induction of labor and control of postpartum hemorrhage",
        "diseases": ["Labor induction", "Postpartum hemorrhage"],
    },
    "progesterone": {
        "purpose": "Progestogen supplementation",
        "diseases": ["Hormone replacement therapy", "Recurrent miscarriage", "Infertility", "Amenorrhea"],
    },
    "estradiol": {
        "purpose": "Estrogen replacement therapy",
        "diseases": ["Menopause symptoms", "Osteoporosis prevention", "Hypogonadism"],
    },
    "testosterone": {
        "purpose": "Male hormone replacement therapy",
        "diseases": ["Hypogonadism", "Testosterone deficiency", "Delayed puberty"],
    },
    # Muscle relaxants
    "tolperisone": {
        "purpose": "Muscle relaxant for spasm relief",
        "diseases": ["Muscle spasm", "Spasticity", "Back pain", "Multiple sclerosis (spasticity)"],
    },
    "baclofen": {
        "purpose": "Muscle relaxant and antispastic",
        "diseases": ["Spasticity", "Multiple sclerosis", "Spinal cord injury", "Muscle spasm"],
    },
    "methocarbamol": {
        "purpose": "Muscle relaxant for acute spasm",
        "diseases": ["Muscle spasm", "Back pain", "Musculoskeletal pain"],
    },
    "cyclobenzaprine": {
        "purpose": "Short-term muscle spasm relief",
        "diseases": ["Muscle spasm", "Musculoskeletal pain", "Back pain"],
    },
    # Antivirals
    "acyclovir": {
        "purpose": "Antiviral for herpes infections",
        "diseases": ["Herpes simplex", "Chickenpox", "Shingles", "Cold sores"],
    },
    "valacyclovir": {
        "purpose": "Antiviral for herpes infections (Pro-drug of acyclovir)",
        "diseases": ["Herpes simplex", "Shingles", "Chickenpox", "Cold sores"],
    },
    "oseltamivir": {
        "purpose": "Influenza treatment and prevention",
        "diseases": ["Influenza (flu)", "H1N1", "Bird flu"],
    },
    "tenofovir": {
        "purpose": "HIV and hepatitis B treatment (Antiretroviral)",
        "diseases": ["HIV infection", "Hepatitis B", "HIV pre-exposure prophylaxis (PrEP)"],
    },
    "lamivudine": {
        "purpose": "HIV and hepatitis B treatment (Antiretroviral)",
        "diseases": ["HIV infection", "Hepatitis B"],
    },
    # Eye / ENT
    "timolol": {
        "purpose": "Eye pressure reduction (Beta-blocker, eye drops)",
        "diseases": ["Glaucoma", "Ocular hypertension"],
    },
    "latanoprost": {
        "purpose": "Eye pressure reduction (Prostaglandin analogue, eye drops)",
        "diseases": ["Glaucoma", "Ocular hypertension"],
    },
    "ciprofloxacin eye": {
        "purpose": "Bacterial eye infection treatment (Antibiotic eye drops)",
        "diseases": ["Conjunctivitis", "Corneal ulcer", "Eye infection"],
    },
    "ofloxacin": {
        "purpose": "Antibiotic (Fluoroquinolone) for eye, ear, and systemic infections",
        "diseases": ["Eye infection", "Ear infection", "UTI", "Respiratory infection"],
    },
    # Oncology
    "fluorouracil": {
        "purpose": "Cancer treatment (Antimetabolite chemotherapy)",
        "diseases": ["Colorectal cancer", "Breast cancer", "Skin cancer", "Stomach cancer"],
    },
    "methotrexate": {
        "purpose": "Cancer and autoimmune disease treatment",
        "diseases": ["Leukemia", "Lymphoma", "Rheumatoid arthritis", "Psoriasis", "Ectopic pregnancy"],
    },
    "tamoxifen": {
        "purpose": "Breast cancer treatment and prevention (Anti-estrogen)",
        "diseases": ["Breast cancer", "Breast cancer prevention"],
    },
    # ORS / Electrolytes
    "oral rehydration salts": {
        "purpose": "Rehydration and electrolyte replacement",
        "diseases": ["Diarrhea", "Dehydration", "Cholera", "Gastroenteritis"],
    },
    "sodium chloride": {
        "purpose": "Fluid and electrolyte replacement",
        "diseases": ["Dehydration", "Hyponatremia", "IV fluid maintenance"],
    },
    "potassium chloride": {
        "purpose": "Potassium supplementation",
        "diseases": ["Hypokalemia", "Cardiac arrhythmia prevention"],
    },
    # Gout
    "allopurinol": {
        "purpose": "Uric acid reduction for gout prevention",
        "diseases": ["Gout", "Hyperuricemia", "Kidney stones (uric acid)", "Tumor lysis syndrome"],
    },
    "colchicine": {
        "purpose": "Acute gout attack treatment",
        "diseases": ["Gout", "Familial Mediterranean fever", "Pericarditis"],
    },
    # Dermatology
    "tretinoin": {
        "purpose": "Acne and skin rejuvenation treatment (Retinoid)",
        "diseases": ["Acne", "Wrinkles", "Hyperpigmentation", "Keratosis pilaris"],
    },
    "benzoyl peroxide": {
        "purpose": "Acne treatment (Antibacterial/Keratolytic)",
        "diseases": ["Acne vulgaris", "Pimples", "Skin blemishes"],
    },
    "calamine": {
        "purpose": "Skin itch and irritation relief (Topical)",
        "diseases": ["Itching", "Minor burns", "Insect bites", "Chickenpox rash", "Sunburn"],
    },
    "silver sulfadiazine": {
        "purpose": "Burn wound infection prevention (Topical antibiotic)",
        "diseases": ["Burns", "Wound infection prevention"],
    },
    "mupirocin": {
        "purpose": "Skin bacterial infection treatment (Topical antibiotic)",
        "diseases": ["Impetigo", "Skin infection", "MRSA nasal decolonization"],
    },
}

# Normalize salt qualifiers for matching
_SALT_QUALIFIERS = re.compile(
    r"\b(hydrochloride|hcl|hydrobromide|sodium|potassium|calcium|magnesium|sulfate|sulphate"
    r"|trihydrate|monohydrate|dihydrate|hemihydrate|acetate|citrate|tartrate|maleate"
    r"|fumarate|succinate|chloride|bromide|phosphate|nitrate|gluconate|oxalate"
    r"|stearate|benzoate|propionate|valerate|butyrate)\b",
    re.IGNORECASE,
)
_QUALIFIER_BRACKETS = re.compile(r"\[.*?\]|\(.*?\)")
_COMBINATION_SPLIT = re.compile(r"\s*[+,&/]\s*")


def _normalize_generic(name: str) -> list[str]:
    """Return a list of normalized keyword tokens from a generic drug name."""
    name = _QUALIFIER_BRACKETS.sub(" ", name)
    name = _SALT_QUALIFIERS.sub(" ", name)
    parts = _COMBINATION_SPLIT.split(name)
    tokens = []
    for p in parts:
        token = " ".join(p.lower().split())
        if token and len(token) > 2:
            tokens.append(token)
    return tokens


def _load():
    global _medicines, _brand_index, _generic_index, _loaded
    if _loaded:
        return
    try:
        with open(_CSV_PATH, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            _medicines = list(reader)

        for idx, m in enumerate(_medicines):
            brand = (m.get("brand_name") or "").strip().lower()
            if brand:
                _brand_index.setdefault(brand, []).append(idx)
                # Also index the first word for partial match
                first_word = brand.split()[0] if " " in brand else brand
                if first_word != brand:
                    _brand_index.setdefault(first_word, []).append(idx)

            generic_raw = (m.get("generic_name") or "").strip()
            for token in _normalize_generic(generic_raw):
                _generic_index.setdefault(token, []).append(idx)
                # Also index first word
                first_word = token.split()[0] if " " in token else token
                if first_word != token:
                    _generic_index.setdefault(first_word, []).append(idx)

        _loaded = True
        print(f"[MedicineService] Loaded {len(_medicines)} medicines from CSV.")
    except Exception as e:
        print(f"[MedicineService] Failed to load medicines.csv: {e}")
        _medicines = []
        _loaded = True


def get_purpose_and_diseases(generic_name: str) -> dict:
    """Return purpose and diseases for a generic drug name using GENERIC_PURPOSE_MAP."""
    if not generic_name:
        return {}
    tokens = _normalize_generic(generic_name)
    # Try progressively shorter token combinations
    for token in tokens:
        if token in GENERIC_PURPOSE_MAP:
            return GENERIC_PURPOSE_MAP[token]
        # Try first word only
        first = token.split()[0]
        if first in GENERIC_PURPOSE_MAP:
            return GENERIC_PURPOSE_MAP[first]
        # Fuzzy match against keys
        best_ratio = 0.0
        best_key = None
        for key in GENERIC_PURPOSE_MAP:
            ratio = SequenceMatcher(None, token, key).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_key = key
        if best_ratio >= 0.82 and best_key:
            return GENERIC_PURPOSE_MAP[best_key]
    return {}


def enrich(row: dict) -> dict:
    """Add purpose, diseases, and source fields to a medicine row."""
    result = dict(row)
    info = get_purpose_and_diseases(row.get("generic_name", ""))
    result["purpose"] = info.get("purpose", "")
    result["diseases"] = info.get("diseases", [])
    result["source"] = "medicines.csv"
    return result


def search(query: str, limit: int = 10) -> list[dict]:
    """Search medicines by brand name or generic name. Returns enriched rows."""
    _load()
    if not query.strip():
        return []

    q = query.strip().lower()
    seen: set[int] = set()
    results: list[tuple[float, int]] = []  # (score, index)

    # 1. Exact brand name match
    if q in _brand_index:
        for idx in _brand_index[q]:
            if idx not in seen:
                seen.add(idx)
                results.append((1.0, idx))

    # 2. Exact generic token match
    if q in _generic_index:
        for idx in _generic_index[q]:
            if idx not in seen:
                seen.add(idx)
                results.append((0.95, idx))

    # 3. Substring match on brand_name and generic_name
    if len(results) < limit:
        for idx, m in enumerate(_medicines):
            if idx in seen:
                continue
            brand = (m.get("brand_name") or "").lower()
            generic = (m.get("generic_name") or "").lower()
            if q in brand:
                results.append((0.85, idx))
                seen.add(idx)
            elif q in generic:
                results.append((0.80, idx))
                seen.add(idx)
            if len(results) >= limit * 3:
                break

    # 4. Fuzzy match if still not enough results
    if len(results) < 3 and len(q) >= 4:
        for idx, m in enumerate(_medicines):
            if idx in seen:
                continue
            brand = (m.get("brand_name") or "").lower()
            generic = (m.get("generic_name") or "").lower()
            ratio_b = SequenceMatcher(None, q, brand[:len(q) + 4]).ratio()
            ratio_g = SequenceMatcher(None, q, generic[:len(q) + 4]).ratio()
            best = max(ratio_b, ratio_g)
            if best >= 0.70:
                results.append((best * 0.75, idx))
                seen.add(idx)
            if len(results) >= limit * 2:
                break

    # Sort by score descending, deduplicate
    results.sort(key=lambda x: -x[0])
    top_indices = [idx for _, idx in results[:limit]]
    return [enrich(_medicines[i]) for i in top_indices]


def lookup(name: str) -> dict | None:
    """Return the single best medicine match for a given name, or None."""
    results = search(name, limit=1)
    return results[0] if results else None


def detect_medicines_in_text(text: str, max_results: int = 5) -> list[dict]:
    """
    Find medicine mentions in free text (chat messages, prescription text, etc.).
    Returns a deduplicated list of enriched medicine rows for the top matches.
    """
    _load()
    words = re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", text)
    found: dict[str, dict] = {}  # brand_name → row

    for word in words:
        w = word.lower()
        if w in _brand_index:
            for idx in _brand_index[w][:3]:
                m = _medicines[idx]
                key = m["brand_name"].lower()
                if key not in found:
                    found[key] = enrich(m)
        if w in _generic_index:
            for idx in _generic_index[w][:2]:
                m = _medicines[idx]
                key = m["brand_name"].lower()
                if key not in found:
                    found[key] = enrich(m)
        if len(found) >= max_results:
            break

    # Also try multi-word phrases (2-grams)
    text_words = text.split()
    for i in range(len(text_words) - 1):
        phrase = (text_words[i] + " " + text_words[i + 1]).lower()
        if phrase in _brand_index:
            for idx in _brand_index[phrase][:2]:
                m = _medicines[idx]
                key = m["brand_name"].lower()
                if key not in found:
                    found[key] = enrich(m)

    return list(found.values())[:max_results]


def format_medicine_card(row: dict) -> str:
    """Format an enriched medicine row as a readable markdown block."""
    lines = [
        f"**{row.get('brand_name', 'Unknown')}** ({row.get('strength', '')})",
        f"- **Generic:** {row.get('generic_name', 'N/A')}",
        f"- **Form:** {row.get('dosage_form', 'N/A')}",
        f"- **Manufacturer:** {row.get('manufacturer', 'N/A')}",
    ]
    if row.get("purpose"):
        lines.append(f"- **Purpose:** {row['purpose']}")
    if row.get("diseases"):
        diseases_str = ", ".join(row["diseases"][:6])
        lines.append(f"- **Treats:** {diseases_str}")
    lines.append(f"- **Source:** Verified from medicines.csv database")
    return "\n".join(lines)
