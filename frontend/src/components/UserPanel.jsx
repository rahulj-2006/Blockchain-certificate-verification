import React, { useState, useEffect } from 'react';
import VerifyPage from './VerifyCertificate';
import { History, Search, LayoutDashboard, Clock, CheckCircle2, XCircle } from 'lucide-react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default function UserPanel({ user }) {
    const [tab, setTab] = useState('verify'); // 'verify' | 'history'
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('cv_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // In a real app, we'd have a /my-verify-logs endpoint
            const res = await fetch(`${BACKEND}/verify-logs`, { headers });
            if (res.ok) {
                const data = await res.json();
                // For a regular user, the backend should only return THEIR logs
                setHistory(data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (tab === 'history') fetchHistory();
    }, [tab]);

    const tabStyle = (t) => ({
        padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem',
        background: tab === t ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.04)',
        color: tab === t ? 'white' : 'var(--text-2)',
        boxShadow: tab === t ? '0 4px 15px rgba(16,185,129,0.25)' : 'none',
        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
    });

    return (
        <div className="page fade-up" style={{ maxWidth: 720 }}>
            {/* Welcome */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Welcome, {user.name}</h1>
                <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Public Verification Portal</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(0,0,0,0.25)', padding: 6, borderRadius: 16, border: '1px solid var(--border)' }}>
                <button style={tabStyle('verify')} onClick={() => setTab('verify')}><Search size={16} /> Verify Certificate</button>
                <button style={tabStyle('history')} onClick={() => setTab('history')}><History size={16} /> My Checks</button>
            </div>

            {/* Content */}
            {tab === 'verify' && <VerifyPage />}

            {tab === 'history' && (
                <div className="fade-up">
                    <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Your Verification History</h3>
                    {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Clock className="spin" /></div> :
                        history.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
                                <LayoutDashboard size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
                                <p>You haven't verified any certificates yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {history.map(log => (
                                    <div key={log.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: log.is_valid ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {log.is_valid ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#fb7185" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.cert_hash}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{log.issued_by || 'Unknown Issuer'}</div>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                                            {new Date(log.verified_at * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}
