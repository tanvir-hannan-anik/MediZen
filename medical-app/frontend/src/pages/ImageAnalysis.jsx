import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import PaperPlaneLoader from '../components/PaperPlaneLoader';
import RecentHistory from '../components/RecentHistory';
import { analyzeAPI } from '../api/client';

/* ── Upload zone ──────────────────────────────────────────────────── */
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
      <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Drag and drop your image here</h3>
      <p className="text-slate-500 text-sm mb-6 text-center">or browse to upload X-rays, skin photos, scans, or any medical image</p>
      <button
        type="button"
        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
        style={{ fontFamily: 'Manrope, sans-serif' }}
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        Select Image
      </button>
      <p className="text-xs text-slate-400 mt-4 font-mono">{accept.replace(/,/g, ' · ')} · max 20 MB</p>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

/* ── Confidence bar ───────────────────────────────────────────────── */
function ConfBar({ value }) {
  const color = value >= 70 ? '#0d9488' : value >= 40 ? '#b45309' : '#dc2626';
  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <span className="block h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-9 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

/* ── Results view ─────────────────────────────────────────────────── */
function Results({ data, filename, onBack }) {
  const analysis = data.analysis || data;
  const conditions = analysis.conditions || [];
  const nextSteps = analysis.next_steps || [];
  const severity = (analysis.severity || 'Moderate');
  const severityColors = { Low: { bg: '#f0fdf4', fg: '#15803d' }, Moderate: { bg: '#fffbeb', fg: '#b45309' }, High: { bg: '#fff1f2', fg: '#be123c' }, Critical: { bg: '#fff1f2', fg: '#be123c' } };
  const sc = severityColors[severity] || severityColors.Moderate;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={onBack} className="group mb-6 inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-white border border-slate-200 text-teal-700 hover:text-white hover:bg-teal-600 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 active:scale-95 transition-all text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform" style={{ fontSize: 18 }}>arrow_back</span>
        New analysis
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — image preview */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
            <div className="bg-slate-900 aspect-video flex items-center justify-center relative overflow-hidden">
              {data.file_url
                ? <img src={data.file_url} alt="uploaded" className="max-w-full max-h-full object-contain" />
                : (
                  <div className="flex flex-col items-center gap-3 opacity-40">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 64 }}>image_search</span>
                    <span className="text-white text-sm font-mono">medical image</span>
                  </div>
                )}
            </div>
            <div className="flex justify-between items-center px-5 py-3 bg-slate-50 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-800">{filename}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{analysis.image_type || 'Medical image'}</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: sc.bg, color: sc.fg }}>{severity}</span>
            </div>
          </div>

          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>warning</span>
            <span><b>Informational only.</b> {analysis.disclaimer || 'This is an AI-generated estimate. Never replaces a licensed radiologist or physician.'}</span>
          </div>
        </div>

        {/* Right — findings */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Findings</p>
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Top {conditions.length} possible condition{conditions.length !== 1 ? 's' : ''}
                </h3>
              </div>
              {conditions[0] && (
                <div className="w-16 h-16 rounded-full relative flex items-center justify-center flex-shrink-0"
                     style={{ background: `conic-gradient(#0d9488 0 ${Number(conditions[0].confidence) || 0}%, #e2e8f0 0)` }}>
                  <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                    <span className="text-sm font-extrabold text-teal-600">{Number(conditions[0].confidence) || 0}%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {conditions.map((c, i) => (
                <div key={i}
                     className="p-4 rounded-xl border transition-colors"
                     style={{ borderColor: i === 0 ? '#99f6e4' : '#f1f5f9', background: i === 0 ? '#f0fdfa' : 'transparent' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-slate-900">{c.name}</span>
                    <ConfBar value={c.confidence} />
                  </div>
                  {c.description && <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>}
                </div>
              ))}
            </div>
          </div>

          {nextSteps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Suggestions</p>
              <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>What to do next</h3>
              <div className="space-y-1">
                {nextSteps.map((s, i) => (
                  <div key={i} className="flex gap-4 py-3 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            to="/disease"
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm py-4 rounded-xl transition-all"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Continue to Disease Insight
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function ImageAnalysis() {
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
      const res = await analyzeAPI.image(file);
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
      <Topbar eyebrow="AI Analysis" title="Image Analysis">
        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full tracking-widest uppercase">AI Analysis</span>
        {result && (
          <Link to="/disease" className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Disease Insight <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </Link>
        )}
      </Topbar>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && <PaperPlaneLoader message="Analyzing image with AI…" />}

        {!loading && result && (
          <Results data={result} filename={filename} onBack={() => { setResult(null); setFilename(''); setError(''); }} />
        )}

        {!loading && !result && (
          <div className="p-8 max-w-6xl mx-auto w-full space-y-8">

            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>error</span>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Upload area */}
              <div className="lg:col-span-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-100 h-full flex flex-col" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Upload Medical Image</h2>
                    <span className="text-xs text-slate-400 font-medium">Supported: JPG, PNG, GIF, WEBP</span>
                  </div>
                  <UploadZone onFile={handleFile} accept=".jpg,.jpeg,.png,.gif,.webp" loading={loading} />
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                  <div className="rounded-xl overflow-hidden h-44 mb-4 flex items-center justify-center relative"
                       style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 60% 40%, #818cf8 0%, transparent 55%)' }} />
                    <span className="material-symbols-outlined text-white/50 relative z-10" style={{ fontSize: 80 }}>image_search</span>
                    <div className="absolute bottom-0 inset-x-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                      <p className="text-white font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Best Practices</p>
                      <p className="text-white/70 text-xs">Getting clearer AI results from your images</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed px-1">Use original digital files when possible. For physical images, photograph them under bright, even lighting with no shadows or glare.</p>
                </div>

                <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(140deg, #0d9488, #134e4a)', boxShadow: '0px 4px 20px rgba(13,148,136,0.2)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-teal-200" style={{ fontSize: 20 }}>security</span>
                    <span className="font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Privacy Guaranteed</span>
                  </div>
                  <p className="text-teal-100 text-xs leading-relaxed">
                    All medical images are encrypted and processed in isolated environments. Your data is never stored beyond the analysis session without your explicit consent.
                  </p>
                </div>
              </div>

              {/* Recent history */}
              <div className="lg:col-span-12">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Analyses</h2>
                  <button
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 transition-all text-sm font-bold"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    View All History
                    <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" style={{ fontSize: 16 }}>arrow_forward</span>
                  </button>
                </div>
                <RecentHistory
                  type="image"
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
