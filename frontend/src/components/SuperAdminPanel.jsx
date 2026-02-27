import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Users, UserCheck, UserX, XCircle,
    CheckCircle2, AlertCircle, Loader2, Building2,
    RefreshCw, Shield, Search as SearchIcon,
    Activity, ExternalLink, Award, RotateCcw, UserPlus as UserPlusIcon
} from 'lucide-react';
import { getContractWithSigner, getReadOnlyContract } from '../utils/contract';
import { hashFile } from '../utils/hash';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
const ETHERSCAN_BASE = import.meta.env.VITE_RPC_URL?.includes('sepolia')
    ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';

const COMPANY_TYPES = ['University', 'College', 'School', 'Company', 'Institute', 'Other'];

export default function SuperAdminPanel({ user }) {
    const token = localStorage.getItem('cv_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const [tab, setTab] = useState('users');  // 'users' | 'revoke'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'user' | 'admin'

    // Promote modal state
    const [promoting, setPromoting] = useState(null); // user object
    const [promoCompany, setPromoCompany] = useState('');
    const [promoType, setPromoType] = useState('University');
    const [promoWallet, setPromoWallet] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoErr, setPromoErr] = useState('');

    // Revoke cert
    const [revokeHash, setRevokeHash] = useState('');
    const [revokeFile, setRevokeFile] = useState(null);
    const [revokeStatus, setRevokeStatus] = useState('');
    const [revokeMsg, setRevokeMsg] = useState('');

    // Transactions
    const [txns, setTxns] = useState([]);
    const [txLoading, setTxLoading] = useState(false);
    const [txErr, setTxErr] = useState('');

    const fetchTransactions = async () => {
        setTxLoading(true); setTxErr('');
        try {
            const contract = await getReadOnlyContract();
            const provider = contract.runner?.provider || contract.provider;
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 50000);
            const [issued, revoked, admins] = await Promise.all([
                contract.queryFilter(contract.filters.CertificateIssued?.() ?? {}, fromBlock).catch(() => []),
                contract.queryFilter(contract.filters.CertificateRevoked?.() ?? {}, fromBlock).catch(() => []),
                contract.queryFilter(contract.filters.AdminAdded?.() ?? {}, fromBlock).catch(() => []),
            ]);
            const all = [
                ...issued.map(e => ({ type: 'issued', hash: String(e.args?.[0] || ''), from: String(e.args?.[1] || ''), txHash: e.transactionHash, block: e.blockNumber })),
                ...revoked.map(e => ({ type: 'revoked', hash: String(e.args?.[0] || ''), from: String(e.args?.[1] || ''), txHash: e.transactionHash, block: e.blockNumber })),
                ...admins.map(e => ({ type: 'admin', hash: '', from: String(e.args?.[0] || ''), txHash: e.transactionHash, block: e.blockNumber })),
            ].sort((a, b) => b.block - a.block);
            setTxns(all);
        } catch (e) { setTxErr('Could not fetch events: ' + e.message); }
        finally { setTxLoading(false); }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/users`, { headers });
            if (res.ok) setUsers(await res.json());
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);
    useEffect(() => { if (tab === 'txns') fetchTransactions(); }, [tab]);

    const promote = async (u, role) => {
        if (role === 'admin' && !promoCompany.trim()) { setPromoErr('Company name is required'); return; }
        setPromoLoading(true); setPromoErr('');
        try {
            const res = await fetch(`${BACKEND}/users/${u.id}/role`, {
                method: 'PATCH', headers,
                body: JSON.stringify({ role, companyName: promoCompany, companyType: promoType, walletAddress: promoWallet }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setPromoting(null); setPromoCompany(''); setPromoWallet(''); setPromoType('University');
            fetchUsers();
        } catch (e) { setPromoErr(e.message); }
        finally { setPromoLoading(false); }
    };

    const demote = async (u) => {
        if (!confirm(`Remove admin access for ${u.name}?`)) return;
        await fetch(`${BACKEND}/users/${u.id}/role`, { method: 'PATCH', headers, body: JSON.stringify({ role: 'user' }) });
        fetchUsers();
    };

    const toggleActive = async (u) => {
        await fetch(`${BACKEND}/users/${u.id}/toggle`, { method: 'PATCH', headers });
        fetchUsers();
    };

    const handleRevoke = async (e) => {
        e.preventDefault();
        setRevokeStatus('loading'); setRevokeMsg('');
        try {
            let hash = revokeHash.trim();
            if (revokeFile && !hash) hash = await hashFile(revokeFile);
            if (!hash) throw new Error('Provide a hash or upload the file');
            const contract = await getContractWithSigner();
            const tx = await contract.revokeCertificate(hash);
            await tx.wait();
            setRevokeStatus('success'); setRevokeMsg('Certificate revoked on-chain successfully.');
            setRevokeHash(''); setRevokeFile(null);
        } catch (err) { setRevokeStatus('error'); setRevokeMsg(err.reason || err.message); }
    };

    // Filtered users
    const visible = users.filter(u => {
        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || u.role === filter;
        return matchSearch && matchFilter;
    });

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        regularUsers: users.filter(u => u.role === 'user').length,
    };

    const tabStyle = (t) => ({
        padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem',
        background: tab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)',
        color: tab === t ? 'white' : 'var(--text-2)',
        boxShadow: tab === t ? '0 3px 14px rgba(99,102,241,0.35)' : 'none',
        transition: 'all 0.18s',
    });

    const roleBadge = (role) => {
        const cfg = {
            superadmin: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b', label: 'Super Admin' },
            admin: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', color: '#818cf8', label: 'Admin' },
            user: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#10b981', label: 'User' },
        }[role] || {};
        return (
            <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                {cfg.label}
            </span>
        );
    };

    return (
        <div className="page fade-up" style={{ maxWidth: 860 }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 999, marginBottom: 10 }}>
                    <ShieldCheck size={13} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Super Admin</span>
                </div>
                <h1 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Control Centre</h1>
                <p style={{ color: 'var(--text-3)', fontSize: '0.84rem', marginTop: 4 }}>Manage user roles, admin access, and certificate validity.</p>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Total Users', value: stats.total, color: '#818cf8' },
                    { label: 'Company Admins', value: stats.admins, color: '#10b981' },
                    { label: 'Regular Users', value: stats.regularUsers, color: 'var(--text-2)' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 20px' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Contract Etherscan link */}
            {CONTRACT_ADDRESS && (
                <a href={`${ETHERSCAN_BASE}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, color: '#818cf8', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, marginBottom: 16 }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.16)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}>
                    <ExternalLink size={13} /> View Contract on Etherscan
                </a>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 4 }}>
                <button style={tabStyle('users')} onClick={() => setTab('users')}> <Users size={14} style={{ display: 'inline', marginRight: 5 }} />All Users</button>
                <button style={tabStyle('txns')} onClick={() => setTab('txns')}>  <Activity size={14} style={{ display: 'inline', marginRight: 5 }} />Transactions</button>
                <button style={tabStyle('revoke')} onClick={() => setTab('revoke')}><XCircle size={14} style={{ display: 'inline', marginRight: 5 }} />Revoke Cert</button>
            </div>

            {/* ── TAB: Users ── */}
            {tab === 'users' && (
                <div>
                    {/* Search + filter */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <SearchIcon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ paddingLeft: 38 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {['all', 'admin', 'user'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    style={{
                                        padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s',
                                        background: filter === f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                                        color: filter === f ? '#818cf8' : 'var(--text-3)',
                                        borderColor: filter === f ? 'rgba(99,102,241,0.3)' : 'transparent',
                                    }}>
                                    {f === 'all' ? 'All' : f === 'admin' ? 'Admins' : 'Users'}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchUsers} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
                        </button>
                    </div>

                    {/* User list */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
                            <Loader2 size={28} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                            Loading users…
                        </div>
                    ) : visible.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
                            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                            <p>{users.length === 0 ? 'No users registered yet.' : 'No users match your search.'}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {visible.map(u => (
                                <div key={u.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${u.is_active ? 'rgba(255,255,255,0.07)' : 'rgba(244,63,94,0.15)'}`,
                                    borderRadius: 14, padding: '14px 18px',
                                    opacity: u.is_active ? 1 : 0.55,
                                }}>
                                    {/* Avatar */}
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: u.role === 'admin' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem', fontWeight: 800, color: u.role === 'admin' ? '#818cf8' : 'var(--text-3)' }}>
                                        {u.name[0]?.toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.93rem' }}>{u.name}</span>
                                            {roleBadge(u.role)}
                                            {!u.is_active && <span style={{ padding: '1px 8px', borderRadius: 999, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185', fontSize: '0.68rem', fontWeight: 700 }}>Inactive</span>}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{u.email}</div>
                                        {u.company_name && <div style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: 2 }}><Building2 size={11} style={{ display: 'inline', marginRight: 3 }} />{u.company_name} · {u.company_type}</div>}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        {u.role === 'user' && (
                                            <button onClick={() => { setPromoting(u); setPromoErr(''); }}
                                                style={{ padding: '7px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, cursor: 'pointer', color: '#818cf8', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <Shield size={13} /> Make Admin
                                            </button>
                                        )}
                                        {u.role === 'admin' && (
                                            <button onClick={() => demote(u)}
                                                style={{ padding: '7px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, cursor: 'pointer', color: '#fb7185', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <UserX size={13} /> Remove Admin
                                            </button>
                                        )}
                                        <button onClick={() => toggleActive(u)}
                                            style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                                            {u.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Transactions ── */}
            {tab === 'txns' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>On-Chain Events (last 50,000 blocks)</div>
                        <button onClick={fetchTransactions} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                            <RefreshCw size={13} className={txLoading ? 'spin' : ''} /> Refresh
                        </button>
                    </div>

                    {txLoading ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
                            <Loader2 size={28} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                            Fetching blockchain events…
                        </div>
                    ) : txErr ? (
                        <div style={{ padding: '14px 16px', background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 14, color: '#fb7185', fontSize: '0.85rem', display: 'flex', gap: 8 }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {txErr}
                        </div>
                    ) : txns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
                            <Activity size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                            <p>No transactions found yet.</p>
                            <p style={{ fontSize: '0.82rem', marginTop: 6 }}>Issue a certificate to see it appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {txns.map((tx, i) => {
                                const cfg = {
                                    issued: { icon: <Award size={16} style={{ color: '#10b981' }} />, label: 'Certificate Issued', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#10b981' },
                                    revoked: { icon: <RotateCcw size={16} style={{ color: '#f43f5e' }} />, label: 'Certificate Revoked', bg: 'rgba(244,63,94,0.07)', border: 'rgba(244,63,94,0.2)', color: '#f43f5e' },
                                    admin: { icon: <UserPlusIcon size={16} style={{ color: '#818cf8' }} />, label: 'Admin Granted', bg: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.2)', color: '#818cf8' },
                                }[tx.type];
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 13 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {cfg.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: cfg.color, marginBottom: 2 }}>{cfg.label}</div>
                                            {tx.hash && <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Hash: {tx.hash}</div>}
                                            {tx.from && <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-3)' }}>By: {tx.from.slice(0, 10)}…{tx.from.slice(-6)}</div>}
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 1 }}>Block #{tx.block}</div>
                                        </div>
                                        <a href={`${ETHERSCAN_BASE}/tx/${tx.txHash}`} target="_blank" rel="noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, color: 'var(--text-3)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}
                                            onMouseOver={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                                            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                                            <ExternalLink size={12} /> Etherscan
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Revoke Certificate ── */}
            {tab === 'revoke' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Revoke a Certificate</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: 22 }}>
                        Permanently invalidates a certificate on-chain. Paste the hash or upload the original file.
                    </p>
                    <form onSubmit={handleRevoke} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input type="text" value={revokeHash} onChange={e => { setRevokeHash(e.target.value); setRevokeStatus(''); }}
                            placeholder="0x… certificate hash" style={{ fontFamily: 'monospace', fontSize: '0.84rem' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>or upload file</span>
                            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(0,0,0,0.25)', border: `1px dashed ${revokeFile ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, cursor: 'pointer', color: revokeFile ? '#fb7185' : 'var(--text-3)', fontSize: '0.84rem' }}>
                            <input type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setRevokeFile(e.target.files[0]); }} />
                            {revokeFile ? `📄 ${revokeFile.name}` : '📁 Click to upload certificate file'}
                        </label>
                        <button type="submit" disabled={revokeStatus === 'loading' || (!revokeHash && !revokeFile)}
                            style={{ padding: '12px', borderRadius: 12, border: '1px solid rgba(244,63,94,0.3)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem', background: 'rgba(244,63,94,0.1)', color: '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {revokeStatus === 'loading' ? <><Loader2 size={16} className="spin" /> Revoking…</> : <><XCircle size={16} /> Revoke Certificate</>}
                        </button>
                    </form>
                    {revokeMsg && (
                        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 8, background: revokeStatus === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', border: `1px solid ${revokeStatus === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, color: revokeStatus === 'success' ? '#10b981' : '#fb7185' }}>
                            {revokeStatus === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {revokeMsg}
                        </div>
                    )}
                </div>
            )}

            {/* ── Promote Modal ── */}
            {promoting && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 440, padding: '32px 28px' }}>
                        <h3 style={{ fontWeight: 800, marginBottom: 6, fontSize: '1.2rem' }}>Promote to Admin</h3>
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: 22 }}>
                            <strong>{promoting.name}</strong> ({promoting.email}) will be able to issue certificates.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Company / University Name *</label>
                                <input type="text" value={promoCompany} onChange={e => { setPromoCompany(e.target.value); setPromoErr(''); }} placeholder="e.g. Harvard University" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Type</label>
                                <select value={promoType} onChange={e => setPromoType(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'var(--text-1)', fontFamily: 'inherit', fontSize: '0.9rem', cursor: 'pointer', appearance: 'none' }}>
                                    {COMPANY_TYPES.map(t => <option key={t} value={t} style={{ background: '#1a1a2e' }}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Wallet Address (optional)</label>
                                <input type="text" value={promoWallet} onChange={e => setPromoWallet(e.target.value)} placeholder="0x… MetaMask address" style={{ fontFamily: 'monospace' }} />
                            </div>
                            {promoErr && (
                                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185', fontSize: '0.84rem', display: 'flex', gap: 8 }}>
                                    <AlertCircle size={15} style={{ flexShrink: 0 }} /> {promoErr}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button onClick={() => { setPromoting(null); setPromoCompany(''); setPromoErr(''); }}
                                    className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={() => promote(promoting, 'admin')} disabled={promoLoading || !promoCompany.trim()}
                                    className="btn btn-primary" style={{ flex: 2 }}>
                                    {promoLoading ? <><Loader2 size={16} className="spin" /> Promoting…</> : <><Shield size={16} /> Confirm Promote</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
