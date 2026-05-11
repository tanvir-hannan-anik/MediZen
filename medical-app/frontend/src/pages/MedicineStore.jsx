import { useState, useEffect } from 'react';
import { medicinesAPI } from '../api/client';

const CATEGORIES = ['Medicines', 'Sanitary', 'Medical Devices', 'Supplements', 'First Aid'];

const MED_SUBCATEGORIES = [
  'All', 'Fever & Pain', 'Cold & Cough', 'Stomach & Digestion',
  'Antibiotics', 'Vitamins & Minerals', 'Skin & Allergy', 'ORS & Electrolytes',
];

const STATIC_MEDICINES = [
  { id: 1,  brand: 'Napa',        generic: 'Paracetamol',          strength: '500 mg',      form: 'Tablet',  mfr: 'Beximco Pharma',  price: 2,   unit: 'per strip (10 tab)', sub: 'Fever & Pain',         badge: 'Popular',  desc: 'Fever, headache & mild pain relief' },
  { id: 2,  brand: 'Ace',         generic: 'Paracetamol',          strength: '500 mg',      form: 'Tablet',  mfr: 'Square Pharma',   price: 2,   unit: 'per strip (10 tab)', sub: 'Fever & Pain',         badge: '',         desc: 'Fever, headache & mild pain relief' },
  { id: 3,  brand: 'Napa Extend', generic: 'Paracetamol',          strength: '665 mg',      form: 'Tablet',  mfr: 'Beximco Pharma',  price: 3,   unit: 'per strip (10 tab)', sub: 'Fever & Pain',         badge: '',         desc: 'Extended-release paracetamol for prolonged relief' },
  { id: 4,  brand: 'Napa Syrup',  generic: 'Paracetamol',          strength: '120 mg/5 ml', form: 'Syrup',   mfr: 'Beximco Pharma',  price: 45,  unit: '60 ml bottle',       sub: 'Fever & Pain',         badge: 'Child',    desc: 'Paracetamol syrup for children' },
  { id: 5,  brand: 'Brufen',      generic: 'Ibuprofen',            strength: '400 mg',      form: 'Tablet',  mfr: 'Abbott BD',       price: 4,   unit: 'per strip (10 tab)', sub: 'Fever & Pain',         badge: '',         desc: 'Anti-inflammatory, fever & pain relief' },
  { id: 6,  brand: 'Voren',       generic: 'Diclofenac Sodium',    strength: '50 mg',       form: 'Tablet',  mfr: 'Renata PLC',      price: 3,   unit: 'per strip (10 tab)', sub: 'Fever & Pain',         badge: '',         desc: 'Pain & inflammation relief' },
  { id: 7,  brand: 'Napro-A',     generic: 'Naproxen',             strength: '250 mg',      form: 'Tablet',  mfr: 'ACI Limited',     price: 5,   unit: 'per strip (10 tab)', sub: 'Fever & Pain',         badge: '',         desc: 'Period pain, muscle & joint pain' },
  { id: 8,  brand: 'Alatrol',     generic: 'Cetirizine HCl',       strength: '10 mg',       form: 'Tablet',  mfr: 'Square Pharma',   price: 3,   unit: 'per strip (10 tab)', sub: 'Cold & Cough',         badge: 'Popular',  desc: 'Allergy, runny nose & sneezing relief' },
  { id: 9,  brand: 'Loratin',     generic: 'Loratadine',           strength: '10 mg',       form: 'Tablet',  mfr: 'Beximco Pharma',  price: 3,   unit: 'per strip (10 tab)', sub: 'Cold & Cough',         badge: '',         desc: 'Non-drowsy antihistamine for allergy' },
  { id: 10, brand: 'A-Cold',      generic: 'Bromhexine HCl',       strength: '4 mg/5 ml',   form: 'Syrup',   mfr: 'ACME Lab',        price: 50,  unit: '100 ml bottle',      sub: 'Cold & Cough',         badge: '',         desc: 'Cough loosener & expectorant syrup' },
  { id: 11, brand: 'Ambrolite S', generic: 'Ambroxol HCl',         strength: '15 mg/5 ml',  form: 'Syrup',   mfr: 'Square Pharma',   price: 55,  unit: '100 ml bottle',      sub: 'Cold & Cough',         badge: '',         desc: 'Clears mucus & soothes chest cough' },
  { id: 12, brand: 'Tossex',      generic: 'Dextromethorphan HBr', strength: '10 mg/5 ml',  form: 'Syrup',   mfr: 'Square Pharma',   price: 60,  unit: '100 ml bottle',      sub: 'Cold & Cough',         badge: '',         desc: 'Dry cough suppressant syrup' },
  { id: 13, brand: 'Sinarest',    generic: 'Paracetamol + Pseudoephedrine', strength: '500+30+2 mg', form: 'Tablet', mfr: 'Centaur Pharma', price: 5, unit: 'per strip (10 tab)', sub: 'Cold & Cough', badge: '', desc: 'Cold, flu & blocked nose relief' },
  { id: 14, brand: 'Seclo',       generic: 'Omeprazole',           strength: '20 mg',       form: 'Capsule', mfr: 'Square Pharma',   price: 5,   unit: 'per strip (10 cap)', sub: 'Stomach & Digestion',  badge: 'Popular',  desc: 'Acidity, heartburn & gastric ulcer' },
  { id: 15, brand: 'Pantop',      generic: 'Pantoprazole',         strength: '40 mg',       form: 'Tablet',  mfr: 'Beximco Pharma',  price: 6,   unit: 'per strip (10 tab)', sub: 'Stomach & Digestion',  badge: '',         desc: 'Severe acidity & GERD treatment' },
  { id: 16, brand: 'Domstal',     generic: 'Domperidone',          strength: '10 mg',       form: 'Tablet',  mfr: 'Square Pharma',   price: 3,   unit: 'per strip (10 tab)', sub: 'Stomach & Digestion',  badge: '',         desc: 'Nausea, vomiting & bloating relief' },
  { id: 17, brand: 'Flagyl',      generic: 'Metronidazole',        strength: '400 mg',      form: 'Tablet',  mfr: 'Sanofi BD',       price: 4,   unit: 'per strip (10 tab)', sub: 'Stomach & Digestion',  badge: '',         desc: 'Stomach infection & diarrhea treatment' },
  { id: 18, brand: 'Lopamide',    generic: 'Loperamide HCl',       strength: '2 mg',        form: 'Capsule', mfr: 'Square Pharma',   price: 3,   unit: 'per strip (10 cap)', sub: 'Stomach & Digestion',  badge: '',         desc: 'Fast-acting diarrhea control' },
  { id: 19, brand: 'Antacid Plus',generic: 'Aluminium + Magnesium Hydroxide', strength: '200+200 mg', form: 'Tablet', mfr: 'ACME Lab', price: 2, unit: 'per strip (10 tab)', sub: 'Stomach & Digestion', badge: '', desc: 'Instant acidity & gas relief' },
  { id: 20, brand: 'Moxacil',     generic: 'Amoxicillin Trihydrate',strength: '500 mg',     form: 'Capsule', mfr: 'Square Pharma',   price: 8,   unit: 'per strip (10 cap)', sub: 'Antibiotics',          badge: 'Rx',       desc: 'Common bacterial infections & throat infection' },
  { id: 21, brand: 'Azithro',     generic: 'Azithromycin',          strength: '500 mg',     form: 'Tablet',  mfr: 'Beximco Pharma',  price: 40,  unit: 'per strip (3 tab)',  sub: 'Antibiotics',          badge: 'Rx',       desc: 'Respiratory & skin bacterial infections' },
  { id: 22, brand: 'Cipro',       generic: 'Ciprofloxacin HCl',     strength: '500 mg',     form: 'Tablet',  mfr: 'Bayer AG',        price: 15,  unit: 'per strip (10 tab)', sub: 'Antibiotics',          badge: 'Rx',       desc: 'UTI, typhoid & gut infections' },
  { id: 23, brand: 'Doxin',       generic: 'Doxycycline HCl',       strength: '100 mg',     form: 'Capsule', mfr: 'Square Pharma',   price: 6,   unit: 'per strip (10 cap)', sub: 'Antibiotics',          badge: 'Rx',       desc: 'Chest & skin bacterial infections' },
  { id: 24, brand: 'C-Vit',       generic: 'Ascorbic Acid (Vitamin C)', strength: '500 mg', form: 'Tablet',  mfr: 'Square Pharma',   price: 3,   unit: 'per strip (10 tab)', sub: 'Vitamins & Minerals',  badge: 'Popular',  desc: 'Immunity booster & antioxidant' },
  { id: 25, brand: '3D',          generic: 'Cholecalciferol (Vitamin D3)', strength: '2000 IU', form: 'Tablet', mfr: 'Jenphar BD',  price: 6,   unit: 'per strip (10 tab)', sub: 'Vitamins & Minerals',  badge: '',         desc: 'Bone health & immune support' },
  { id: 26, brand: 'Zinco',       generic: 'Zinc Sulfate',          strength: '20 mg',      form: 'Tablet',  mfr: 'Beximco Pharma',  price: 4,   unit: 'per strip (10 tab)', sub: 'Vitamins & Minerals',  badge: '',         desc: 'Diarrhea recovery & immune boost' },
  { id: 27, brand: 'Folic Acid',  generic: 'Folic Acid',            strength: '5 mg',       form: 'Tablet',  mfr: 'ACI Limited',     price: 2,   unit: 'per strip (10 tab)', sub: 'Vitamins & Minerals',  badge: 'Women',    desc: 'Essential for pregnancy & anemia' },
  { id: 28, brand: 'Ferrous-B',   generic: 'Ferrous Sulfate + Folic Acid', strength: '200+0.4 mg', form: 'Tablet', mfr: 'ACME Lab',  price: 3,  unit: 'per strip (10 tab)', sub: 'Vitamins & Minerals',  badge: 'Women',    desc: 'Iron supplement for anemia & pregnancy' },
  { id: 29, brand: 'A-Cal D',     generic: 'Calcium Carbonate + Vitamin D3', strength: '500+200 IU', form: 'Tablet', mfr: 'ACME Lab', price: 4, unit: 'per strip (10 tab)', sub: 'Vitamins & Minerals',  badge: '',         desc: 'Bone strength & calcium supplement' },
  { id: 30, brand: 'Neurobion',   generic: 'Vitamin B1 + B6 + B12',strength: '100+200+200 mcg', form: 'Tablet', mfr: 'Sanofi BD',  price: 5,   unit: 'per strip (10 tab)', sub: 'Vitamins & Minerals',  badge: '',         desc: 'Nerve health & B-complex supplement' },
  { id: 31, brand: 'Hycort',      generic: 'Hydrocortisone',        strength: '1%',          form: 'Cream',   mfr: 'Square Pharma',   price: 60,  unit: '10 g tube',          sub: 'Skin & Allergy',       badge: '',         desc: 'Itch, rash & mild skin inflammation' },
  { id: 32, brand: 'Flugal',      generic: 'Fluconazole',           strength: '150 mg',      form: 'Capsule', mfr: 'Square Pharma',   price: 30,  unit: '1 capsule',          sub: 'Skin & Allergy',       badge: '',         desc: 'Fungal infection (single-dose)' },
  { id: 33, brand: 'Canesten',    generic: 'Clotrimazole',          strength: '1%',          form: 'Cream',   mfr: 'Bayer AG',        price: 80,  unit: '20 g tube',          sub: 'Skin & Allergy',       badge: 'Popular',  desc: "Ringworm, athlete's foot & fungal skin infection" },
  { id: 34, brand: 'Saline (ORS)',generic: 'Oral Rehydration Salts', strength: 'WHO formula', form: 'Powder',  mfr: 'Beximco Pharma',  price: 12,  unit: '1 sachet (1L)',      sub: 'ORS & Electrolytes',   badge: 'Essential',desc: 'Diarrhea & dehydration recovery' },
  { id: 35, brand: 'Electral',    generic: 'ORS + Zinc',            strength: 'WHO formula',  form: 'Powder',  mfr: 'Franco-Indian',   price: 15,  unit: '1 sachet',           sub: 'ORS & Electrolytes',   badge: '',         desc: 'Electrolyte replenishment with zinc' },
];

