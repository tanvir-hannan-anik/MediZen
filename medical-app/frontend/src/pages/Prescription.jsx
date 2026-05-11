import { useRef, useState } from 'react';
import Topbar from '../components/Topbar';
import PaperPlaneLoader from '../components/PaperPlaneLoader';
import RecentHistory from '../components/RecentHistory';
import { analyzeAPI } from '../api/client';

/* ── Shared inline upload zone ────────────────────────────────────── */
function UploadZone({ onFile, accept, loading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[360px] rounded-xl transition-all cursor-pointer p-12 ${dragging ? 'border-2 border-teal-500 bg-teal-50/30' : 'border-2 border-dashed border-slate-200 hover:border-teal-500 hover:bg-teal-50/10'}`}
      style={{ borderStyle: 'dashed' }}
      onClick={() => !loading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-teal-600" style={{ fontSize: 40, fontVariationSettings: "'wght' 300" }}>cloud_upload</span>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Drag and drop files here</h3>
      <p className="text-slate-500 text-sm mb-6 text-center">or browse your computer to select files for analysis</p>
      <button
        type="button"
        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
        style={{ fontFamily: 'Manrope, sans-serif' }}
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        Select Files
      </button>
      <p className="text-xs text-slate-400 mt-4 font-mono">{accept.replace(/,/g, ' · ')} · max 20 MB</p>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

/* ── Results view ─────────────────────────────────────────────────── */
const MED_COLORS = [
  { bg: 'rgba(13,148,136,0.12)', fg: '#0d9488' },
  { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
  { bg: 'rgba(139,92,246,0.12)', fg: '#7c3aed' },
  { bg: 'rgba(239,68,68,0.12)',  fg: '#dc2626' },
];

function Results({ data, filename, onBack }) {
  const a = data.analysis || data;
  const meds = a.medications || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={onBack} className="group mb-6 inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-white border border-slate-200 text-teal-700 hover:text-white hover:bg-teal-600 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 active:scale-95 transition-all text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform" style={{ fontSize: 18 }}>arrow_back</span>
        New upload
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — document preview */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Document Preview</p>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{filename}</span>
            </div>
            <div className="rounded-xl border border-slate-100 p-6 relative overflow-hidden" style={{ background: '#FEFCF6' }}>
              <div className="absolute top-3 right-5 text-4xl font-black italic opacity-10 text-teal-600">Rx</div>
              <div className="border-b-2 border-teal-600 pb-3 mb-4">
                <div className="font-bold text-slate-900">{a.doctor_name || 'Doctor'}</div>
                <div className="text-xs text-slate-400 mt-1">{a.date || ''}</div>
              </div>
              <div className="text-sm text-slate-600 mb-3">Patient: <b className="text-slate-800">{a.patient_name || 'Patient'}</b></div>
              {meds.map((m, i) => (
                <div key={i} className="font-serif italic text-sm text-slate-700 leading-relaxed">
                  {m.name} {m.dosage} — {m.frequency}{m.duration ? `, ${m.duration}` : ''}
                </div>
              ))}
              {a.general_advice && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-xs text-slate-400">{a.general_advice}</div>
              )}
            </div>
            {a.extracted_text && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Extracted Text · OCR</p>
                <pre className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed overflow-auto max-h-48 font-mono whitespace-pre-wrap">{a.extracted_text}</pre>
              </div>
            )}
          </div>

          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>warning</span>
            <span><b>Not medical advice.</b> Always follow the instructions given by your prescribing doctor.</span>
          </div>
        </div>

        {/* Right — AI summary */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">AI Summary</p>
            <h3 className="text-lg font-bold text-slate-900 mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {meds.length} medication{meds.length !== 1 ? 's' : ''} detected
            </h3>
            <div className="space-y-3">
              {meds.map((m, i) => {
                const c = MED_COLORS[i % MED_COLORS.length];
                return (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                         style={{ background: c.bg, color: c.fg }}>
                      {(m.name || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900">{m.name} <span className="font-normal text-xs text-slate-400">{m.dosage}</span></div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{m.purpose || m.plain_explanation || ''}</div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg whitespace-nowrap">{m.frequency}</span>
                  </div>
                );
              })}
            </div>

            {a.plain_summary && (
              <div className="mt-5 p-4 bg-teal-50 border border-teal-100 rounded-xl">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">Plain-language Explanation</p>
                <p className="text-sm text-slate-700 leading-relaxed">{a.plain_summary}</p>
              </div>
            )}
          </div>

          {a.important_reminders?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Reminders</p>
              <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Important Notes</h3>
              <div className="space-y-3">
                {a.important_reminders.map((r, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 14 }}>warning</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Prescription() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  const handleFile = async (file) => {
    setError('');
    setFilename(file.name);
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzeAPI.prescription(file);
      setResult(res.data);
      setHistoryKey(k => k + 1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Topbar eyebrow="AI Analysis" title="Prescriptions">
        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full tracking-widest uppercase">AI Analysis</span>
      </Topbar>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Loading */}
        {loading && <PaperPlaneLoader message="Reading prescription with OCR and AI…" />}

        {/* Results */}
        {!loading && result && (
          <Results data={result} filename={filename} onBack={() => { setResult(null); setFilename(''); setError(''); }} />
        )}

        {/* Upload state */}
        {!loading && !result && (
          <div className="p-8 max-w-6xl mx-auto w-full space-y-8">

            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>error</span>
                {error}
              </div>
            )}

            {/* Upload + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Upload area */}
              <div className="lg:col-span-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-100 h-full flex flex-col" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Upload New Prescription</h2>
                    <span className="text-xs text-slate-400 font-medium">Supported: JPG, PNG, PDF</span>
                  </div>
                  <UploadZone onFile={handleFile} accept=".jpg,.jpeg,.png,.pdf" loading={loading} />
                </div>
              </div>

              {/* Guidance sidebar */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                  <div className="rounded-xl overflow-hidden h-44 mb-4 flex items-center justify-center relative"
                       style={{ background: 'linear-gradient(135deg, #0d9488 0%, #134e4a 100%)' }}>
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #fff 0%, transparent 55%)' }} />
                    <span className="material-symbols-outlined text-white/50 relative z-10" style={{ fontSize: 80, fontVariationSettings: "'FILL' 0" }}>description</span>
                    <div className="absolute bottom-0 inset-x-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                      <p className="text-white font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Clinical Guide</p>
                      <p className="text-white/70 text-xs">Improving OCR accuracy for handwritten notes</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed px-1">Ensure the prescription is lying flat and use direct top-down lighting to reduce shadows and glare.</p>
                </div>

                <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(140deg, #0d9488, #134e4a)', boxShadow: '0px 4px 20px rgba(13,148,136,0.2)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-teal-200" style={{ fontSize: 20 }}>security</span>
                    <span className="font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Privacy Guaranteed</span>
                  </div>
                  <p className="text-teal-100 text-xs leading-relaxed">
                    All medical data is encrypted using AES-256 standards. Your private health information is processed securely and never shared without your explicit consent.
                  </p>
                </div>
              </div>

              {/* Recent history */}
              <div className="lg:col-span-12">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Prescriptions</h2>
                  <button
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 transition-all text-sm font-bold"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    View All History
                    <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" style={{ fontSize: 16 }}>arrow_forward</span>
                  </button>
                </div>
                <RecentHistory
                  type="prescription"
                  refreshKey={historyKey}
                  onOpen={(data, fname) => { setResult(data); setFilename(fname || ''); setError(''); }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
