import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import PaperPlaneLoader from '../components/PaperPlaneLoader';
import { chatAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const COMMON_CONDITIONS = ['Hypertension', 'Asthma', 'Diabetes Mellitus', 'Migraine', 'Arthritis'];

const MOCK_INSIGHT = {
  name: 'Iron-deficiency anemia',
  overview: "Your red blood cells aren't carrying enough oxygen because your body is low on iron. It's the most common type of anemia — easy to diagnose and, in most cases, straightforward to treat with diet or supplements.",
  risk_level: 'Moderate',
  risk_percent: 55,
  prevalence: '~25% adults',
  onset: 'Gradual',
  treatable: 'Yes · outpatient',
  symptoms_common: ['Constant tiredness or low energy', 'Pale skin, lips, or gums', 'Shortness of breath on light activity', 'Dizziness or lightheadedness', 'Cold hands and feet', 'Headaches, especially on standing'],
  symptoms_rare: ['Brittle nails or hair thinning', 'Cravings for ice or clay (pica)', 'Restless legs at night', 'Sore or swollen tongue'],
  steps: [
    { label: 'Book a GP consultation', detail: "Bring your CBC report and symptoms log. They'll order an iron panel to confirm.", eta: 'Within 7 days', color: 'blue' },
    { label: 'Start iron-rich foods', detail: 'Red meat, lentils, spinach, liver, fortified cereals. Pair with vitamin C; avoid tea/coffee at meals.', eta: 'Start today', color: 'mint' },
    { label: 'Log daily symptoms', detail: 'Fatigue level (1–5), dizziness episodes, and diet. Makes the GP visit faster.', eta: 'Daily · 1 min', color: 'warn' },
    { label: 'Seek urgent care if…', detail: 'Chest pain, fainting, heart racing at rest, black/bloody stools, or severe shortness of breath.', eta: 'Red flags', color: 'red' },
  ],
  red_flags: ['Chest pain or pressure', 'Fainting or near-fainting', 'Heart racing at rest', 'Black or bloody stools', 'Severe shortness of breath'],
};

const STEP_COLORS = {
  blue: { bg: '#eff6ff', num: '#1d4ed8' },
  mint: { bg: '#ecfdf5', num: '#047857' },
  warn: { bg: '#fffbeb', num: '#b45309' },
  red:  { bg: '#fff1f2', num: '#be123c' },
};

function InsightView({ insight, onBack }) {
  const risk = insight.risk_percent || 55;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="group mb-6 inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-white border border-slate-200 text-teal-700 hover:text-white hover:bg-teal-600 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 active:scale-95 transition-all text-sm font-bold"
        style={{ fontFamily: 'Manrope, sans-serif', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
      >
        <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform" style={{ fontSize: 18 }}>arrow_back</span>
        Back to search
      </button>

      {/* Overview */}
      <div className="bg-white rounded-2xl border border-slate-100 p-8 mb-6"
           style={{ boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.05)' }}>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 rounded-full mb-4">
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <span className="text-xs font-bold uppercase tracking-widest">Condition Overview</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>{insight.name}</h2>
            <p className="text-slate-500 mb-6 leading-relaxed">{insight.overview}</p>
            <div className="grid grid-cols-3 gap-3">
              {[['Prevalence', insight.prevalence], ['Typical onset', insight.onset], ['Treatable', insight.treatable]].map(([k, v]) => (
                <div key={k} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{k}</div>
                  <div className="text-sm font-semibold text-slate-700">{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div
              className="w-28 h-28 rounded-full relative flex items-center justify-center"
              style={{ background: `conic-gradient(#0d9488 0 ${risk}%, #e2e8f0 0)` }}
            >
              <div className="absolute inset-3 rounded-full bg-white shadow-sm flex flex-col items-center justify-center">
                <div className="text-sm font-extrabold text-teal-600" style={{ fontFamily: 'Manrope, sans-serif' }}>{insight.risk_level}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Risk</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">{risk}% risk index</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Symptoms */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6"
               style={{ boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.05)' }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Symptom Map</p>
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>What to watch for</h3>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Common
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Rare
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(insight.symptoms_common || []).map((s, i) => (
                <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl text-sm text-slate-600 leading-snug">
                  <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
                  {s}
                </div>
              ))}
              {(insight.symptoms_rare || []).map((s, i) => (
                <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl text-sm text-slate-600 leading-snug">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6"
               style={{ boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.05)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Action Plan</p>
            <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {insight.steps?.length || 4}-step plan
            </h3>
            {(insight.steps || []).map((s, i) => {
              const c = STEP_COLORS[s.color] || STEP_COLORS.blue;
              return (
                <div key={i} className="flex gap-4 py-4 border-b border-slate-50 last:border-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                       style={{ background: c.bg, color: c.num }}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">{s.label}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{s.detail}</div>
                    <div className="text-xs font-mono text-slate-400 mt-1">{s.eta}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {/* Specialist */}
          <div className="rounded-2xl p-6 text-white relative overflow-hidden"
               style={{ background: 'linear-gradient(140deg, #0d9488, #134e4a)', boxShadow: '0px 4px 20px rgba(13,148,136,0.3)' }}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-wider text-teal-200 mb-1 relative z-10">Recommendation</p>
            <h3 className="text-lg font-bold text-white mb-2 relative z-10" style={{ fontFamily: 'Manrope, sans-serif' }}>Find a specialist</h3>
            <p className="text-sm text-teal-100 mb-4 relative z-10 leading-relaxed">See a physician to confirm this assessment and get a treatment plan.</p>
            <Link to="/nearby"
              className="w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold text-sm py-3 rounded-xl transition-all relative z-10">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
              Find nearby doctors
            </Link>
          </div>

          {/* Red Flags */}
          {insight.red_flags?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6"
                 style={{ boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.05)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Emergency Signals</p>
              <h3 className="text-lg font-bold text-slate-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Red-flag symptoms</h3>
              <ul className="space-y-2">
                {insight.red_flags.map((f, i) => (
                  <li key={i} className="flex gap-2 items-start text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                If any occur, go to the nearest emergency department or call 999 (Bangladesh).
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>warning</span>
            Educational content only — not a diagnosis.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiseaseInsight() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const searchRef = useRef(null);

  const DISEASE_PROMPT = (name) =>
    `Give me a structured disease overview for "${name}" including: brief overview, risk level (Low/Moderate/High), risk percent (0-100), prevalence, typical onset, whether it's treatable, list of 6 common symptoms, list of 4 rare symptoms, 4 suggested next steps with label/detail/eta/color (blue/mint/warn/red), 5 red flag symptoms. Respond as JSON with keys: name, overview, risk_level, risk_percent, prevalence, onset, treatable, symptoms_common, symptoms_rare, steps (list of {label,detail,eta,color}), red_flags.`;

  const parseInsight = (text, name) => {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) return JSON.parse(text.slice(start, end));
    } catch {}
    return { ...MOCK_INSIGHT, name };
  };

  const lookupDisease = async (name) => {
    if (!name.trim()) return;
    setLoading(true);
    setInsight(null);
    try {
      let text;
      if (user) {
        const res = await chatAPI.sendMessage(DISEASE_PROMPT(name), null);
        text = res.data.answer;
      } else {
        const res = await chatAPI.publicMessage(DISEASE_PROMPT(name));
        text = res.data.answer;
      }
      setInsight(parseInsight(text, name));
    } catch {
      setInsight({ ...MOCK_INSIGHT, name: name || MOCK_INSIGHT.name });
    } finally {
      setLoading(false);
    }
  };

  const focusSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    searchRef.current?.focus();
  };

  const handleBack = () => { setInsight(null); setSearch(''); };

  return (
    <>
      <Topbar eyebrow="AI Health Information" title="Disease Insight" />

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Loading */}
        {loading && <PaperPlaneLoader message="Analyzing condition…" />}

        {/* Insight detail view */}
        {!loading && insight && (
          <InsightView insight={insight} onBack={handleBack} />
        )}

        {/* Landing / discovery view */}
        {!loading && !insight && (
          <div className="p-8 space-y-12">

            {/* ── Hero Search ── */}
            <section className="max-w-4xl mx-auto w-full space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight"
                    style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Deep Clinical Intelligence
                </h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                  Access real-time AI-powered insights, symptom correlations, and treatment paradigms for over 10,000 medical conditions.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-2 flex items-center"
                   style={{ boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.05)' }}>
                <div className="flex-1 flex items-center px-4">
                  <span className="material-symbols-outlined text-teal-600 mr-4" style={{ fontSize: 32 }}>search</span>
                  <input
                    ref={searchRef}
                    className="w-full border-none outline-none text-lg py-4 placeholder:text-slate-400 bg-transparent text-slate-800"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                    placeholder="Look up Hypertension, Asthma, or a specific symptom..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && lookupDisease(search)}
                  />
                </div>
                <button
                  onClick={() => lookupDisease(search)}
                  disabled={!search.trim()}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white px-8 py-4 rounded-xl font-bold text-base transition-all active:scale-95 flex-shrink-0"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Search Insight
                </button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Common Conditions:</span>
                {COMMON_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setSearch(c); lookupDisease(c); }}
                    className="px-5 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-semibold hover:bg-teal-100 transition-all"
                    style={{ fontFamily: 'Inter, sans-serif', boxShadow: '0px 2px 8px rgba(15,23,42,0.04)' }}
                  >
                    {c}
                  </button>
                ))}
                <button
                  className="px-5 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-100 transition-all"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  + Explore All
                </button>
              </div>
            </section>

            {/* ── Bento Grid ── */}
            <section className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">

              {/* Featured card */}
              <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-8 flex flex-col md:flex-row gap-8 overflow-hidden group"
                   style={{ boxShadow: '0px 4px 20px rgba(15, 23, 42, 0.05)' }}>
                <div className="flex-1 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Featured Insight</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Understanding Cardiovascular Dynamics
                  </h3>
                  <p className="text-slate-500 leading-relaxed">
                    Explore how AI modeling predicts arterial hypertension progression using longitudinal patient data and lifestyle biomarkers.
                  </p>
                  <button
                    onClick={() => { setSearch('Hypertension'); lookupDisease('Hypertension'); }}
                    className="group/btn inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:shadow-teal-700/40 hover:-translate-y-0.5 active:scale-95 transition-all w-fit"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    Read Analysis
                    <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                </div>
                <div className="flex-1 min-h-[200px] rounded-xl overflow-hidden flex items-center justify-center relative"
                     style={{ background: 'linear-gradient(135deg, #0d9488 0%, #134e4a 100%)' }}>
                  <div className="absolute inset-0 opacity-20"
                       style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #fff 0%, transparent 55%)' }} />
                  <span className="material-symbols-outlined text-white/50 relative z-10"
                        style={{ fontSize: 90, fontVariationSettings: "'FILL' 0" }}>cardiology</span>
                </div>
              </div>

              {/* Stats card */}
              <div className="col-span-12 lg:col-span-4 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden"
                   style={{ background: 'linear-gradient(140deg, #0d9488, #134e4a)', boxShadow: '0px 4px 20px rgba(13,148,136,0.25)' }}>
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="space-y-4 relative z-10">
                  <span className="material-symbols-outlined text-teal-200" style={{ fontSize: 40 }}>database</span>
                  <h4 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Global Medical Knowledge Base
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(204,251,241,0.8)' }}>
                    Powered by over 2.4 million peer-reviewed clinical studies and real-time CDC updates.
                  </p>
                </div>
                <div className="pt-8 relative z-10">
                  <div className="text-5xl font-black text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>10k+</div>
                  <div className="text-xs uppercase tracking-widest mt-1" style={{ color: 'rgba(153,246,228,0.7)' }}>Diseases Indexed</div>
                </div>
              </div>

              {/* Feature mini-cards */}
              {[
                { icon: 'genetics',       title: 'Genomic Markers',        desc: 'Search how specific genetic predispositions impact chronic disease outcomes.', iconBg: 'rgba(219,234,254,0.6)', iconFg: '#1d4ed8' },
                { icon: 'microbiology',   title: 'Pathogen Tracking',      desc: 'Real-time mapping of infectious disease spread and mutation variances.',       iconBg: 'rgba(204,251,241,0.6)', iconFg: '#0d9488' },
                { icon: 'psychology_alt', title: 'Mental Health Correlates',desc: 'Investigate the bidirectional relationship between physical and mental illness.', iconBg: 'rgba(254,243,199,0.8)', iconFg: '#b45309' },
              ].map((card) => (
                <div key={card.title}
                     className="col-span-12 md:col-span-4 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 hover:-translate-y-1 transition-transform"
                     style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ background: card.iconBg, color: card.iconFg }}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <h4 className="font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>{card.title}</h4>
                  <p className="text-sm text-slate-500">{card.desc}</p>
                </div>
              ))}
            </section>

            {/* ── Recently Updated Conditions ── */}
            <section className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Recently Updated Conditions
                  </h3>
                  <p className="text-slate-500">Clinical documentation refreshed in the last 24 hours.</p>
                </div>
                <button
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 transition-all text-sm font-bold"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  View Update History
                  <span className="material-symbols-outlined group-hover:rotate-[-12deg] transition-transform" style={{ fontSize: 16 }}>history</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    query: 'COPD',
                    title: 'Chronic Obstructive Pulmonary Disease (COPD)',
                    tag: 'Severe', tagBg: '#f0fdf4', tagFg: '#15803d',
                    desc: 'Latest guidelines on bronchodilator therapy and long-term oxygen management paradigms.',
                    updated: 'Updated 4h ago',
                    icon: 'pulmonology', iconColor: '#5eead4',
                    gradFrom: 'rgba(13,148,136,0.35)', gradTo: 'rgba(19,78,74,0.7)',
                  },
                  {
                    query: "Alzheimer's Disease",
                    title: "Alzheimer's Disease Early Biomarkers",
                    tag: 'Chronic', tagBg: '#eff6ff', tagFg: '#1d4ed8',
                    desc: "New insights into amyloid-beta plaques and tau protein interactions in preclinical stages.",
                    updated: 'Updated 12h ago',
                    icon: 'neurology', iconColor: '#93c5fd',
                    gradFrom: 'rgba(59,130,246,0.3)', gradTo: 'rgba(30,58,138,0.65)',
                  },
                  {
                    query: 'Atrial Fibrillation',
                    title: 'Atrial Fibrillation Complications',
                    tag: 'Critical', tagBg: '#fffbeb', tagFg: '#b45309',
                    desc: 'Understanding stroke risk stratification using the latest CHA2DS2-VASc score modeling.',
                    updated: 'Updated 1d ago',
                    icon: 'monitor_heart', iconColor: '#fcd34d',
                    gradFrom: 'rgba(245,158,11,0.25)', gradTo: 'rgba(100,116,139,0.45)',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="group bg-white rounded-2xl border border-slate-100 overflow-hidden cursor-pointer"
                    style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)', transition: 'box-shadow 0.2s, transform 0.2s' }}
                    onClick={() => { setSearch(card.query); lookupDisease(card.query); }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0px 10px 30px rgba(15,23,42,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0px 4px 20px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div className="h-48 flex items-center justify-center overflow-hidden"
                         style={{ background: `linear-gradient(135deg, ${card.gradFrom}, ${card.gradTo})` }}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 80, color: card.iconColor, transition: 'transform 0.5s', fontVariationSettings: "'FILL' 0" }}
                      >{card.icon}</span>
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <h5 className="font-bold text-slate-900 leading-snug" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {card.title}
                        </h5>
                        <span className="text-xs px-2 py-1 rounded-md font-bold uppercase flex-shrink-0"
                              style={{ background: card.tagBg, color: card.tagFg }}>{card.tag}</span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{card.desc}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                        {card.updated}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={insight ? handleBack : focusSearch}
        className="fixed bottom-8 right-8 w-16 h-16 bg-teal-600 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 group"
        style={{ boxShadow: '0px 8px 24px rgba(13,148,136,0.4)', transition: 'transform 0.2s' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
          {insight ? 'arrow_back' : 'search_insights'}
        </span>
        <span className="absolute right-full mr-4 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {insight ? 'Back to Search' : 'Quick Lookup'}
        </span>
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
