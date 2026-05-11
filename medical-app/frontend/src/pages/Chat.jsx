import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { chatAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Markdown from '../utils/markdown';

/* ── Suggestion chips ────────────────────────────────────────── */
const SUGGESTIONS = [
  {
    prompt: 'I have a headache since morning',
    title: 'I have a headache', sub: 'since morning',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--fg-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="9"/><path d="M12 8v4M9.5 14.5A4 4 0 0 0 16 11"/>
      </svg>
    ),
  },
  {
    prompt: 'What causes acidity and how can I prevent it?',
    title: 'What causes', sub: 'acidity?',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--fg-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0 }}>
        <path d="M12 2a7 7 0 0 1 7 7c0 4-3 7-7 13C9 16 5 13 5 9a7 7 0 0 1 7-7z"/><path d="M12 6v4M12 14h.01"/>
      </svg>
    ),
  },
  {
    prompt: 'Can I take paracetamol for fever? What is the correct dosage?',
    title: 'Can I take', sub: 'paracetamol?',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--fg-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0 }}>
        <rect x="4" y="4" width="16" height="16" rx="3"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
    ),
  },
  {
    prompt: 'Give me tips for better sleep and improving sleep quality',
    title: 'Tips for better', sub: 'sleep',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--fg-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0 }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
  },
];