const STATIC_PRODUCTS = [
  { id: 101, name: 'Regular Sanitary Pad',  brand: 'Stayfree',    category: 'Sanitary',        price: 120,  unit: '8 pads',     icon: 'favorite',           desc: 'Soft cotton surface, 6–8h protection', badge: 'Popular' },
  { id: 102, name: 'Night Wing Pad',        brand: 'Whisper',     category: 'Sanitary',        price: 150,  unit: '6 pads',     icon: 'favorite',           desc: 'Extra-long overnight protection', badge: '' },
  { id: 103, name: 'Ultra Thin Panty Liner',brand: 'Always',      category: 'Sanitary',        price: 90,   unit: '20 liners',  icon: 'favorite',           desc: 'Discreet daily freshness liner', badge: '' },
  { id: 104, name: 'Maxi Thick Pad',        brand: 'Stayfree',    category: 'Sanitary',        price: 130,  unit: '8 pads',     icon: 'favorite',           desc: 'Heavy flow days maximum protection', badge: '' },
  { id: 105, name: 'Menstrual Cup',         brand: 'Sirona',      category: 'Sanitary',        price: 650,  unit: '1 cup',      icon: 'favorite',           desc: 'Reusable eco-friendly period cup', badge: 'Eco' },
  { id: 106, name: 'Heating Pad (Period)',  brand: 'Generic',     category: 'Sanitary',        price: 250,  unit: '5 patches',  icon: 'favorite',           desc: 'Stick-on warmth for cramp relief', badge: '' },
  { id: 201, name: 'Digital Thermometer',   brand: 'Omron',       category: 'Medical Devices', price: 350,  unit: '1 piece',    icon: 'device_thermostat',  desc: 'Fast 10-second accurate reading', badge: 'Must Have' },
  { id: 202, name: 'Blood Pressure Monitor',brand: 'Omron',       category: 'Medical Devices', price: 2800, unit: '1 set',      icon: 'monitor_heart',      desc: 'Automatic upper arm BP machine', badge: 'Top Rated' },
  { id: 203, name: 'Glucometer Kit',        brand: 'Accu-Chek',   category: 'Medical Devices', price: 1500, unit: '1 kit',      icon: 'biotech',            desc: 'Blood glucose monitoring system', badge: '' },
  { id: 204, name: 'Pulse Oximeter',        brand: 'Dr. Morepen', category: 'Medical Devices', price: 900,  unit: '1 piece',    icon: 'pulmonology',        desc: 'Finger-clip SpO2 & heart rate', badge: 'Popular' },
  { id: 205, name: 'Nebulizer Machine',     brand: 'Philips',     category: 'Medical Devices', price: 3200, unit: '1 machine',  icon: 'air',                desc: 'Respiratory therapy at home', badge: '' },
  { id: 206, name: 'Weighing Scale',        brand: 'Dr. Morepen', category: 'Medical Devices', price: 1200, unit: '1 scale',    icon: 'scale',              desc: 'Digital BMI body weight scale', badge: '' },
  { id: 301, name: 'Vitamin D3 2000IU',     brand: 'HealthVit',   category: 'Supplements',     price: 280,  unit: '60 capsules',icon: 'eco',                desc: 'Bone health & immune support', badge: 'Popular' },
  { id: 302, name: 'Vitamin C 500mg',       brand: 'Square',      category: 'Supplements',     price: 150,  unit: '30 tablets', icon: 'eco',                desc: 'Antioxidant & immunity booster', badge: '' },
  { id: 303, name: 'Omega-3 Fish Oil',      brand: 'Now Foods',   category: 'Supplements',     price: 480,  unit: '60 softgels',icon: 'water_drop',         desc: 'Heart & brain health EPA/DHA', badge: '' },
  { id: 304, name: 'Calcium + Magnesium',   brand: 'Beximco',     category: 'Supplements',     price: 220,  unit: '30 tablets', icon: 'eco',                desc: 'Bone strength & muscle function', badge: '' },
  { id: 305, name: 'Iron + Folic Acid',     brand: 'ACI',         category: 'Supplements',     price: 180,  unit: '30 tablets', icon: 'eco',                desc: 'Anemia prevention for women', badge: 'Women' },
  { id: 306, name: 'Multivitamin Daily',    brand: 'Centrum',     category: 'Supplements',     price: 550,  unit: '30 tablets', icon: 'eco',                desc: 'Complete daily vitamin & mineral', badge: '' },
  { id: 401, name: 'Sterile Bandage Roll',  brand: 'Generic',     category: 'First Aid',       price: 45,   unit: '5 rolls',    icon: 'health_and_safety',  desc: '7cm × 5m elastic bandage', badge: '' },
  { id: 402, name: 'Antiseptic Solution',   brand: 'Dettol',      category: 'First Aid',       price: 110,  unit: '100ml',      icon: 'sanitizer',          desc: 'Wound disinfection liquid', badge: 'Essential' },
  { id: 403, name: 'Adhesive Plasters',     brand: 'Band-Aid',    category: 'First Aid',       price: 80,   unit: '20 strips',  icon: 'health_and_safety',  desc: 'Fabric strips for small wounds', badge: 'Popular' },
  { id: 404, name: 'Gauze Pads Sterile',    brand: 'Generic',     category: 'First Aid',       price: 60,   unit: '10 pads',    icon: 'health_and_safety',  desc: '10cm × 10cm sterile wound dressings', badge: '' },
  { id: 405, name: 'Medical Surgical Tape', brand: '3M',          category: 'First Aid',       price: 70,   unit: '1 roll',     icon: 'health_and_safety',  desc: 'Skin-friendly micropore tape', badge: '' },
  { id: 406, name: 'First Aid Kit Box',     brand: 'Generic',     category: 'First Aid',       price: 850,  unit: '1 kit',      icon: 'medical_services',   desc: 'Complete 30-piece emergency kit', badge: 'Bundle' },
];

