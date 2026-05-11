import { useRef, useState } from 'react';
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

/* ── Status chip ──────────────────────────────────────────────────── */
function StatusChip({ status }) {
  const map = {
    Normal:   { bg: '#f0fdf4', fg: '#15803d' },
    High:     { bg: '#fff1f2', fg: '#be123c' },
    Low:      { bg: '#fffbeb', fg: '#b45309' },
    Critical: { bg: '#fff1f2', fg: '#be123c' },
  };
  const c = map[status] || { bg: '#f1f5f9', fg: '#475569' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: c.bg, color: c.fg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.fg }} />
      {status}
    </span>
  );
}

/* ── Results view ─────────────────────────────────────────────────── */
function Results({ data, onBack }) {
  const a = data.analysis || data;
  const markers = a.markers || [];
  const [filter, setFilter] = useState('all');
  const displayed = filter === 'abnormal' ? markers.filter((m) => m.status !== 'Normal') : markers;
  const abnormalCount = markers.filter(m => m.status !== 'Normal').length;
  const severity = (a.severity || 'Low');
  const severityColors = { Low: { bg: '#f0fdf4', fg: '#15803d' }, Moderate: { bg: '#fffbeb', fg: '#b45309' }, High: { bg: '#fff1f2', fg: '#be123c' } };
  const sc = severityColors[severity] || severityColors.Low;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={onBack} className="group mb-6 inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-white border border-slate-200 text-teal-700 hover:text-white hover:bg-teal-600 hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 active:scale-95 transition-all text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform" style={{ fontSize: 18 }}>arrow_back</span>
        New report
      </button>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {[
          { label: 'Markers Analyzed', value: markers.length || (a.abnormal_count + '+'), sub: a.report_type || 'Lab Report', subBg: '#eff6ff', subFg: '#1d4ed8' },
          { label: 'Abnormal Values',  value: a.abnormal_count ?? abnormalCount, valueColor: abnormalCount > 0 ? '#dc2626' : '#0d9488', sub: `${severity} severity`, subBg: sc.bg, subFg: sc.fg },
          { label: 'Overall Status',   value: null, text: a.overall_interpretation || 'See details below' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{card.label}</p>
            {card.value != null
              ? <><div className="text-3xl font-black text-slate-900" style={{ fontFamily: 'Manrope, sans-serif', color: card.valueColor }}>{card.value}</div>
                  <span className="inline-block mt-3 text-xs font-bold px-3 py-1 rounded-full" style={{ background: card.subBg, color: card.subFg }}>{card.sub}</span></>
              : <p className="text-sm font-semibold text-slate-700 leading-snug mt-1">{card.text}</p>}
          </div>
        ))}
      </div>

      {/* Markers table */}
      {markers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Structured Results</p>
              <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>All Markers</h3>
            </div>
            <select
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All ({markers.length})</option>
              <option value="abnormal">Abnormal only ({abnormalCount})</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-slate-50">
                  {['Test', 'Result', 'Normal Range', 'Status', 'Interpretation'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((m, i) => {
                  const abnormal = m.status !== 'Normal';
                  return (
                    <tr key={i} style={{ background: abnormal ? '#fff9f9' : 'transparent' }}>
                      <td className="px-4 py-3 border-b border-slate-50 text-sm font-semibold text-slate-800"
                          style={{ borderLeft: abnormal ? '3px solid #dc2626' : 'none' }}>{m.test_name}</td>
                      <td className="px-4 py-3 border-b border-slate-50 font-mono font-bold text-sm"
                          style={{ color: m.status === 'High' ? '#dc2626' : m.status === 'Low' ? '#b45309' : '#0d9488' }}>
                        {m.value} <span className="font-normal text-xs text-slate-400">{m.unit}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-50 font-mono text-xs text-slate-400">{m.normal_range}</td>
                      <td className="px-4 py-3 border-b border-slate-50"><StatusChip status={m.status} /></td>
                      <td className="px-4 py-3 border-b border-slate-50 text-xs text-slate-500 max-w-xs">{m.interpretation || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interpretation + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">What This Means</p>
          <h3 className="text-lg font-bold text-slate-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>{a.overall_interpretation || 'Lab Results Summary'}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{a.plain_explanation || 'Please consult your doctor for interpretation.'}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.fg }}>
              {severity} Severity
            </span>
          </div>
        </div>

        {a.priority_tests?.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Priority Follow-ups</p>
            {a.priority_tests.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900">{t.test_name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: t.priority === 'High' ? '#dc2626' : '#b45309' }}>{t.priority}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{t.reason}{t.timeframe ? ` · ${t.timeframe}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18 }}>warning</span>
        <span><b>Informational only.</b> {a.disclaimer || 'Results should be interpreted by a physician in context of your symptoms and history.'}</span>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function TestReport() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  const handleFile = async (file) => {
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzeAPI.report(file);
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
      <Topbar eyebrow="AI Analysis" title="Lab Reports">
        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full tracking-widest uppercase">AI Analysis</span>
      </Topbar>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && <PaperPlaneLoader message="Parsing lab report with AI…" />}

        {!loading && result && (
          <Results data={result} onBack={() => { setResult(null); setError(''); }} />
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
                    <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Upload Lab Report</h2>
                    <span className="text-xs text-slate-400 font-medium">Supported: JPG, PNG, PDF</span>
                  </div>
                  <UploadZone onFile={handleFile} accept=".jpg,.jpeg,.png,.pdf" loading={loading} />
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                  <div className="rounded-xl overflow-hidden h-44 mb-4 flex items-center justify-center relative"
                       style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }}>
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, #fff 0%, transparent 55%)' }} />
                    <span className="material-symbols-outlined text-white/50 relative z-10" style={{ fontSize: 80 }}>labs</span>
                    <div className="absolute bottom-0 inset-x-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                      <p className="text-white font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Reading Your Results</p>
                      <p className="text-white/70 text-xs">AI highlights values outside normal range</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed px-1">Ensure the entire page is visible in the photo. For PDF reports, upload the original digital file for best accuracy.</p>
                </div>

                <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(140deg, #0d9488, #134e4a)', boxShadow: '0px 4px 20px rgba(13,148,136,0.2)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-teal-200" style={{ fontSize: 20 }}>security</span>
                    <span className="font-bold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Privacy Guaranteed</span>
                  </div>
                  <p className="text-teal-100 text-xs leading-relaxed">
                    All medical data is encrypted using AES-256 standards. Your lab results are processed securely and never shared without your explicit consent.
                  </p>
                </div>
              </div>

              {/* Recent history */}
              <div className="lg:col-span-12">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Lab Reports</h2>
                  <button
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 hover:shadow-lg hover:shadow-teal-600/25 transition-all text-sm font-bold"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    View All History
                    <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" style={{ fontSize: 16 }}>arrow_forward</span>
                  </button>
                </div>
                <RecentHistory
                  type="report"
                  refreshKey={historyKey}
                  onOpen={(data) => { setResult(data); setError(''); }}
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
