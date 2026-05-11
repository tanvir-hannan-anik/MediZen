import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'chat',         path: '/',            label: 'AI Chat',           icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> },
  { id: 'image',        path: '/image',       label: 'Image Analysis',    icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></> },
  { id: 'prescription', path: '/prescription',label: 'Prescriptions',     icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></> },
  { id: 'report',       path: '/report',      label: 'Lab Reports',       icon: <><path d="M8 2h8v4H8zM6 6h12v16H6z"/><path d="M10 12h4M10 16h4"/></> },
  { id: 'disease',      path: '/disease',     label: 'Disease Insight',   icon: <><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></> },
  { id: 'nearby',       path: '/nearby',      label: 'Nearby Services',   icon: <><path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="3"/></> },
  { id: 'store',        path: '/store',       label: 'Medicine Store',    icon: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></> },
  { id: 'blood',        path: '/blood',       label: 'Blood Donor',       icon: <path d="M12 2s7 7.6 7 13a7 7 0 0 1-14 0C5 9.6 12 2 12 2z"/> },
  { id: 'profile',      path: '/profile',     label: 'My Profile',        icon: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></> },
];

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  );
}

export default function Sidebar({ sessions = [], onNewChat, mobileOpen, onMobileClose }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleNavClick = () => {
    // Close mobile sidebar on navigation
    if (onMobileClose) onMobileClose();
  };

  return (
    <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <img
          src="/logo.png"
          alt="MediZen"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sidebar-brand-name">Medi<span>Zen</span></div>
          <div className="sidebar-brand-sub">AI health assistant</div>
        </div>
        {/* Close button (mobile only) */}
        <button
          onClick={onMobileClose}
          aria-label="Close menu"
          style={{ display: 'none', width: 28, height: 28, border: 0, background: 'var(--bg-hover)', borderRadius: 8, cursor: 'pointer', color: 'var(--fg-3)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          className="sidebar-close-btn"
        >
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' }}>
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* New chat */}
      <button className="sidebar-new-chat" onClick={() => { onNewChat(); handleNavClick(); }}>
        <svg viewBox="0 0 24 24"><path d="M3 12h18M12 3v18"/></svg>
        New conversation
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-eyebrow">Features</div>
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={handleNavClick}
            >
              <svg viewBox="0 0 24 24">{item.icon}</svg>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Recent chats */}
      {sessions.length > 0 && (
        <div>
          <div className="sidebar-eyebrow" style={{ marginTop: 10 }}>Recent chats</div>
          <div className="sidebar-history">
            {sessions.slice(0, 8).map((s) => (
              <button
                key={s.id}
                className="history-item"
                onClick={() => { navigate(`/?session=${s.id}`); handleNavClick(); }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, flexShrink: 0, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Dark mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--fg-4)', fontWeight: 500 }}>{dark ? 'Dark mode' : 'Light mode'}</span>
          <button
            className="sidebar-icon-btn"
            onClick={() => setDark(d => !d)}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 36, height: 20, borderRadius: 99,
              background: dark ? 'var(--brand-blue-600)' : 'var(--neutral-200)',
              border: 0, cursor: 'pointer', position: 'relative',
              transition: 'background 200ms', padding: 0,
            }}
          >
            <span style={{
              position: 'absolute', width: 16, height: 16, borderRadius: '50%',
              background: '#fff', top: 2, left: dark ? 18 : 2,
              transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,.25)',
            }} />
          </button>
        </div>

        {user ? (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div className="sidebar-user-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button
              className="sidebar-icon-btn"
              onClick={handleLogout}
              title="Sign out"
            >
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => { navigate('/login'); handleNavClick(); }}
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
            Sign in
          </button>
        )}
      </div>

      {/* Inline style to show close button on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </aside>
  );
}
