import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { chatAPI } from './api/client';

import Sidebar from './components/Sidebar';
import Chat from './pages/Chat';
import ImageAnalysis from './pages/ImageAnalysis';
import Prescription from './pages/Prescription';
import TestReport from './pages/TestReport';
import DiseaseInsight from './pages/DiseaseInsight';
import Nearby from './pages/Nearby';
import BloodDonor from './pages/BloodDonor';
import Profile from './pages/Profile';
import Login from './pages/Login';
import MedicineStore from './pages/MedicineStore';

function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) loadSessions();
    else setSessions([]);
  }, [user]);

  const loadSessions = async () => {
    try {
      const res = await chatAPI.getSessions();
      setSessions(res.data);
    } catch {}
  };

  const handleNewChat = () => navigate('/');

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>
          </svg>
        </div>
        <div className="app-loading-text">MediZen</div>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2.5 }} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay — click to close sidebar */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        sessions={sessions}
        onNewChat={handleNewChat}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Chat onSessionsChange={loadSessions} />} />
          <Route path="/image" element={<RequireAuth><ImageAnalysis /></RequireAuth>} />
          <Route path="/prescription" element={<RequireAuth><Prescription /></RequireAuth>} />
          <Route path="/report" element={<RequireAuth><TestReport /></RequireAuth>} />
          <Route path="/disease" element={<DiseaseInsight />} />
          <Route path="/nearby" element={<Nearby />} />
          <Route path="/store" element={<MedicineStore />} />
          <Route path="/blood" element={<BloodDonor />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        </Routes>
      </div>

      {/* Mobile hamburger button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open navigation menu"
      >
        <svg viewBox="0 0 24 24">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}
