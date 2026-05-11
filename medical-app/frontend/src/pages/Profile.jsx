import { useState, useEffect, useRef, useMemo } from 'react';
import Topbar from '../components/Topbar';
import { authAPI, analyzeAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

/* ── History type config ──────────────────────────────────────────── */
const TYPE_META = {
  image:        { label: 'Image Analysis',  icon: 'image',       iconBg: '#eff6ff', iconFg: '#2563eb' },
  prescription: { label: 'Prescription',    icon: 'description', iconBg: '#f0fdf4', iconFg: '#0d9488' },
  report:       { label: 'Lab Report',      icon: 'analytics',   iconBg: '#fff7ed', iconFg: '#b45309' },
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

/* ── Avatar storage helpers (client-side, keyed per user) ─────────── */
const avatarKey       = (user) => `avatar_${user?.id || user?.email || 'guest'}`;
const donorVisKey     = (user) => `avatar_show_in_donor_${user?.id || user?.email || 'guest'}`;
const loadAvatar      = (user) => { try { return localStorage.getItem(avatarKey(user)) || ''; } catch { return ''; } };
const saveAvatar      = (user, dataUrl) => { try { localStorage.setItem(avatarKey(user), dataUrl); } catch {} };
const clearAvatar     = (user) => { try { localStorage.removeItem(avatarKey(user)); } catch {} };
const loadDonorVis    = (user) => { try { return localStorage.getItem(donorVisKey(user)) !== '0'; } catch { return true; } };
const saveDonorVis    = (user, on) => { try { localStorage.setItem(donorVisKey(user), on ? '1' : '0'); } catch {} };

/* ── Password modal ───────────────────────────────────────────────── */
function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.next !== form.confirm) { setError('New passwords do not match'); return; }
    if (form.next.length < 6) { setError('New password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword(form.current, form.next);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl border border-slate-100 w-full max-w-md p-8"
           style={{ boxShadow: '0px 20px 60px rgba(15,23,42,0.15)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Change Password</h3>
            <p className="text-sm text-slate-500 mt-1">Secure your account with a new password.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {success ? (
          <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-700">
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Password changed successfully!
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {[
              { label: 'Current Password', key: 'current', placeholder: 'Your current password' },
              { label: 'New Password',     key: 'next',    placeholder: 'Minimum 6 characters' },
              { label: 'Confirm Password', key: 'confirm', placeholder: 'Repeat new password' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-600">{label}</label>
                <input
                  type="password"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-slate-800 text-sm transition-all"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  onFocus={(e) => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.12)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ))}
            {error && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 16 }}>error</span>
                {error}
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
                {loading
                  ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_reset</span> Update Password</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Field component ──────────────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-500">{label}</label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function inputStyle(focused) {
  return {
    borderColor: focused ? '#0d9488' : '#e2e8f0',
    boxShadow: focused ? '0 0 0 3px rgba(13,148,136,0.12)' : 'none',
  };
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({
    name:        user?.name        || '',
    blood_group: user?.blood_group || '',
    phone:       user?.phone       || '',
    location:    user?.location    || '',
  });
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [editing, setEditing]       = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [focused, setFocused]       = useState('');

  /* history */
  const [history, setHistory]         = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [deletingId, setDeletingId]   = useState(null);
  const [clearing, setClearing]       = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setHistLoading(true);
    analyzeAPI.history()
      .then((res) => setHistory(res.data))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, []);

  const removeHistoryItem = async (id) => {
    setDeletingId(id);
    try {
      await analyzeAPI.deleteUpload(id);
      setHistory((h) => h.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllHistory = async () => {
    setClearing(true);
    try {
      await analyzeAPI.clearHistory();
      setHistory([]);
      setConfirmClear(false);
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  };

  /* avatar */
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(() => loadAvatar(user));
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showInDonor, setShowInDonor] = useState(() => loadDonorVis(user));

  useEffect(() => {
    setAvatar(loadAvatar(user));
    setShowInDonor(loadDonorVis(user));
  }, [user?.id, user?.email]);

  const toggleShowInDonor = (on) => {
    setShowInDonor(on);
    saveDonorVis(user, on);
  };

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');
    if (!file.type.startsWith('image/')) { setAvatarError('Please select an image file.'); return; }
    if (file.size > MAX_AVATAR_BYTES)    { setAvatarError('Image must be under 2 MB.');    return; }
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      saveAvatar(user, dataUrl);
      setAvatar(dataUrl);
      setAvatarUploading(false);
    };
    reader.onerror = () => { setAvatarError('Failed to read image.'); setAvatarUploading(false); };
    reader.readAsDataURL(file);
  };

  const onRemoveAvatar = () => {
    clearAvatar(user);
    setAvatar('');
    setAvatarError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile(form);
      updateUser(form);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const memberSince = useMemo(() => {
    const raw = user?.created_at || user?.createdAt;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }, [user]);

  const fieldProps = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
    onFocus: () => setFocused(key),
    onBlur: () => setFocused(''),
    disabled: !editing,
    style: editing
      ? inputStyle(focused === key)
      : { borderColor: '#e2e8f0', background: '#f8fafc', cursor: 'not-allowed' },
    className: `w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all ${editing ? 'text-slate-800' : 'text-slate-500'}`,
  });

  const resetForm = () => setForm({
    name:        user?.name || '',
    blood_group: user?.blood_group || '',
    phone:       user?.phone || '',
    location:    user?.location || '',
  });

  const cancelEdit = () => {
    resetForm();
    setEditing(false);
  };

  return (
    <>
      <Topbar eyebrow="Account" title="My Profile" />

      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div className="p-8 max-w-6xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── Left column ─────────────────────────────────────── */}
            <div className="lg:col-span-8 space-y-6">

              {/* Profile header card */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden relative group"
                   style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                <div className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity pointer-events-none"
                     style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.10) 0%, rgba(0,107,95,0.05) 100%)' }} />

                <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                  {/* Avatar with upload */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload profile photo"
                      className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-4xl font-extrabold relative cursor-pointer"
                      style={{
                        background: avatar ? '#fff' : 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                        color: '#fff',
                        fontFamily: 'Manrope, sans-serif',
                      }}
                    >
                      {avatar ? (
                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                      {/* hover overlay */}
                      <span
                        className="absolute inset-0 flex flex-col items-center justify-center text-xs font-bold gap-1 opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(15,23,42,0.55)', color: '#fff' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>photo_camera</span>
                        {avatar ? 'Change' : 'Upload'}
                      </span>
                      {avatarUploading && (
                        <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
                          <span className="w-7 h-7 rounded-full border-2 border-teal-200 border-t-teal-600" style={{ animation: 'spin 0.8s linear infinite' }} />
                        </span>
                      )}
                    </button>

                    {/* Camera badge */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload photo"
                      className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-md border-2 border-white transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>photo_camera</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickAvatar}
                    />
                  </div>

                  <div className="text-center md:text-left flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-slate-900 truncate" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {user?.name || 'User'}
                    </h2>
                    <p className="text-slate-500 mt-1 truncate flex items-center gap-1.5 justify-center md:justify-start">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
                      {user?.email}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                      {user?.blood_group && (
                        <span className="px-4 py-1.5 rounded-full bg-teal-100 text-teal-700 text-sm font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                          {user.blood_group}
                        </span>
                      )}
                      {user?.is_donor && (
                        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                          Blood donor
                        </span>
                      )}
                      {form.location && (
                        <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>location_on</span>
                          {form.location}
                        </span>
                      )}
                      {avatar && (
                        <button
                          type="button"
                          onClick={onRemoveAvatar}
                          className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                          Remove photo
                        </button>
                      )}
                    </div>
                    {avatarError && (
                      <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5 justify-center md:justify-start">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                        {avatarError}
                      </p>
                    )}

                    {/* Show photo in Blood Donor toggle */}
                    <div className="mt-5 flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-slate-100 max-w-md mx-auto md:mx-0">
                      <span className="material-symbols-outlined text-teal-600 flex-shrink-0" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">Show photo on Blood Donor profile</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Display your picture when people view your donor card.</p>
                      </div>
                      {/* Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showInDonor}
                        onClick={() => toggleShowInDonor(!showInDonor)}
                        className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
                        style={{ background: showInDonor ? '#0d9488' : '#cbd5e1' }}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform"
                          style={{ transform: showInDonor ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                      <span className={`text-xs font-bold w-8 text-center ${showInDonor ? 'text-teal-600' : 'text-slate-400'}`}>
                        {showInDonor ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal information form */}
              <div className="bg-white rounded-2xl border border-slate-100 p-8"
                   style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Personal Information</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {editing ? 'Editing — click save when you\'re done.' : 'Used to personalize your medical assistant.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saved && !editing && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Saved
                      </span>
                    )}
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        title="Edit information"
                        className="w-10 h-10 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-600 hover:text-teal-700 border border-teal-100 flex items-center justify-center transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                      </button>
                    )}
                  </div>
                </div>

                <form onSubmit={save} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Full Name" hint={form.name ? '' : 'required'}>
                      <input type="text" placeholder="Your full name" {...fieldProps('name')} />
                    </Field>

                    <Field label="Email Address" hint="locked">
                      <div className="relative">
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 outline-none text-slate-400 text-sm bg-slate-50 cursor-not-allowed"
                        />
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" style={{ fontSize: 18 }}>lock</span>
                      </div>
                    </Field>

                    <Field label="Blood Group">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                        <select
                          value={form.blood_group}
                          onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                          onFocus={() => setFocused('blood_group')}
                          onBlur={() => setFocused('')}
                          disabled={!editing}
                          style={editing ? inputStyle(focused === 'blood_group') : { borderColor: '#e2e8f0', background: '#f8fafc', cursor: 'not-allowed' }}
                          className={`w-full pl-12 pr-10 py-3 rounded-xl border outline-none text-sm transition-all appearance-none ${editing ? 'text-slate-800' : 'text-slate-500'}`}
                        >
                          <option value="">Not specified</option>
                          {BLOOD_GROUPS.map((bg) => <option key={bg}>{bg}</option>)}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" style={{ fontSize: 20 }}>expand_more</span>
                      </div>
                    </Field>

                    <Field label="Phone Number">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none" style={{ fontSize: 20 }}>call</span>
                        <input
                          type="tel"
                          placeholder="+880 17XX-XXXXXX"
                          {...fieldProps('phone')}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none text-slate-800 text-sm transition-all"
                        />
                      </div>
                    </Field>

                    <div className="md:col-span-2">
                      <Field label="Location">
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none" style={{ fontSize: 20 }}>location_on</span>
                          <input
                            type="text"
                            placeholder="City / area"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            onFocus={() => setFocused('location')}
                            onBlur={() => setFocused('')}
                            disabled={!editing}
                            style={editing ? inputStyle(focused === 'location') : { borderColor: '#e2e8f0', background: '#f8fafc', cursor: 'not-allowed' }}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none text-sm transition-all ${editing ? 'text-slate-800' : 'text-slate-500'}`}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {editing && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-5 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors mt-4"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        disabled={saving}
                        className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 mt-4"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restart_alt</span>
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-4"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        {saving
                          ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" style={{ animation: 'spin 0.8s linear infinite' }} />
                          : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span> Save changes</>}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* ── Right column ────────────────────────────────────── */}
            <div className="lg:col-span-4 space-y-6">

              {/* Upload history */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6"
                   style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Upload History</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{history.length} item{history.length === 1 ? '' : 's'}</p>
                  </div>
                  {history.length > 0 && !confirmClear && (
                    <button
                      onClick={() => setConfirmClear(true)}
                      title="Clear all history"
                      className="group relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 text-xs font-bold transition-all"
                    >
                      <span className="material-symbols-outlined transition-transform group-hover:scale-110" style={{ fontSize: 16 }}>delete_sweep</span>
                      Clear all
                    </button>
                  )}
                </div>

                {/* Inline confirm banner */}
                {confirmClear && (
                  <div className="mb-5 p-4 rounded-xl border border-red-100 bg-red-50">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-red-600" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>warning</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-red-800 leading-tight">Delete all history?</p>
                        <p className="text-xs text-red-600/80 mt-1 leading-relaxed">
                          This will permanently remove {history.length} upload{history.length === 1 ? '' : 's'}. This cannot be undone.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={clearAllHistory}
                            disabled={clearing}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 shadow-sm"
                          >
                            {clearing
                              ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white" style={{ animation: 'spin 0.8s linear infinite' }} /> Deleting…</>
                              : <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete_forever</span> Yes, delete all</>}
                          </button>
                          <button
                            onClick={() => setConfirmClear(false)}
                            disabled={clearing}
                            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {histLoading ? (
                  <div className="flex justify-center py-8">
                    <span className="w-8 h-8 rounded-full border-2 border-teal-100 border-t-teal-600" style={{ animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <span className="material-symbols-outlined text-slate-200" style={{ fontSize: 48 }}>folder_open</span>
                    <p className="text-sm text-slate-400">No uploads yet.</p>
                    <p className="text-xs text-slate-400">Upload images, prescriptions, or lab reports to see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {history.map((h) => {
                      const meta = TYPE_META[h.type] || { label: h.type, icon: 'description', iconBg: '#f1f5f9', iconFg: '#64748b' };
                      const isDeleting = deletingId === h.id;
                      return (
                        <div key={h.id}
                             className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                               style={{ background: meta.iconBg, color: meta.iconFg }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{meta.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{h.filename}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{meta.label}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>{new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => removeHistoryItem(h.id)}
                            disabled={isDeleting}
                            title="Remove from history"
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-red-500 hover:border-red-500 hover:text-white text-slate-400 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-100 disabled:cursor-not-allowed shadow-sm"
                          >
                            {isDeleting
                              ? <span className="w-4 h-4 rounded-full border-2 border-red-200 border-t-red-500 inline-block" style={{ animation: 'spin 0.8s linear infinite' }} />
                              : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6"
                   style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">At a glance</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                    <span className="material-symbols-outlined text-teal-600" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                    <p className="text-xs text-slate-500 mt-1">Blood group</p>
                    <p className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {form.blood_group || '—'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                    <p className="text-xs text-slate-500 mt-1">Donor</p>
                    <p className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {user?.is_donor ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 22 }}>calendar_month</span>
                    <p className="text-xs text-slate-500 mt-1">Member since</p>
                    <p className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {memberSince || '—'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 22 }}>verified</span>
                    <p className="text-xs text-slate-500 mt-1">Account</p>
                    <p className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Verified
                    </p>
                  </div>
                </div>
              </div>

              {/* Account security */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6"
                   style={{ boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Account Security</h4>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Account Sign-in</p>
                    <p className="text-xs text-green-600">Password protected</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPwModal(true)}
                  className="w-full py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-teal-200 hover:text-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                  Change Password
                </button>
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'rgba(239,68,68,0.2)', boxShadow: '0px 4px 20px rgba(15,23,42,0.05)' }}>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#ef4444' }}>Danger Zone</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Sign out of this device. Your data is preserved.
                </p>
                <button
                  onClick={logout}
                  className="w-full py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:bg-red-50"
                  style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                  Sign Out
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {showPwModal && <PasswordModal onClose={() => setShowPwModal(false)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
