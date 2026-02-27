import React, { useState, useCallback, useEffect } from 'react';
import {
    Search, ShieldAlert, CheckCircle2, Loader2, Calendar, User,
    ExternalLink, Lock, FileText, Upload, AlertCircle, Copy, Check, Hash
} from 'lucide-react';
import { hashFile } from '../utils/hash';
import { getReadOnlyContract } from '../utils/contract';
import QRScanner from './QRScanner';
import { Camera } from 'lucide-react';

export default function VerifyPage() {
    const [tab, setTab] = useState('file'); // 'file' | 'hash'
    const [file, setFile] = useState(null);
    const [drag, setDrag] = useState(false);
    const [manualHash, setManualHash] = useState('');
    const [generatedHash, setGeneratedHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const handleQRScan = (decodedText) => {
        setError('');
        // Extract hash if it's a URL like https://website.com/verify?hash=0x...
        let hash = decodedText.trim();

        // Handle URLs
        if (hash.includes('?')) {
            const urlParams = new URLSearchParams(hash.split('?')[1]);
            const h = urlParams.get('hash');
            if (h) hash = h;
        } else if (hash.includes('hash=')) {
            hash = hash.split('hash=')[1].split('&')[0];
        }

        if (hash.startsWith('0x') && hash.length >= 66) {
            setShowScanner(false);
            setTab('hash');
            setManualHash(hash);
            checkOnChain(hash);
        } else {
            // Keep scanner open so they can try again, but show error
            alert("This QR code does not contain a valid certificate hash (0x...)");
        }
    };

    // ── Blockchain check ─────────────────────────────────────────────────────────
    const checkOnChain = async (hash) => {
        if (!hash?.trim()) return;
        setLoading(true); setError(''); setResult(null);
        try {
            const contract = await getReadOnlyContract();
            const [isValid, issuer, timestamp] = await contract.verifyCertificate(hash.trim());
            setResult({
                isValid, issuer,
                date: isValid
                    ? new Date(Number(timestamp) * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                    : null,
                hash: hash.trim(),
            });
        } catch {
            setError('Could not connect to blockchain. Check your RPC URL in frontend/.env');
        } finally { setLoading(false); }
    };

    // ── Log verification to backend ──────────
    const logToBackend = async (hash, isValid, issuerAddr) => {
        const token = localStorage.getItem('cv_token');
        if (!token) return;
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/verify-log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ hash, isValid, issuedBy: issuerAddr }) // Note: Backend usually maps address to company name
            });
        } catch (e) { console.error("Logging failed", e); }
    };

    useEffect(() => {
        if (result) {
            logToBackend(result.hash, result.isValid, result.issuer);
        }
    }, [result]);

    // ── Check for URL parameters ──────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const hashFromUrl = params.get('hash');
        if (hashFromUrl && hashFromUrl.startsWith('0x')) {
            setTab('hash');
            setManualHash(hashFromUrl);
            checkOnChain(hashFromUrl);
        }
    }, []);

    // ── File drop & auto-process ─────────────────────────────────────────────────
    const processFile = useCallback(async (f) => {
        if (!f) return;
        setFile(f); setResult(null); setError(''); setGeneratedHash('');
        setLoading(true);
        try {
            const h = await hashFile(f);
            setGeneratedHash(h);
            await checkOnChain(h);
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    }, []);

    const onDrop = (e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    };

    const copyHash = () => {
        navigator.clipboard.writeText(generatedHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="page fade-up" style={{ maxWidth: 640 }}>

            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, marginBottom: 16 }}>
                    <Lock size={13} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Verify Portal</span>
                    <span className="badge badge-free">FREE</span>
                </div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: 10 }}>
                    Is this Certificate<br />
                    <span style={{ background: 'linear-gradient(135deg,#10b981,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Legit?
                    </span>
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto' }}>
                    Upload file or scan QR code — we'll check the blockchain instantly.
                </p>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => setShowScanner(true)} className="btn btn-ghost" style={{ borderRadius: 12, background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px' }}>
                        <Camera size={20} />
                        Scan QR Code
                    </button>
                    {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}
                </div>
            </div>

            {/* Tab toggle */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: 14, padding: 4, marginBottom: 24, gap: 4 }}>
                {[['file', '📄 Upload File'], ['hash', '🔑 Paste Hash']].map(([m, label]) => (
                    <button key={m}
                        onClick={() => { setTab(m); setResult(null); setError(''); setFile(null); setGeneratedHash(''); }}
                        style={{
                            flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, cursor: 'pointer',
                            fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem',
                            background: tab === m ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
                            color: tab === m ? 'white' : 'var(--text-2)',
                            boxShadow: tab === m ? '0 3px 14px rgba(16,185,129,0.3)' : 'none',
                            transition: 'all 0.18s',
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Upload File tab ── */}
            {tab === 'file' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Drop zone */}
                    <div
                        className={`drop-zone${drag ? ' drag' : ''}`}
                        style={{ padding: '36px 24px', cursor: 'pointer', borderColor: file ? 'rgba(16,185,129,0.4)' : undefined }}
                        onDragOver={e => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={onDrop}
                        onClick={() => document.getElementById('__vf__').click()}
                    >
                        <input id="__vf__" type="file" style={{ display: 'none' }}
                            onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); }} />

                        {file ? (
                            <>
                                <div style={{ width: 60, height: 60, background: 'rgba(16,185,129,0.12)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                    <FileText size={28} style={{ color: '#10b981' }} />
                                </div>
                                <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{file.name}</p>
                                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Click to change file</p>
                            </>
                        ) : (
                            <>
                                <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                    <Upload size={28} style={{ color: 'var(--text-3)' }} />
                                </div>
                                <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Drop the certificate file here</p>
                                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>PDF, PNG, JPG — must be the exact original file</p>
                            </>
                        )}
                    </div>

                    {/* Auto-generated hash display */}
                    {generatedHash && (
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Hash size={12} /> Generated Hash
                            </div>
                            <div className="hash-box">
                                {generatedHash}
                                <button className="copy-btn" onClick={copyHash}>
                                    {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 6 }}>
                                This is the unique fingerprint of your file. Share it for others to verify.
                            </p>
                        </div>
                    )}

                    {/* Loading state */}
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, color: '#818cf8', fontSize: '0.87rem' }}>
                            <Loader2 size={18} className="spin" />
                            {!generatedHash ? 'Computing hash from file…' : 'Checking blockchain…'}
                        </div>
                    )}
                </div>
            )}

            {/* ── Paste Hash tab ── */}
            {tab === 'hash' && (
                <form onSubmit={e => { e.preventDefault(); checkOnChain(manualHash); }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="section-title">Certificate Hash (starts with 0x…)</div>
                    <input
                        type="text"
                        value={manualHash}
                        onChange={e => { setManualHash(e.target.value); setResult(null); setError(''); }}
                        placeholder="0x3f4a8b2c…"
                        style={{ fontFamily: 'monospace', fontSize: '0.84rem' }}
                        autoFocus
                    />
                    <button type="submit" disabled={loading || !manualHash.trim()} className="btn btn-primary">
                        {loading ? <><Loader2 size={18} className="spin" /> Checking…</> : <><Search size={18} /> Check on Blockchain</>}
                    </button>
                </form>
            )}

            {/* Error */}
            {error && !loading && (
                <div style={{ display: 'flex', gap: 10, padding: '14px 16px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 14, color: '#fb7185', fontSize: '0.87rem', marginTop: 16 }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} /> {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className={result.isValid ? 'result-valid' : 'result-invalid'} style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: result.isValid ? 18 : 0 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: result.isValid ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {result.isValid
                                ? <CheckCircle2 size={26} style={{ color: '#10b981' }} />
                                : <ShieldAlert size={26} style={{ color: '#f43f5e' }} />}
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: result.isValid ? '#10b981' : '#f43f5e' }}>
                                {result.isValid ? 'Verified — Authentic ✓' : 'Not Found on Blockchain'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>
                                {result.isValid
                                    ? 'This certificate is registered and has not been tampered with.'
                                    : 'No matching record found. This file may be fake or unregistered.'}
                            </div>
                        </div>
                    </div>

                    {result.isValid && (
                        <>
                            <div className="divider" style={{ marginBottom: 14 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div className="info-row">
                                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calendar size={14} /> Date Issued
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{result.date}</span>
                                </div>
                                <div className="info-row">
                                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User size={14} /> Issuer Address
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-2)', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>{result.issuer}</span>
                                </div>
                                <div className="info-row">
                                    <span style={{ color: 'var(--text-2)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Hash size={14} /> Certificate Hash
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#818cf8', maxWidth: 220, textAlign: 'right', wordBreak: 'break-all' }}>{result.hash}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
