import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, User, Shield, Building2, Search, ArrowLeft } from 'lucide-react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function PortalCard({ title, desc, icon: Icon, color, onClick }) {
    return (
        <div className="card" onClick={onClick} style={{
            cursor: 'pointer', padding: 24, textAlign: 'center', transition: 'all 0.3s',
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
        }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = color; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                <Icon size={24} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: -4 }}>{title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{desc}</p>
            <div style={{ marginTop: 8, fontSize: '0.75rem', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enter Portal →</div>
        </div>
    );
}

function Field({ label, type, icon: Icon, value, onChange, placeholder, children }) {
    return (
        <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <Icon size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ paddingLeft: 40, paddingRight: children ? 44 : 16 }} />
                {children}
            </div>
        </div>
    );
}

export default function LoginPage({ onLogin }) {
    const [portal, setPortal] = useState(null); // null | 'user' | 'admin' | 'super'
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const ep = mode === 'register' ? '/auth/register' : '/auth/login';
            const body = mode === 'register' ? { name, email, password } : { email, password };
            const res = await fetch(`${BACKEND}${ep}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            localStorage.setItem('cv_token', data.token);
            onLogin(data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    // If no portal selected, show the 3 Entry Cards
    if (!portal) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 30px rgba(99,102,241,0.4)' }}>
                        <ShieldCheck size={36} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 8 }}>ChainVerify Portal</h1>
                    <p style={{ color: 'var(--text-3)', maxWidth: 460 }}>Choose your access point to the world's most secure blockchain certificate verification system.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, width: '100%', maxWidth: 900 }}>
                    <PortalCard title="Public Portal" desc="Verify any document and check authenticity in seconds." icon={Search} color="#10b981" onClick={() => setPortal('user')} />
                    <PortalCard title="Admin Portal" desc="Issue certificates and manage institutional records." icon={Building2} color="#6366f1" onClick={() => setPortal('admin')} />
                    <PortalCard title="Super Admin" desc="System governance, user roles, and global oversight." icon={Shield} color="#f59e0b" onClick={() => setPortal('super')} />
                </div>

                <p style={{ marginTop: 40, fontSize: '0.8rem', color: 'var(--text-3)' }}>© 2026 ChainVerify — Secured by Ethereum</p>
            </div>
        );
    }

    // Otherwise, show Login/Register Form
    const cfg = {
        user: { label: 'Public User', color: '#10b981' },
        admin: { label: 'Company Admin', color: '#6366f1' },
        super: { label: 'Super Admin', color: '#f59e0b' }
    }[portal];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <button onClick={() => setPortal(null)} style={{ position: 'absolute', top: 32, left: 32, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                <ArrowLeft size={18} /> Back to Portals
            </button>

            <div className="card" style={{ width: '100%', maxWidth: 420, padding: 36, borderTop: `4px solid ${cfg.color}` }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'inline-block', padding: '4px 12px', background: `${cfg.color}15`, color: cfg.color, borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>{cfg.label} Access</div>
                    <h2 style={{ fontWeight: 800 }}>{mode === 'login' ? 'Sign In' : 'Register Account'}</h2>
                </div>

                {portal === 'user' && (
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, marginBottom: 20 }}>
                        <button onClick={() => setMode('login')} style={{ flex: 1, padding: '8px', borderRadius: 9, background: mode === 'login' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Login</button>
                        <button onClick={() => setMode('register')} style={{ flex: 1, padding: '8px', borderRadius: 9, background: mode === 'register' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Register</button>
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {mode === 'register' && <Field label="Full Name" type="text" icon={User} value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder="Your name" />}
                    <Field label="Email Address" type="email" icon={Mail} value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="email@example.com" />
                    <Field label="Password" type={showPw ? 'text' : 'password'} icon={Lock} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="••••••••">
                        <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </Field>

                    {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(244,63,94,0.1)', color: '#fb7185', fontSize: '0.84rem' }}>{error}</div>}

                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ background: cfg.color, borderColor: cfg.color, marginTop: 8 }}>
                        {loading ? <Loader2 size={18} className="spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}
