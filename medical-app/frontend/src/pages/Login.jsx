import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', blood_group: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register({
          email: form.email,
          password: form.password,
          name: form.name,
          blood_group: form.blood_group || null,
          phone: form.phone || null,
        });
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || (mode === 'login' ? 'Invalid email or password' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <h1>MediZen</h1>
          <p>Your AI-powered health companion</p>
        </div>

        <div className="login-form-card">
          {/* Mode tabs */}
          <div className="tab-switcher">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                className={mode === m ? 'active' : ''}
                onClick={() => { setMode(m); setError(''); }}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="col gap-md">
            {mode === 'register' && (
              <div>
                <label className="field-label">Full name *</label>
                <input className="field" placeholder="Your full name" value={form.name} onChange={update('name')} required />
              </div>
            )}
            <div>
              <label className="field-label">Email address *</label>
              <input className="field" type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
            </div>
            <div>
              <label className="field-label">Password *</label>
              <input className="field" type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required minLength={6} />
            </div>

            {mode === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label">Blood group</label>
                  <select className="field" value={form.blood_group} onChange={update('blood_group')}>
                    <option value="">Not sure</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input className="field" type="tel" placeholder="+880..." value={form.phone} onChange={update('phone')} />
                </div>
              </div>
            )}

            {error && (
              <div className="alert error">{error}</div>
            )}

            <button
              type="submit"
              className="btn primary lg"
              style={{ justifyContent: 'center', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.35)' }} />
              ) : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="divider" style={{ margin: '20px 0' }} />

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-4)', margin: 0, lineHeight: 1.6 }}>
            By continuing you agree this app provides <b>health information only</b> and is not a substitute for professional medical advice.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--fg-5)' }}>
          MediZen · For educational purposes only
        </p>
      </div>
    </div>
  );
}
