import { useEffect, useState } from 'react';
import { analyzeAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PRESETS = {
  prescription: {
    icon: 'medication',
    iconColor: '#0d9488',
    gradient: 'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(19,78,74,0.25))',
    badge: 'PRESCRIPTION',
    badgeBg: '#ccfbf1', badgeFg: '#0f766e',
    emptyTitle: 'No prescriptions yet',
    emptyMsg:   'Upload your first prescription above and it will appear here.',
  },
  report: {
    icon: 'biotech',
    iconColor: '#2563eb',
    gradient: 'linear-gradient(135deg, rgba(13,148,136,0.12), rgba(29,78,216,0.18))',
    badge: 'LAB REPORT',
    badgeBg: '#dbeafe', badgeFg: '#1d4ed8',
    emptyTitle: 'No lab reports yet',
    emptyMsg:   'Upload your first lab report above and it will appear here.',
  },
  image: {
    icon: 'radiology',
    iconColor: '#7c3aed',
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(67,20,180,0.3))',
    badge: 'MEDICAL IMAGE',
    badgeBg: '#ede9fe', badgeFg: '#6d28d9',
    emptyTitle: 'No image analyses yet',
    emptyMsg:   'Upload your first medical image above and it will appear here.',
  },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hr ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} day${diffD > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RecentHistory({ type, refreshKey, onOpen, limit = 6 }) {
  const { user } = useAuth();
  const preset = PRESETS[type];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    let cancelled = false;
    setLoading(true);
    analyzeAPI.history()
      .then(res => {
        if (cancelled) return;
        const filtered = (res.data || []).filter(r => r.type === type).slice(0, limit);
        setItems(filtered);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, type, refreshKey, limit]);

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center"
           style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
        <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 40 }}>history</span>
        <p className="mt-2 text-sm text-slate-500">Sign in to keep your analysis history.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-4 animate-pulse"
               style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
            <div className="w-20 h-24 rounded-xl bg-slate-100 flex-shrink-0" />
            <div className="flex-1 py-1 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
              <div className="h-4 w-20 rounded-full bg-slate-100 mt-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center"
           style={{ fontFamily: 'Manrope, sans-serif' }}>
        <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 48 }}>{preset.icon}</span>
        <p className="mt-3 font-bold text-slate-700">{preset.emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{preset.emptyMsg}</p>
      </div>
    );
  }

  const handleClick = async (item) => {
    if (opening) return;
    setOpening(item.id);
    try {
      const res = await analyzeAPI.getUpload(item.id);
      const { analysis, filename } = res.data || {};
      if (analysis && onOpen) onOpen(analysis, filename || item.filename);
    } catch (e) {
      console.error('Failed to open record', e);
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item)}
          disabled={opening === item.id}
          className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-4 hover:border-teal-200 transition-colors cursor-pointer group text-left disabled:opacity-60"
          style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}
        >
          <div className="w-20 h-24 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
               style={{ background: preset.gradient }}>
            {opening === item.id ? (
              <div className="w-6 h-6 rounded-full border-2 border-teal-100 border-t-teal-600 animate-spin" />
            ) : (
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform"
                    style={{ fontSize: 36, color: preset.iconColor }}>{preset.icon}</span>
            )}
          </div>
          <div className="flex flex-col justify-between py-1 min-w-0 flex-1">
            <div>
              <h4 className="font-bold text-slate-900 text-sm leading-snug truncate"
                  title={item.filename}
                  style={{ fontFamily: 'Manrope, sans-serif' }}>
                {item.filename}
              </h4>
              <p className="text-slate-500 text-xs mt-1">{formatDate(item.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                    style={{ background: preset.badgeBg, color: preset.badgeFg }}>
                {preset.badge}
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                ANALYZED
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
