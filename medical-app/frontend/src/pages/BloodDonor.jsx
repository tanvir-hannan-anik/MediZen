import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { donorAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/* Palette mapped from the Material-style mockup */
const C = {
  primary:           '#a50001',
  primaryDark:       '#8a0001',
  primaryFixed:      '#ffdad5',
  onPrimaryFixed:    '#410000',
  surface:           '#f9f9ff',
  surfaceLow:        '#f0f3ff',
  surfaceContainer:  '#e7eeff',
  surfaceHigh:       '#dee8ff',
  surfaceLowest:     '#ffffff',
  outline:           '#906f6a',
  outlineVariant:    '#e5beb7',
  onSurface:         '#111c2d',
  onSurfaceVariant:  '#5c403c',
  error:             '#ba1a1a',
  secondaryFixed:    '#eedfe0',
  onSecondaryFixed:  '#211a1b',
};

const HERO_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2kTmY2sU0wXM72lCmCpOxyQkZBwyfxlwFvqF0t5ppJrQ7TTlx6gBxG05ts_uiPbvnQIIGpv2rjiCzF5twoPy39Eige4kUDRss060IM_vKm2mqF2vg3LDGjioiL3XAJDyvD02OB-TUrioUd_tdfT5M0riISczo98aoO1f_4riEMmoC1Nbo2GAeHUFAeBm0jTwaIzTH1AxnMDV9jWcP-cfiy30g10vGL1HqrFmAvI-CwBcMP0QgCpNn7NfsnlMPH2N7e22xK0zKudM';

const BENEFITS = [
  { icon: '✅', title: 'Verified Network',  desc: 'All donors go through a quick verification to ensure safety.' },
  { icon: '🔔', title: 'Real-time Alerts',  desc: 'Get notified when someone with your blood type needs help nearby.' },
  { icon: '💪', title: 'Save 3 Lives',      desc: 'A single donation can save up to three lives in one visit.' },
  { icon: '🩺', title: 'Free Health Check', desc: 'Every donation includes a complimentary health screening.' },
];

const AVATAR_PALETTE = [
  { bg: C.primaryFixed,   fg: C.onPrimaryFixed },
  { bg: C.secondaryFixed, fg: C.onSecondaryFixed },
  { bg: '#d8e3fb',        fg: '#111c2d' },
  { bg: '#fde68a',        fg: '#7c2d12' },
  { bg: '#dcfce7',        fg: '#14532d' },
];

function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function paletteFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/* ── Donor Card ──────────────────────────────────────────────────────────── */
function DonorCard({ donor, avatar }) {
  const av = donor.available;
  const pal = paletteFor(donor.name);
  return (
    <div style={{ background: C.surfaceLowest, padding: 24, borderRadius: 24, border: `1px solid ${C.outlineVariant}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 20, transition: 'box-shadow 200ms' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: pal.bg, color: pal.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, overflow: 'hidden', flexShrink: 0 }}>
            {avatar
              ? <img src={avatar} alt={donor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(donor.name)}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.onSurface, lineHeight: 1.2 }}>{donor.name}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: C.onSurfaceVariant, fontSize: 12 }}>
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'currentColor' }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              {donor.location}
              {donor.donations_count > 0 && <><span style={{ color: '#d1d5db' }}>·</span><span>{donor.donations_count} donation{donor.donations_count !== 1 ? 's' : ''}</span></>}
            </div>
          </div>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(186,26,26,0.10)', border: '1px solid rgba(186,26,26,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, fontWeight: 900, fontSize: 18 }}>
          {donor.blood_group}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: av ? '#10b981' : '#9ca3af' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: av ? '#059669' : '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>
          {av ? 'Available Now' : 'Currently Unavailable'}
        </span>
      </div>

      {donor.notes && (
        <div style={{ fontSize: 13, color: C.onSurfaceVariant, background: C.surfaceLow, borderRadius: 10, padding: '8px 12px' }}>{donor.notes}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {donor.phone ? (
          <a href={`tel:${donor.phone}`} style={{ height: 48, borderRadius: 12, background: C.surfaceLow, color: C.onSurface, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'background 140ms' }}
            onMouseEnter={e => e.currentTarget.style.background = C.surfaceHigh}
            onMouseLeave={e => e.currentTarget.style.background = C.surfaceLow}
          >
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
            Call Now
          </a>
        ) : (
          <div style={{ height: 48, borderRadius: 12, background: C.surfaceLow, color: C.onSurfaceVariant, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>No phone</div>
        )}
        <button style={{ height: 48, borderRadius: 12, background: av ? C.primary : '#e5e7eb', color: av ? '#fff' : C.onSurfaceVariant, border: 0, fontSize: 14, fontWeight: 700, cursor: av ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'opacity 140ms' }}
          onMouseEnter={e => { if (av) e.currentTarget.style.opacity = 0.9; }}
          onMouseLeave={e => { if (av) e.currentTarget.style.opacity = 1; }}
        >
          Request Blood
        </button>
      </div>
    </div>
  );
}

/* ── Register Form ───────────────────────────────────────────────────────── */
function RegisterForm({ onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ blood_group: user?.blood_group || '', location: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inp = { width: '100%', background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 12, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', height: 48, transition: 'border-color 140ms, box-shadow 140ms', color: C.onSurface };
  const focus = e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primaryFixed}`; };
  const blur  = e => { e.target.style.borderColor = C.outlineVariant; e.target.style.boxShadow = 'none'; };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.blood_group || !form.location) return;
    setLoading(true); setError('');
    try {
      await donorAPI.register(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.onSurface, marginBottom: 8 }}>Blood Group <span style={{ color: C.primary }}>*</span></label>
        <select style={{ ...inp, cursor: 'pointer' }} value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })} required onFocus={focus} onBlur={blur}>
          <option value="">Select blood group</option>
          {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.onSurface, marginBottom: 8 }}>Location <span style={{ color: C.primary }}>*</span></label>
          <input style={inp} placeholder="e.g. Dhanmondi, Dhaka" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.onSurface, marginBottom: 8 }}>Phone Number</label>
          <input style={inp} type="tel" placeholder="+880 1..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onFocus={focus} onBlur={blur} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.onSurface, marginBottom: 8 }}>Notes (optional)</label>
        <textarea style={{ ...inp, height: 88, paddingTop: 12, paddingBottom: 12, resize: 'vertical' }} placeholder="Any notes for recipients…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} onFocus={focus} onBlur={blur} />
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" required style={{ width: 18, height: 18, marginTop: 2, accentColor: C.primary, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: C.onSurfaceVariant, lineHeight: 1.5 }}>I consent to share my blood group and location with people in need.</span>
      </label>
      {error && (
        <div style={{ padding: '10px 14px', background: C.primaryFixed, color: C.primaryDark, borderRadius: 10, fontSize: 13, border: `1px solid ${C.outlineVariant}` }}>{error}</div>
      )}
      <button type="submit" disabled={loading}
        style={{ width: '100%', height: 52, background: loading ? '#e5e7eb' : C.primary, color: loading ? C.onSurfaceVariant : '#fff', border: 0, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 140ms', boxShadow: loading ? 'none' : '0 6px 18px rgba(165,0,1,0.30)' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.primaryDark; }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.primary; }}
      >
        {loading
          ? <><div style={{ width: 16, height: 16, border: '2px solid #9ca3af', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Registering…</>
          : '🩸 Register as Donor'}
      </button>
    </form>
  );
}

/* ── Avatar lookup ──────────────────────────────────────────────────────── */
function loadOwnAvatar(user) {
  try {
    const key = `avatar_${user?.id || user?.email || 'guest'}`;
    const visKey = `avatar_show_in_donor_${user?.id || user?.email || 'guest'}`;
    const visible = localStorage.getItem(visKey) !== '0';
    if (!visible) return '';
    return localStorage.getItem(key) || '';
  } catch { return ''; }
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════════════════════════ */
export default function BloodDonor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ownAvatar = loadOwnAvatar(user);
  const [tab, setTab] = useState('search');
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bloodFilter, setBloodFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [searched, setSearched] = useState(false);
  const donorSectionRef = useRef(null);

  const scrollToDonors = () => {
    setTab('search');
    requestAnimationFrame(() => {
      donorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => { searchDonors(); }, []);
  useEffect(() => { if (tab === 'register' && user) loadMyProfile(); }, [tab, user]);

  const searchDonors = async () => {
    setLoading(true); setSearched(true);
    try {
      const params = { available_only: availableOnly };
      if (bloodFilter) params.blood_group = bloodFilter;
      if (locationFilter) params.location = locationFilter;
      const res = await donorAPI.search(params);
      setDonors(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadMyProfile = async () => {
    try { const res = await donorAPI.myProfile(); setMyProfile(res.data); } catch {}
  };

  const fieldStyle = { background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 12, padding: '0 16px', fontSize: 14, fontFamily: 'inherit', outline: 'none', height: 56, width: '100%', boxSizing: 'border-box', color: C.onSurface, transition: 'border-color 140ms, box-shadow 140ms' };
  const onFocus = e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primaryFixed}`; };
  const onBlur  = e => { e.target.style.borderColor = C.outlineVariant; e.target.style.boxShadow = 'none'; };

  const tabs = [
    { id: 'search',   icon: '🔍', label: 'Find a Donor' },
    { id: 'register', icon: '➕', label: 'Become a Donor' },
  ];

  return (
    <>
      <Topbar eyebrow="Community" title="Blood Donor Network">
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(186,26,26,0.10)', color: C.error, border: 0, borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.error, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Emergency: 999
        </button>
      </Topbar>

      <div style={{ flex: 1, overflowY: 'auto', background: C.surface }}>

        {/* ══════════════════ HERO ══════════════════ */}
        <section style={{ position: 'relative', height: 500, overflow: 'hidden', paddingTop: 48 }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <img src={HERO_BG} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4,
                       maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                       WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${C.surface}, transparent, rgba(249,249,255,0.2))` }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(165,0,1,0.10)', border: '1px solid rgba(165,0,1,0.20)', borderRadius: 999, marginBottom: 24 }}>
              <span style={{ fontSize: 14 }}>🩸</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>MediZen Blood Donor Network</span>
            </div>
            <h2 style={{ fontSize: 48, fontWeight: 800, color: C.onSurface, maxWidth: 768, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Save Lives, Find Donors
            </h2>
            <p style={{ fontSize: 18, color: C.onSurfaceVariant, maxWidth: 640, margin: '0 0 24px', lineHeight: 1.55 }}>
              Every 2 seconds someone needs blood. Connect with volunteer donors instantly or register to help save lives in your community.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={scrollToDonors}
                style={{ background: C.primary, color: '#fff', fontWeight: 700, fontSize: 14, padding: '16px 40px', borderRadius: 14, boxShadow: '0 20px 32px rgba(165,0,1,0.25)', border: 0, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 140ms' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                Find a Donor
              </button>
              <button onClick={() => setTab('register')}
                style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, color: C.onSurface, fontWeight: 700, fontSize: 14, padding: '16px 40px', borderRadius: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 140ms' }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHigh}
                onMouseLeave={e => e.currentTarget.style.background = C.surfaceLowest}
              >
                Become a Donor
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════ TABS + CONTENT ══════════════════ */}
        <section ref={donorSectionRef} style={{ padding: '40px 40px 80px', scrollMarginTop: 80 }}>
          <div style={{ maxWidth: 1024, margin: '0 auto' }}>

            {/* Unified card with tabs and form */}
            <div style={{ background: C.surfaceLowest, borderRadius: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: `1px solid ${C.outlineVariant}`, overflow: 'hidden' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.outlineVariant}` }}>
                {tabs.map(t => {
                  const active = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      style={{ flex: 1, padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: 0, borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent', background: 'transparent', color: active ? C.primary : C.onSurfaceVariant, transition: 'color 140ms, border-color 140ms' }}
                    >
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Search form (only when on search tab) */}
              {tab === 'search' && (
                <div style={{ padding: 40 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, alignItems: 'end' }}>
                    <div style={{ gridColumn: 'span 3' }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.onSurface, marginBottom: 12 }}>Blood Group</label>
                      <select value={bloodFilter} onChange={e => setBloodFilter(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">All Types</option>
                        {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 5' }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.onSurface, marginBottom: 12 }}>Location</label>
                      <div style={{ position: 'relative' }}>
                        <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, fill: C.outline }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        <input value={locationFilter} onChange={e => setLocationFilter(e.target.value)} placeholder="Enter city or area…" style={{ ...fieldStyle, paddingLeft: 44 }} onFocus={onFocus} onBlur={onBlur} onKeyDown={e => e.key === 'Enter' && searchDonors()} />
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 12, height: 56, cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} style={{ width: 22, height: 22, accentColor: C.primary }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.onSurface }}>Available Now</span>
                      </label>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <button onClick={searchDonors}
                        style={{ width: '100%', height: 56, background: C.primary, color: '#fff', border: 0, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(165,0,1,0.25)', transition: 'opacity 140ms' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                        onMouseLeave={e => e.currentTarget.style.opacity = 1}
                      >
                        Search Donors
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Register form panel (only when on register tab AND user is logged in AND not registered) */}
              {tab === 'register' && user && !registered && !myProfile && (
                <div style={{ padding: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: C.onSurface, lineHeight: 1.3, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                      Become a Lifesaver Today
                    </h2>
                    <p style={{ fontSize: 15, color: C.onSurfaceVariant, lineHeight: 1.65, margin: '0 0 28px' }}>
                      Join thousands of volunteers ready to step up in emergencies. Your single donation can save up to three lives.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {BENEFITS.map(b => (
                        <div key={b.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{ width: 46, height: 46, borderRadius: '50%', background: C.primaryFixed, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                            {b.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.onSurface, marginBottom: 4 }}>{b.title}</div>
                            <div style={{ fontSize: 13, color: C.onSurfaceVariant, lineHeight: 1.55 }}>{b.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <RegisterForm onSuccess={() => { setRegistered(true); loadMyProfile(); }} />
                </div>
              )}

              {tab === 'register' && !user && (
                <div style={{ padding: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.primaryFixed, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 24 }}>🩸</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: C.onSurface, marginBottom: 10 }}>Sign in to Become a Donor</div>
                  <div style={{ fontSize: 15, color: C.onSurfaceVariant, marginBottom: 32, maxWidth: 380, lineHeight: 1.6 }}>
                    Create a free account to register your blood type and help save lives in your community.
                  </div>
                  <button onClick={() => navigate('/login')}
                    style={{ height: 52, padding: '0 32px', background: C.primary, color: '#fff', border: 0, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(165,0,1,0.30)' }}>
                    Sign In / Register
                  </button>
                </div>
              )}

              {tab === 'register' && user && (registered || myProfile) && (
                <div style={{ padding: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✅</div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#166534', fontSize: 15 }}>You are a registered donor!</div>
                      <div style={{ fontSize: 13, color: '#15803d', marginTop: 2 }}>
                        Blood group: <b>{myProfile?.blood_group || user?.blood_group}</b> · {myProfile?.location}
                      </div>
                    </div>
                  </div>
                  {myProfile && (
                    <>
                      <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 700, color: C.onSurface }}>Your Donor Profile</div>
                      <div style={{ maxWidth: 400, marginBottom: 20 }}>
                        <DonorCard donor={{ ...myProfile, name: user?.name || 'You' }} avatar={ownAvatar} />
                      </div>
                      <button
                        onClick={async () => { await donorAPI.update({ available: !myProfile.available }); loadMyProfile(); }}
                        style={{ height: 44, padding: '0 22px', background: myProfile.available ? C.surfaceLow : C.primary, color: myProfile.available ? C.onSurface : '#fff', border: `1px solid ${myProfile.available ? C.outlineVariant : 'transparent'}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 140ms' }}>
                        {myProfile.available ? 'Mark as Unavailable' : 'Mark as Available'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Results — only on search tab */}
            {tab === 'search' && (
              <div style={{ marginTop: 48 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <h3 style={{ fontSize: 24, fontWeight: 600, color: C.onSurface, margin: 0 }}>
                    {loading ? 'Searching donors…' : `${donors.length} donor${donors.length !== 1 ? 's' : ''} found${donors.length ? ' near you' : ''}`}
                  </h3>
                  {donors.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.primary, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      View All
                      <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 0', gap: 14, color: C.onSurfaceVariant }}>
                    <div style={{ width: 36, height: 36, border: `3px solid ${C.primaryFixed}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                ) : donors.length === 0 && searched ? (
                  <div style={{ textAlign: 'center', padding: '72px 24px', background: C.surfaceLowest, borderRadius: 24, border: `1px solid ${C.outlineVariant}` }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>🩸</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: C.onSurface, marginBottom: 8 }}>No donors found</div>
                    <div style={{ fontSize: 14, color: C.onSurfaceVariant, marginBottom: 28 }}>Try a different blood group or location, or be the first to register!</div>
                    <button onClick={() => setTab('register')}
                      style={{ height: 46, padding: '0 28px', background: C.primary, color: '#fff', border: 0, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(165,0,1,0.25)' }}>
                      Become a Donor
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                    {donors.map(d => <DonorCard key={d.id} donor={d} avatar={d.user_id === user?.id ? ownAvatar : ''} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════ FOOTER ══════════════════ */}
        <footer style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px', borderTop: `1px solid ${C.outlineVariant}`, background: C.surfaceLow, gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>Blood Donor Network</span>
            <p style={{ margin: 0, fontSize: 12, color: C.onSurfaceVariant }}>© 2024 Blood Donor Network. Saving lives through community.</p>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Partner Hospitals'].map(link => (
              <a key={link} href="#" style={{ fontSize: 12, color: C.onSurfaceVariant, textDecoration: 'none', transition: 'color 140ms' }}
                onMouseEnter={e => e.currentTarget.style.color = C.primary}
                onMouseLeave={e => e.currentTarget.style.color = C.onSurfaceVariant}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </>
  );
}