const FORM_ICON = {
  Tablet:    { icon: 'pill',              color: 'rgba(0,87,205,0.18)' },
  Capsule:   { icon: 'medication',        color: 'rgba(191,200,208,0.55)' },
  Syrup:     { icon: 'vaccines',          color: 'rgba(166,59,0,0.18)' },
  Cream:     { icon: 'medication_liquid', color: 'rgba(191,200,208,0.55)' },
  Powder:    { icon: 'science',           color: 'rgba(0,87,205,0.18)' },
  Injection: { icon: 'syringe',           color: 'rgba(0,87,205,0.18)' },
};

function getMsIcon(form) {
  if (!form) return FORM_ICON.Tablet;
  for (const [k, v] of Object.entries(FORM_ICON)) {
    if (form.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return FORM_ICON.Tablet;
}

function MedicineDetailModal({ brandName, onClose }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    medicinesAPI.lookup(brandName)
      .then(res => {
        const data = res.data;
        if (data.found && data.results?.length > 0) {
          const exact = data.results.find(r =>
            r.brand_name?.toLowerCase() === brandName.toLowerCase()
          ) || data.results[0];
          setInfo(exact);
        } else setInfo(null);
      })
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [brandName]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>verified</span>
                Verified
              </span>
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(0,87,205,0.08)', border: '1px solid rgba(0,87,205,0.2)', color: '#0057cd' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>database</span>
                medicines.csv
              </span>
            </div>
            <div className="text-xl font-extrabold text-on-surface">{brandName}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-low text-outline hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-blue-600)', borderRadius: '50%', animation: 'store-spin 0.7s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--fg-4)', margin: 0 }}>Looking up in medicines database&hellip;</p>
          </div>
        ) : info ? (
          <div className="flex flex-col gap-3">
            <div className="bg-surface-container-low rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ['Generic Name', info.generic_name],
                ['Strength', info.strength],
                ['Dosage Form', info.dosage_form],
                ['Manufacturer', info.manufacturer],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] font-bold text-outline uppercase tracking-wide mb-0.5">{label}</div>
                  <div className="font-semibold text-on-surface">{value || '—'}</div>
                </div>
              ))}
            </div>
            {info.purpose && (
              <div className="bg-blue-50 rounded-xl p-3 border-l-4 border-primary">
                <div className="text-[11px] font-bold text-primary uppercase tracking-wide mb-1">Purpose / What it treats</div>
                <div className="text-sm font-semibold text-blue-900 leading-relaxed">{info.purpose}</div>
              </div>
            )}
            {info.diseases?.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-outline uppercase tracking-wide mb-2">Related Conditions</div>
                <div className="flex flex-wrap gap-1.5">
                  {info.diseases.map((d, i) => (
                    <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30">{d}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-outline pt-1 border-t border-outline-variant/30">
              Source: medicines.csv · Always consult a licensed pharmacist before use.
            </p>
          </div>
        ) : (
          <p className="text-sm text-outline py-2">
            <strong>{brandName}</strong> was not found in our database. Please consult a pharmacist.
          </p>
        )}
      </div>
    </div>
  );
}