/* ── Sparkle logo ───────────────────────────────────────────── */
function Sparkle() {
  return (
    <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
      <path
        d="M20 0C20 11.0457 28.9543 20 40 20C28.9543 20 20 28.9543 20 40C20 28.9543 11.0457 20 0 20C11.0457 20 20 11.0457 20 0Z"
        fill="url(#chat-sparkle-grad)"
      />
      <defs>
        <linearGradient id="chat-sparkle-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-blue-600)"/>
          <stop offset="1" stopColor="var(--brand-blue-400)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Typing indicator ───────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '6px 0',
      maxWidth: 760, margin: '0 auto', width: '100%',
      paddingLeft: 20, paddingRight: 20, boxSizing: 'border-box',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'var(--brand-blue-100)', color: 'var(--fg-brand)',
        fontWeight: 700, fontSize: 11, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        border: '1px solid var(--brand-blue-200)',
      }}>AI</div>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0 18px 18px 18px',
        padding: '14px 18px',
        display: 'flex', gap: 6, alignItems: 'center',
        boxShadow: 'var(--shadow-xs)',
      }}>
        {[0, 150, 300].map(d => (
          <span key={d} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--brand-blue-300)',
            display: 'inline-block',
            animation: 'chat-bounce 1.2s infinite',
            animationDelay: `${d}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── JSON disease-card renderer ─────────────────────────────── */
function tryParseJson(text) {
  const t = text.trim();
  if (!t.startsWith('{') && !t.startsWith('```')) return null;
  const raw = t.startsWith('```') ? t.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim() : t;
  try { return JSON.parse(raw); } catch { return null; }
}

const RISK_COLOR = { Low: '#16a34a', Moderate: '#d97706', High: '#dc2626', Critical: '#dc2626' };
const STEP_COLOR = { blue: '#2563EB', mint: '#0d7c5e', warn: '#d97706', red: '#dc2626' };

function DiseaseCard({ data }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg-1)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{data.name}</div>
          {data.overview && <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 3 }}>{data.overview}</div>}
        </div>
        {data.risk_level && (
          <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${RISK_COLOR[data.risk_level] || '#6B7280'}18`, color: RISK_COLOR[data.risk_level] || '#6B7280', border: `1px solid ${RISK_COLOR[data.risk_level] || '#6B7280'}40` }}>
            {data.risk_level} risk
          </span>
        )}
      </div>

      {(data.prevalence || data.onset) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, padding: '10px 12px', background: 'var(--bg-surface-alt)', borderRadius: 10, fontSize: 12.5, color: 'var(--fg-2)', border: '1px solid var(--border-subtle)' }}>
          {data.prevalence && <span>📊 {data.prevalence}</span>}
          {data.onset     && <span>🕐 {data.onset}</span>}
          {data.treatable !== undefined && <span>{data.treatable ? '✅ Treatable' : '⚠️ Chronic'}</span>}
        </div>
      )}

      {data.symptoms_common?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Common symptoms</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.symptoms_common.map((s, i) => (
              <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--brand-blue-050)', color: 'var(--fg-brand)', fontWeight: 500, border: '1px solid var(--brand-blue-100)' }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {data.symptoms_rare?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Less common</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.symptoms_rare.map((s, i) => (
              <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--warning-100)', color: 'var(--warning-600)', fontWeight: 500 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {data.steps?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>What to do</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.steps.map((step, i) => {
              const c = STEP_COLOR[step.color] || '#2563EB';
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: `${c}0D`, border: `1px solid ${c}30` }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{step.label}</div>
                    {step.detail && <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{step.detail}</div>}
                    {step.eta    && <div style={{ fontSize: 11, color: c, fontWeight: 600, marginTop: 2 }}>{step.eta}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.red_flags?.length > 0 && (
        <div style={{ padding: '10px 12px', background: 'var(--danger-050)', border: '1px solid var(--danger-100)', borderRadius: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--danger-600)', marginBottom: 6 }}>🚨 When to seek help immediately</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--danger-600)', lineHeight: 1.6, opacity: 0.85 }}>
            {data.red_flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--fg-4)', fontStyle: 'italic' }}>
        ⚕️ Informational only. Always consult a licensed healthcare professional for diagnosis and treatment.
      </div>
    </div>
  );
}

/* ── Strip confidence lines ─────────────────────────────────── */
function stripConfidence(text) {
  return text
    .replace(/\*{0,2}confidence\s*(?:level)?\s*[:\-–]\s*\*{0,2}[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Message bubble ─────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const { user } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const jsonData = !isUser ? tryParseJson(msg.content) : null;

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '6px 0',
      maxWidth: 760, margin: '0 auto', width: '100%',
      paddingLeft: 20, paddingRight: 20, boxSizing: 'border-box',
      flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start',
      animation: 'chat-slideUp 200ms ease-out',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: isUser ? 'var(--grad-brand)' : 'var(--brand-blue-100)',
        color: isUser ? '#fff' : 'var(--fg-brand)',
        fontWeight: 700, fontSize: 12, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        border: isUser ? 'none' : '1px solid var(--brand-blue-200)',
      }}>
        {isUser ? initials : 'AI'}
      </div>

      <div style={{ maxWidth: '74%' }}>
        <div style={{
          background: isUser ? 'var(--grad-brand)' : 'var(--bg-surface)',
          color: isUser ? '#fff' : 'var(--fg-1)',
          border: isUser ? 'none' : '1px solid var(--border-subtle)',
          borderRadius: isUser ? '18px 0 18px 18px' : '0 18px 18px 18px',
          padding: '12px 16px',
          fontSize: 14.5,
          lineHeight: 1.65,
          boxShadow: isUser ? '0 2px 8px rgba(37,99,235,.22)' : 'var(--shadow-xs)',
        }}>
          {isUser
            ? msg.content
            : jsonData
              ? <DiseaseCard data={jsonData} />
              : <Markdown content={stripConfidence(msg.content)} />}
        </div>
      </div>
    </div>
  );
}

/* ── Composer ───────────────────────────────────────────────── */
function Composer({ onSend, loading, compact = false }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const submit = () => {
    const t = text.trim();
    if (!t || loading) return;
    onSend(t);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const autoResize = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: compact ? '100%' : 720,
      margin: compact ? 0 : '0 auto',
      padding: compact ? '12px 0 14px' : 0,
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: compact ? 18 : 24,
        border: '1.5px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
        padding: '14px 16px 52px',
        position: 'relative',
        transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
      }}
        onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--brand-blue-500)'; e.currentTarget.style.boxShadow = 'var(--shadow-focus)'; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); autoResize(e); }}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          rows={compact ? 1 : 2}
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'none',
            fontSize: 15, lineHeight: 1.6, color: 'var(--fg-1)',
            background: 'transparent', fontFamily: 'inherit',
          }}
        />

        {/* Bottom-left: image button */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/image')}
            title="Analyze medical image"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--bg-surface-alt)', border: '1px solid var(--border-default)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--fg-4)',
              transition: 'background 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--fg-brand)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface-alt)'; e.currentTarget.style.color = 'var(--fg-4)'; }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
            </svg>
          </button>
        </div>

        {/* Bottom-right: send button */}
        <div style={{ position: 'absolute', bottom: 12, right: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--fg-5)', marginRight: 4 }}>⏎ Enter</span>
          <button
            onClick={submit}
            disabled={!text.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: text.trim() && !loading ? 'var(--grad-brand)' : 'var(--neutral-100)',
              border: 'none', cursor: text.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: text.trim() && !loading ? '#fff' : 'var(--fg-4)',
              transition: 'background 150ms, transform 80ms',
              boxShadow: text.trim() && !loading ? '0 2px 10px rgba(37,99,235,.4)' : 'none',
            }}
            onMouseDown={e => { if (text.trim() && !loading) e.currentTarget.style.transform = 'scale(0.92)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading
              ? <span style={{ width: 14, height: 14, border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'chat-spin 0.7s linear infinite' }} />
              : (
                <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
          </button>
        </div>
      </div>

      {!compact && (
        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--fg-5)', marginTop: 10 }}>
          Shift+Enter for new line &middot; Enter to send
        </p>
      )}
    </div>
  );
}

/* ── Empty / welcome state ──────────────────────────────────── */
function EmptyState({ onSend, loading }) {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px 0', overflowY: 'auto' }}>

      {/* Logo + greeting */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <Sparkle />
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 10px', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
          {firstName
            ? <>Hello, <span style={{ color: 'var(--fg-brand)' }}>{firstName}</span>!</>
            : <>Hello there!</>}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--fg-3)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
          I&apos;m MediZen AI, your health assistant.<br />
          Ask me anything about symptoms, conditions, medications or general health.
        </p>
      </div>

      {/* Composer */}
      <div style={{ width: '100%', maxWidth: 720, marginBottom: 24 }}>
        <Composer onSend={onSend} loading={loading} compact={false} />
      </div>

      {/* Suggestion chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 860, marginBottom: 32 }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.prompt}
            onClick={() => onSend(s.prompt)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 14, padding: '11px 16px',
              cursor: 'pointer', textAlign: 'left', width: 190,
              transition: 'border-color 150ms, box-shadow 150ms, background 150ms',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-brand)'; e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {s.icon}
            <span style={{ fontSize: 13, color: 'var(--fg-2)', fontWeight: 500, lineHeight: 1.45 }}>
              {s.title}<br /><span style={{ color: 'var(--fg-4)' }}>{s.sub}</span>
            </span>
          </button>
        ))}

        {/* Disease insight link */}
        <Link
          to="/disease"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 14, padding: '11px 16px',
            cursor: 'pointer', textDecoration: 'none',
            transition: 'border-color 150ms, box-shadow 150ms, background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-brand)'; e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8l4 4-4 4"/>
          </svg>
          <span style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 500, lineHeight: 1.45 }}>
            Disease<br />Insight →
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main Chat page
   ════════════════════════════════════════════════════════════════ */
export default function ChatPage({ onSessionsChange }) {
  const { user } = useAuth();
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef  = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionParam = searchParams.get('session');

  useEffect(() => {
    if (sessionParam) {
      loadSession(parseInt(sessionParam));
    } else {
      setMessages([]);
      setSessionId(null);
    }
  }, [sessionParam]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSession = async (id) => {
    try {
      const res = await chatAPI.getMessages(id);
      setMessages(res.data.map(m => ({ role: m.role, content: m.content, id: m.id })));
      setSessionId(id);
    } catch (err) { console.error(err); }
  };

  const send = useCallback(async (text) => {
    if (loading) return;
    setMessages(m => [...m, { role: 'user', content: text }]);
    setLoading(true);
    try {
      let data;
      if (user) {
        const res = await chatAPI.sendMessage(text, sessionId);
        data = res.data;
        if (!sessionId) {
          setSessionId(data.session_id);
          navigate(`/?session=${data.session_id}`, { replace: true });
          onSessionsChange?.();
        }
      } else {
        const res = await chatAPI.publicMessage(text);
        data = res.data;
      }
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.answer,
        confidence: data.confidence,
        sources_found: data.sources_found,
      }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, navigate, onSessionsChange, user]);

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-app)', position: 'relative' }}>

      {/* Floating disclaimer banner */}
      <div style={{ position: 'absolute', top: 14, right: 16, zIndex: 20 }}>
        <div style={{
          background: 'var(--bg-glass)', backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-subtle)', borderRadius: 999,
          padding: '6px 14px', display: 'flex', alignItems: 'center',
          gap: 7, boxShadow: 'var(--shadow-xs)', fontSize: 12, color: 'var(--fg-4)',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          Medical AI — not a substitute for a doctor
        </div>
      </div>

      {/* Empty / welcome */}
      {isEmpty && <EmptyState onSend={send} loading={loading} />}

      {/* Active chat */}
      {!isEmpty && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '56px 0 16px' }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Bottom disclaimer */}
          <div style={{ textAlign: 'center', padding: '4px 20px 0', fontSize: 11.5, color: 'var(--fg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>MediZen is not a substitute for professional medical advice.</span>
          </div>

          {/* Composer */}
          <div style={{ padding: '0 16px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box', paddingBottom: 12 }}>
            <Composer onSend={send} loading={loading} compact={true} />
          </div>
        </>
      )}

      <style>{`
        @keyframes chat-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chat-spin { to { transform: rotate(360deg); } }
        @keyframes chat-slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
