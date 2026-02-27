import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/IssueCertificate';
import UserPanel from './components/UserPanel';
import SuperAdminPanel from './components/SuperAdminPanel';
import { ShieldCheck, LogOut, Wallet, ExternalLink, Loader2 } from 'lucide-react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// ─── Wallet button ────────────────────
function WalletButton() {
  const [account, setAccount] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(acc => { if (acc[0]) setAccount(acc[0]); });
      window.ethereum.on('accountsChanged', acc => setAccount(acc[0] || ''));
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) return alert('MetaMask not installed');
    setConnecting(true);
    try {
      const acc = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(acc[0]);
    } catch { }
    finally { setConnecting(false); }
  };

  const short = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

  if (account) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>{short(account)}</span>
      </div>
      <a href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '6px 11px', color: '#818cf8' }}>
        <ExternalLink size={13} />
      </a>
    </div>
  );

  return (
    <button onClick={connect} disabled={connecting} className="btn btn-ghost btn-sm" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
      {connecting ? <Loader2 size={14} className="spin" /> : <Wallet size={14} />} {connecting ? '...' : 'Connect Wallet'}
    </button>
  );
}

function Navbar({ user, onLogout }) {
  const cfg = {
    superadmin: { label: 'Super Admin', color: '#f59e0b' },
    admin: { label: user?.company || 'Admin', color: '#6366f1' },
    user: { label: 'Verify Portal', color: '#10b981' },
  }[user?.role] || { label: 'Visitor', color: '#94a3b8' };

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <div className="nav-logo-icon"><ShieldCheck size={20} color="white" /></div>
        <div>
          <div className="nav-logo-text">ChainVerify</div>
          <div className="nav-logo-sub">Protocol 1.0</div>
        </div>
      </div>

      <div style={{ padding: '5px 14px', borderRadius: 999, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, fontSize: '0.7rem', fontWeight: 800, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {cfg.label}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
        {(user?.role === 'admin' || user?.role === 'superadmin') && <WalletButton />}
        <button onClick={onLogout} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cv_token');
    if (token) {
      fetch(`${BACKEND}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setUser(data); })
        .finally(() => setChecked(true));
    } else {
      setChecked(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cv_token');
    setUser(null);
  };

  // Check for public verification link (Guest Mode)
  const isPublicVerify = !user && new URLSearchParams(window.location.search).has('hash');

  if (!checked) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="spin" /></div>;

  if (isPublicVerify) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav className="navbar">
          <div className="nav-logo">
            <div className="nav-logo-icon" style={{ background: '#10b981' }}><ShieldCheck size={20} color="white" /></div>
            <div>
              <div className="nav-logo-text">ChainVerify</div>
              <div className="nav-logo-sub">Public Guest Reader</div>
            </div>
          </div>
          <button onClick={() => window.location.href = '/'} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
            <User size={14} /> Sign In
          </button>
        </nav>
        <main style={{ flex: 1, padding: '40px 24px' }}>
          <UserPanel user={{ name: 'Guest', role: 'user' }} />
        </main>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={d => setUser(d)} />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar user={user} onLogout={handleLogout} />

      <main style={{ flex: 1, padding: '40px 24px' }}>
        {user.role === 'superadmin' && <SuperAdminPanel user={user} />}
        {user.role === 'admin' && <AdminPanel user={user} />}
        {user.role === 'user' && <UserPanel user={user} />}
      </main>

      <footer style={{ textAlign: 'center', padding: '40px 24px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-3)' }}>
        © 2026 ChainVerify — Decentralized Certificate Ecosystem
      </footer>
    </div>
  );
}