function DatabaseSearchResults({ query }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedForDetail, setSelectedForDetail] = useState(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    setLoading(true);
    medicinesAPI.lookup(query)
      .then(res => setResults(res.data.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query]);

  if (!query || query.length < 2) return null;
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '28px 0' }}>
      <div style={{ width: 20, height: 20, border: '2.5px solid #d1d5db', borderTopColor: '#0057cd', borderRadius: '50%', animation: 'store-spin 0.7s linear infinite', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#6b7280' }}>Searching medicines database&hellip;</span>
    </div>
  );
  if (!results.length) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(5,150,105,0.10)', border: '1px solid rgba(5,150,105,0.25)', color: '#059669' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>verified</span>
          medicines.csv
        </span>
        <span className="text-sm text-outline">{results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;</span>
      </div>
      <div className="flex flex-col gap-3">
        {results.map((r, i) => (
          <div key={i} className="bg-white border border-outline-variant/30 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-base font-bold text-on-surface">{r.brand_name}</span>
                {r.strength && <span className="text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-full">{r.strength}</span>}
                {r.dosage_form && <span className="text-xs text-outline">{r.dosage_form}</span>}
              </div>
              <p className="text-xs text-on-surface-variant mb-1">
                <span className="font-semibold">{r.generic_name}</span>
                {r.manufacturer && <span> · {r.manufacturer}</span>}
              </p>
              {r.purpose && (
                <p className="text-xs font-semibold text-primary bg-primary/5 px-2.5 py-1 rounded-lg inline-block mb-1">{r.purpose}</p>
              )}
              {r.diseases?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.diseases.slice(0, 4).map((d, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/20">{d}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedForDetail(r.brand_name)}
              className="flex-shrink-0 px-3 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              Details
            </button>
          </div>
        ))}
      </div>
      {selectedForDetail && (
        <MedicineDetailModal brandName={selectedForDetail} onClose={() => setSelectedForDetail(null)} />
      )}
    </div>
  );
}

const BADGE_CFG = {
  Popular:  { cls: 'bg-white/90 text-outline',     label: 'OTC',      border: '1px solid rgba(114,119,135,0.3)' },
  Child:    { cls: 'bg-[#a63b00] text-white',       label: 'CHILD',    border: 'none' },
  Rx:       { cls: 'bg-red-100 text-red-700',       label: 'Rx',       border: '1px solid rgba(220,38,38,0.2)' },
  Women:    { cls: 'bg-pink-100 text-pink-700',     label: 'WOMEN',    border: 'none' },
  Essential:{ cls: 'bg-amber-100 text-amber-700',   label: 'ESSENTIAL',border: 'none' },
};

function MedicineCard({ med, qty, onAdd, onRemove, onDetails }) {
  const iconInfo = getMsIcon(med.form);
  const isLiquid = med.form === 'Syrup' || med.form === 'Cream' || med.form === 'Powder';
  const badge = BADGE_CFG[med.badge];

  return (
    <div className="bg-white rounded-xl shadow-sm product-card-hover flex flex-col group relative" style={{ border: '1px solid rgba(194,198,216,0.4)' }}>
      {/* Icon strip */}
      <div className={`relative rounded-t-xl flex items-center justify-center overflow-hidden ${isLiquid ? 'bg-gradient-to-br from-[#fff3ef] to-[#ecedf9]' : 'bg-gradient-to-br from-[#eff6ff] to-[#ecedf9]'}`} style={{ height: '86px' }}>
        <span
          className="material-symbols-outlined group-hover:scale-110 transition-transform duration-500"
          style={{ fontVariationSettings: "'FILL' 1", color: iconInfo.color, fontSize: '46px' }}
        >
          {iconInfo.icon}
        </span>
        {badge && (
          <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight backdrop-blur-sm ${badge.cls}`} style={{ border: badge.border }}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow px-3 pt-2 pb-2">
        <p className="text-[9px] font-bold text-secondary uppercase tracking-wider opacity-60 mb-0.5 truncate">{med.mfr}</p>
        <h4 className="text-[15px] font-bold text-on-surface group-hover:text-primary transition-colors leading-tight truncate">{med.brand}</h4>
        <p className="text-[10px] font-semibold text-primary mt-0.5 truncate" style={{ backgroundColor: 'rgba(0,87,205,0.06)', borderRadius: '99px', padding: '1px 6px', display: 'inline-block', width: 'fit-content' }}>
          {med.strength} · {med.form}
        </p>
        <p className="text-[11px] text-on-surface-variant mt-1 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{med.desc}</p>

        <div className="mt-auto pt-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(194,198,216,0.3)' }}>
          <div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[17px] font-extrabold text-primary leading-none">৳{med.price}</span>
              <button
                onClick={onDetails}
                className="flex items-center gap-0.5 mt-0.5 transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'rgba(5,150,105,0.10)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '99px', padding: '2px 7px', width: 'fit-content' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '10px', color: '#059669', fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-[9px] font-bold" style={{ color: '#059669', letterSpacing: '0.02em' }}>Verified Info</span>
              </button>
            </div>
          </div>
          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 bg-primary text-white px-2.5 py-1.5 rounded-lg text-[12px] font-bold hover:bg-primary-container transition-all shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Add
            </button>
          ) : (
            <div className="flex items-center gap-0.5 rounded-lg px-1.5 py-1" style={{ backgroundColor: 'rgba(0,87,205,0.09)', border: '1px solid rgba(0,87,205,0.2)' }}>
              <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center text-primary font-bold text-base rounded" style={{ background: 'none' }}>−</button>
              <span className="font-bold text-primary min-w-[1.25rem] text-center text-[13px]">{qty}</span>
              <button onClick={onAdd} className="w-6 h-6 flex items-center justify-center text-primary font-bold text-base rounded" style={{ background: 'none' }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CAT_ICON_CFG = {
  Sanitary:         { icon: 'favorite',         bg: 'from-pink-50',   color: 'rgba(244,114,182,0.45)' },
  'Medical Devices':{ icon: 'biotech',          bg: 'from-green-50',  color: 'rgba(22,163,74,0.28)' },
  Supplements:      { icon: 'eco',              bg: 'from-green-50',  color: 'rgba(34,197,94,0.28)' },
  'First Aid':      { icon: 'health_and_safety',bg: 'from-orange-50', color: 'rgba(249,115,22,0.28)' },
};

const CAT_TAB_CFG = {
  Medicines:        { icon: 'medication',        activeColor: '#0057cd', activeBg: 'rgba(0,87,205,0.12)',  dot: '#0057cd' },
  Sanitary:         { icon: 'favorite',          activeColor: '#db2777', activeBg: 'rgba(219,39,119,0.11)', dot: '#db2777' },
  'Medical Devices':{ icon: 'biotech',           activeColor: '#16a34a', activeBg: 'rgba(22,163,74,0.11)',  dot: '#16a34a' },
  Supplements:      { icon: 'eco',               activeColor: '#059669', activeBg: 'rgba(5,150,105,0.11)',  dot: '#059669' },
  'First Aid':      { icon: 'health_and_safety', activeColor: '#ea580c', activeBg: 'rgba(234,88,12,0.11)',  dot: '#ea580c' },
};

const SUB_TAB_CFG = {
  'All':                 { color: '#0057cd', bg: 'rgba(0,87,205,0.13)' },
  'Fever & Pain':        { color: '#dc2626', bg: 'rgba(220,38,38,0.11)' },
  'Cold & Cough':        { color: '#0284c7', bg: 'rgba(2,132,199,0.11)' },
  'Stomach & Digestion': { color: '#ca8a04', bg: 'rgba(202,138,4,0.11)' },
  'Antibiotics':         { color: '#7c3aed', bg: 'rgba(124,58,237,0.11)' },
  'Vitamins & Minerals': { color: '#059669', bg: 'rgba(5,150,105,0.11)' },
  'Skin & Allergy':      { color: '#db2777', bg: 'rgba(219,39,119,0.11)' },
  'ORS & Electrolytes':  { color: '#0891b2', bg: 'rgba(8,145,178,0.11)' },
};

function ProductCard({ product, qty, onAdd, onRemove }) {
  const cfg = CAT_ICON_CFG[product.category] || { icon: 'medical_services', bg: 'from-blue-50', color: 'rgba(0,87,205,0.18)' };

  return (
    <div className="bg-white rounded-xl shadow-sm product-card-hover flex flex-col group relative" style={{ border: '1px solid rgba(194,198,216,0.4)' }}>
      {/* Icon strip */}
      <div className={`relative rounded-t-xl flex items-center justify-center overflow-hidden bg-gradient-to-br ${cfg.bg} to-[#ecedf9]`} style={{ height: '86px' }}>
        <span
          className="material-symbols-outlined group-hover:scale-110 transition-transform duration-500"
          style={{ fontVariationSettings: "'FILL' 1", color: cfg.color, fontSize: '46px' }}
        >
          {product.icon || cfg.icon}
        </span>
        {product.badge && (
          <span className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[9px] font-bold text-outline uppercase tracking-tight" style={{ border: '1px solid rgba(114,119,135,0.3)' }}>
            {product.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-grow px-3 pt-2 pb-2">
        <p className="text-[9px] font-bold text-secondary uppercase tracking-wider opacity-60 mb-0.5 truncate">{product.brand}</p>
        <h4 className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</h4>
        <p className="text-[11px] text-on-surface-variant mt-1 leading-tight flex-grow" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.desc}</p>
        <p className="text-[10px] text-outline mt-1 truncate">{product.unit}</p>

        <div className="mt-auto pt-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(194,198,216,0.3)' }}>
          <span className="text-[17px] font-extrabold text-primary leading-none">৳{product.price}</span>
          {qty === 0 ? (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 bg-primary text-white px-2.5 py-1.5 rounded-lg text-[12px] font-bold hover:bg-primary-container transition-all shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Add
            </button>
          ) : (
            <div className="flex items-center gap-0.5 rounded-lg px-1.5 py-1" style={{ backgroundColor: 'rgba(0,87,205,0.09)', border: '1px solid rgba(0,87,205,0.2)' }}>
              <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center text-primary font-bold text-base rounded" style={{ background: 'none' }}>−</button>
              <span className="font-bold text-primary min-w-[1.25rem] text-center text-[13px]">{qty}</span>
              <button onClick={onAdd} className="w-6 h-6 flex items-center justify-center text-primary font-bold text-base rounded" style={{ background: 'none' }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MedicineStore() {
  const [activeCategory, setActiveCategory] = useState('Medicines');
  const [activeSub, setActiveSub] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [detailFor, setDetailFor] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = (key) => setCart(c => ({ ...c, [key]: (c[key] || 0) + 1 }));
  const removeFromCart = (key) => setCart(c => {
    const n = { ...c };
    if (n[key] > 1) n[key]--; else delete n[key];
    return n;
  });

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const filteredMeds = STATIC_MEDICINES.filter(m => {
    const matchSub = activeSub === 'All' || m.sub === activeSub;
    const q = search.toLowerCase();
    const matchSearch = !q || m.brand.toLowerCase().includes(q) || m.generic.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
    return matchSub && matchSearch;
  });

  const staticFiltered = STATIC_PRODUCTS.filter(p => {
    if (p.category !== activeCategory) return false;
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase());
  });

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setSearch('');
    setActiveSub('All');
  };

  const showDatabaseSearch = activeCategory === 'Medicines' && search.length >= 2 && filteredMeds.length === 0;

  const heroSubPills = ['All', 'Fever & Pain', 'Cold & Cough', 'Stomach & Digestion', 'Antibiotics', 'Vitamins & Minerals', 'Skin & Allergy', 'ORS & Electrolytes'];

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="bg-surface text-on-surface">

      {/* ── Hero / Header ───────────────────────────────────────── */}
      <div className="hero-integrated-bg pb-xl">

        {/* Top bar */}
        <header className="w-full">
          <div className="max-w-[1440px] mx-auto px-lg py-3 flex justify-between items-center gap-md">

            {/* Left: brand + breadcrumb */}
            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-1 text-[10px] tracking-widest text-white/50 uppercase font-bold mb-0.5">
                <span>Home</span>
                <span className="material-symbols-outlined opacity-40" style={{ fontSize: '11px' }}>chevron_right</span>
                <span className="text-white/80">Store</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight leading-none italic uppercase">Medicine Store</h2>
            </div>

            {/* Center: pill tab nav */}
            <div className="hidden lg:flex flex-1 justify-center">
              <div className="flex items-center gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }}>
                {CATEGORIES.map(cat => {
                  const cfg = CAT_TAB_CFG[cat];
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap"
                      style={isActive
                        ? { background: 'rgba(255,255,255,0.97)', color: cfg.activeColor, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', border: `1.5px solid ${cfg.activeColor}22` }
                        : { color: 'rgba(255,255,255,0.82)', background: 'transparent', border: '1px solid transparent' }
                      }
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1", color: isActive ? cfg.activeColor : 'rgba(255,255,255,0.7)' }}
                      >
                        {cfg.icon}
                      </span>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: cart + notif */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Notification button */}
              <button
                className="relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <span className="material-symbols-outlined text-white" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>notifications</span>
                {/* Animated pulse dot */}
                <span className="absolute top-2 right-2 flex items-center justify-center">
                  <span className="absolute inline-flex w-2.5 h-2.5 rounded-full bg-red-400 opacity-60 animate-ping" />
                  <span className="relative w-2 h-2 rounded-full bg-red-500" style={{ border: '1.5px solid rgba(255,255,255,0.7)', boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
                </span>
              </button>

              {/* Cart button */}
              <button
                onClick={() => totalItems > 0 && showToast(`${totalItems} item${totalItems > 1 ? 's' : ''} in cart. Pharmacy ordering coming soon!`)}
                className="relative flex items-center gap-2 px-3 h-10 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={totalItems > 0
                  ? { background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }
                  : { background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }
                }
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1", color: totalItems > 0 ? '#0057cd' : 'white' }}
                >
                  shopping_cart
                </span>
                {totalItems > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-extrabold text-primary leading-none">{totalItems}</span>
                    <span className="text-[10px] font-semibold leading-none" style={{ color: '#5c5f72' }}>item{totalItems > 1 ? 's' : ''}</span>
                    <span className="w-px h-3 bg-outline-variant/40 mx-0.5" />
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '13px' }}>chevron_right</span>
                  </div>
                ) : (
                  <span className="text-[12px] font-bold text-white/90">Cart</span>
                )}
              </button>

            </div>

          </div>
        </header>

        {/* Hero content: offer + search */}
        <div className="max-w-[1400px] mx-auto px-lg mt-xl">
          <div className="flex flex-col gap-lg w-full">

            {/* Offer card */}
            <div className="bg-white/10 backdrop-blur-xl p-lg rounded-2xl border border-white/20 shadow-2xl">
              <span className="bg-[#a63b00] text-white px-md py-1 rounded-full text-[10px] font-bold w-fit mb-md uppercase tracking-widest inline-block shadow-sm">
                Special Offer
              </span>
              <h3 className="text-4xl font-extrabold text-white leading-tight drop-shadow-md mb-md">
                Get 20% Off on First Aid Kits &amp; Supplements
              </h3>
              <p className="text-base text-blue-50 opacity-90">
                Valid until the end of this month. Use code:{' '}
                <span className="font-bold border-b-2 border-white/40 pb-0.5">MEDI20</span>
              </p>
            </div>

            {/* Search box */}
            <div className="bg-white p-2 rounded-2xl shadow-xl space-y-sm">
              <div className="relative w-full">
                <span className="absolute left-md top-1/2 -translate-y-1/2 material-symbols-outlined text-outline" style={{ fontSize: '22px' }}>search</span>
                <input
                  className="w-full pl-[48px] pr-md py-3 rounded-xl text-sm transition-all text-on-surface outline-none"
                  style={{ backgroundColor: 'rgba(242,243,255,0.6)', border: 'none', boxShadow: 'none' }}
                  placeholder="Search by name or condition..."
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Sub-category pills in hero */}
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar px-sm pb-1">
                {heroSubPills.map(sub => {
                  const isActive = activeCategory === 'Medicines' && activeSub === sub;
                  const cfg = SUB_TAB_CFG[sub] || { color: '#0057cd', bg: 'rgba(0,87,205,0.13)' };
                  return (
                    <button
                      key={sub}
                      onClick={() => { setActiveCategory('Medicines'); setActiveSub(sub); }}
                      className="px-3 py-1.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-all"
                      style={isActive
                        ? { background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}44`, boxShadow: `0 2px 8px ${cfg.color}22` }
                        : { background: 'rgba(230,231,243,0.5)', color: '#5c5f72', border: '1px solid rgba(194,198,216,0.35)' }
                      }
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────── */}
      <div className="p-lg max-w-[1400px] mx-auto -mt-8 relative z-10 space-y-lg">

        {/* Result count */}
        {!showDatabaseSearch && (
          <p className="text-sm text-on-surface-variant">
            {activeCategory === 'Medicines'
              ? `${filteredMeds.length} essential medicines${activeSub !== 'All' ? ` · ${activeSub}` : ''}${search ? ` matching "${search}"` : ''}`
              : `${staticFiltered.length} products in ${activeCategory}`}
          </p>
        )}

        {/* Medicines grid */}
        {activeCategory === 'Medicines' && !showDatabaseSearch && (
          filteredMeds.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-outline mb-4 block" style={{ fontSize: '64px' }}>search_off</span>
              <p className="text-lg font-semibold mb-2">No medicines found</p>
              <p className="text-sm">Try a different search or category</p>
            </div>
          ) : (
            <div className="bento-grid">
              {filteredMeds.map(med => (
                <MedicineCard
                  key={med.id}
                  med={med}
                  qty={cart[`m-${med.id}`] || 0}
                  onAdd={() => addToCart(`m-${med.id}`)}
                  onRemove={() => removeFromCart(`m-${med.id}`)}
                  onDetails={() => setDetailFor(med.brand)}
                />
              ))}
            </div>
          )
        )}

        {/* Full database search */}
        {showDatabaseSearch && <DatabaseSearchResults query={search} />}

        {/* Other category products grid */}
        {activeCategory !== 'Medicines' && (
          staticFiltered.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-outline mb-4 block" style={{ fontSize: '64px' }}>search_off</span>
              <p className="text-lg font-semibold mb-2">No products found</p>
              <p className="text-sm">Try a different search</p>
            </div>
          ) : (
            <div className="bento-grid">
              {staticFiltered.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  qty={cart[`p-${product.id}`] || 0}
                  onAdd={() => addToCart(`p-${product.id}`)}
                  onRemove={() => removeFromCart(`p-${product.id}`)}
                />
              ))}
            </div>
          )
        )}

        {/* Bottom spacer for FAB */}
        <div className="h-24" />
      </div>

      {/* ── Floating Action Button ───────────────────────────────── */}
      <div className="fixed bottom-lg right-lg z-50">
        <button
          onClick={() => totalItems > 0 && showToast(`${totalItems} item${totalItems > 1 ? 's' : ''} in cart. Pharmacy ordering coming soon!`)}
          className="bg-primary text-white w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20 relative"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px' }}>
            shopping_basket
          </span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 w-7 h-7 bg-[#a63b00] text-white text-sm font-bold flex items-center justify-center rounded-full border-2 border-white shadow-lg">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Medicine detail modal */}
      {detailFor && (
        <MedicineDetailModal brandName={detailFor} onClose={() => setDetailFor(null)} />
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1c1b1f', color: '#fff', borderRadius: 12,
          padding: '12px 20px', fontSize: 13.5, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'store-toast-in 0.25s ease-out',
          whiteSpace: 'nowrap',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#34d399', fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes store-spin { to { transform: rotate(360deg); } }
        @keyframes store-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
