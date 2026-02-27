import React, { useState, useEffect } from 'react';
import { hashFile } from '../utils/hash';
import { getContractWithSigner, connectWallet } from '../utils/contract';
import {
    Plus, Clock, ShieldCheck, Upload, FileText, CheckCircle2,
    Loader2, Download, FileDown, Sparkles, RefreshCw, X, AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default function AdminPanel({ user }) {
    const [tab, setTab] = useState('issue'); // 'issue' | 'history'
    const [account, setAccount] = useState('');

    // Form State
    const [file, setFile] = useState(null);
    const [studentName, setStudentName] = useState('');
    const [courseName, setCourseName] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [university, setUniversity] = useState(user.company || 'Codex University');

    // UI State
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [stage, setStage] = useState('idle'); // 'idle' | 'success' | 'error'
    const [mintedCert, setMintedCert] = useState(null);
    const [history, setHistory] = useState([]);
    const [inputKey, setInputKey] = useState(Date.now()); // Key to reset input

    const token = localStorage.getItem('cv_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    useEffect(() => {
        fetchHistory();
        checkWallet();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${BACKEND}/certificates`, { headers });
            if (res.ok) setHistory(await res.json());
        } catch (e) { console.error(e); }
    };

    const checkWallet = async () => {
        if (window.ethereum) {
            const accs = await window.ethereum.request({ method: 'eth_accounts' });
            if (accs[0]) setAccount(accs[0]);
        }
    };

    const handleFileUpload = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setExtracting(true);
        setStage('idle');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch(`${BACKEND}/extract-data`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const aiData = await res.json();
                setStudentName(aiData.studentName || '');
                setCourseName(aiData.courseName || '');
                if (aiData.universityName) setUniversity(aiData.universityName);
            }
        } catch (e) {
            console.error("AI Extraction failed", e);
        } finally {
            setExtracting(false);
        }
    };

    const handleIssue = async (e) => {
        e.preventDefault();
        if (!account) return alert("Please connect your wallet first.");
        if (!file) return alert("Please upload a certificate first.");

        setLoading(true);
        try {
            // 1. Generate local hash
            let hash;
            try {
                hash = await hashFile(file);
            } catch (fileErr) {
                console.error("File Read Error:", fileErr);
                alert("Browser Error: Could not read your file. Please refresh the page and select the file again. (Permission issue)");
                setLoading(false);
                return;
            }

            // 2. Blockchain Transaction
            const contract = await getContractWithSigner();
            const tx = await contract.issueCertificate(hash);
            await tx.wait();

            // 3. Save to backend
            const res = await fetch(`${BACKEND}/certificates`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hash: hash,
                    studentName,
                    courseName,
                    txHash: tx.hash
                })
            });

            if (res.ok) {
                const certData = { hash, studentName, courseName, university, date: issueDate };
                setMintedCert(certData);
                setStage('success');
                fetchHistory();
                clearForm();
            }
        } catch (e) {
            console.error(e);
            alert(e.message || "Minting failed.");
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setFile(null);
        setStudentName('');
        setCourseName('');
        setInputKey(Date.now()); // Force file input reset
    };

    const generateSecurePDF = async (cert) => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // ── 1. Background Layer (Deep Navy) ──
        doc.setFillColor(7, 10, 25);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // ── 2. Decorative Double Border (Gold Gradient Effect) ──
        doc.setDrawColor(218, 165, 32); // Goldenrod
        doc.setLineWidth(2);
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'D'); // Outer
        doc.setLineWidth(0.5);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'D'); // Inner

        // ── 3. Corner Accents ──
        const accentSize = 25;
        doc.setDrawColor(184, 134, 11); // Dark Goldenrod
        doc.line(5, 5 + accentSize, 5 + accentSize, 5); // TL
        doc.line(pageWidth - 5, 5 + accentSize, pageWidth - 5 - accentSize, 5); // TR
        doc.line(5, pageHeight - 5 - accentSize, 5 + accentSize, pageHeight - 5); // BL
        doc.line(pageWidth - 5, pageHeight - 5 - accentSize, pageWidth - 5 - accentSize, pageHeight - 5); // BR

        // ── 4. Main Title ──
        doc.setTextColor(218, 165, 32);
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 45, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(200, 200, 200);
        doc.setFont('helvetica', 'normal');
        doc.text('GLOBAL BLOCKCHAIN VERIFICATION SYSTEM', pageWidth / 2, 53, { align: 'center', charSpace: 2 });

        // ── 5. Recipient Section ──
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text('This is to certify that', pageWidth / 2, 80, { align: 'center' });

        doc.setFontSize(48);
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.text((cert.studentName || 'Recipient').toUpperCase(), pageWidth / 2, 105, { align: 'center' });

        // ── 6. Course & Details ──
        doc.setDrawColor(218, 165, 32);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 60, 115, pageWidth / 2 + 60, 115);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 180, 180);
        doc.text('has successfully demonstrated proficiency in', pageWidth / 2, 130, { align: 'center' });

        doc.setFontSize(22);
        doc.setTextColor(218, 165, 32);
        doc.setFont('helvetica', 'bold');
        doc.text((cert.courseName || 'Professional Excellence').toUpperCase(), pageWidth / 2, 145, { align: 'center' });

        // ── 7. Verification Sidebar (Right) ──
        // QR Code Background
        doc.setFillColor(255, 255, 255, 0.05);
        doc.roundedRect(pageWidth - 75, pageHeight - 85, 60, 70, 4, 4, 'F');

        const verifyURL = `${window.location.origin}/verify?hash=${cert.hash}`;
        const qrDataUrl = await QRCode.toDataURL(verifyURL, {
            margin: 1,
            width: 500,
            color: { dark: '#000000', light: '#FFFFFF' }
        });
        doc.addImage(qrDataUrl, 'PNG', pageWidth - 70, pageHeight - 80, 50, 50);

        doc.setFontSize(8);
        doc.setTextColor(218, 165, 32);
        doc.setFont('helvetica', 'bold');
        doc.text('BLOCKCHAIN VERIFIED', pageWidth - 45, pageHeight - 25, { align: 'center' });
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('SCAN TO AUTHENTICATE', pageWidth - 45, pageHeight - 20, { align: 'center' });

        // ── 8. Footer Info ──
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('courier', 'normal');
        doc.text(`ISSUED BY: ${cert.university || 'VeriChain Academy'}`, 20, pageHeight - 30);
        doc.text(`HASH ID: ${cert.hash}`, 20, pageHeight - 25);
        doc.text(`DATE: ${cert.date || new Date().toLocaleDateString()}`, 20, pageHeight - 20);

        // ── 9. Institutional Seal (Iconic) ──
        doc.setDrawColor(218, 165, 32);
        doc.setLineWidth(1);
        doc.circle(50, 45, 12, 'D');
        doc.setFontSize(10);
        doc.text('SEAL', 50, 46, { align: 'center' });

        doc.save(`VeriChain_${cert.studentName || 'Student'}.pdf`);
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', color: 'white', padding: '0 20px' }}>

            {/* 1. Header Card (Codex University) */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 16
            }}>
                <div style={{
                    width: 48, height: 48, background: 'rgba(59,130,246,0.1)',
                    borderRadius: 12, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#3b82f6'
                }}>
                    <ShieldCheck size={28} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{university}</h2>
                        <span style={{
                            background: 'rgba(16,185,129,0.1)', color: '#10b981',
                            fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px',
                            borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4,
                            border: '1px solid rgba(16,185,129,0.2)'
                        }}>
                            <CheckCircle2 size={10} /> VERIFIED ISSUER
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: 'monospace' }}>
                        {account || 'x0... (Connect Wallet to verify address)'}
                    </div>
                </div>
                {!account && (
                    <button onClick={connectWallet} className="btn" style={{ background: '#f59e0b', color: 'white', border: 'none' }}>
                        Connect Wallet
                    </button>
                )}
            </div>

            {/* 2. Horizontal Tabs */}
            <div style={{
                display: 'flex', background: 'rgba(0,0,0,0.3)',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                padding: 4, marginBottom: 24
            }}>
                <button
                    onClick={() => setTab('issue')}
                    style={{
                        flex: 1, padding: '12px', border: 'none', borderRadius: 10, cursor: 'pointer',
                        background: tab === 'issue' ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: tab === 'issue' ? 'white' : 'rgba(255,255,255,0.4)',
                        fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.2s'
                    }}
                >
                    <Plus size={18} /> Issue Certificate
                </button>
                <button
                    onClick={() => setTab('history')}
                    style={{
                        flex: 1, padding: '12px', border: 'none', borderRadius: 10, cursor: 'pointer',
                        background: tab === 'history' ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: tab === 'history' ? 'white' : 'rgba(255,255,255,0.4)',
                        fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.2s'
                    }}
                >
                    <Clock size={18} /> History
                </button>
            </div>

            {/* 3. Content Area */}
            {tab === 'issue' && (
                <div className="card fade-up" style={{ padding: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Issue New Certificate</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: 32 }}>
                        Upload your original certificate document to add the verification QR.
                    </p>

                    <form onSubmit={handleIssue} style={{ display: 'grid', gap: 24 }}>
                        {/* File Upload */}
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10, display: 'block' }}>
                                Upload Original Document (PDF/Image)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    key={inputKey}
                                    type="file"
                                    onChange={handleFileUpload}
                                    style={{
                                        width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white'
                                    }}
                                />
                                {extracting && (
                                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 8, color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700 }}>
                                        <Loader2 size={16} className="spin" /> AI Is Reading...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name & Course Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10, display: 'block' }}>Student Name</label>
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    placeholder="Enter full name"
                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10, display: 'block' }}>Course Name</label>
                                <input
                                    type="text"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    placeholder="Enter course title"
                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
                                />
                            </div>
                        </div>

                        {/* Issue Date */}
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10, display: 'block' }}>Issue Date</label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
                            />
                        </div>

                        {/* Main Button */}
                        <button
                            type="submit"
                            disabled={loading || !file}
                            style={{
                                width: '100%', padding: '16px', background: '#3b82f6', border: 'none',
                                borderRadius: 8, color: 'white', fontWeight: 700, fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                opacity: (loading || !file) ? 0.6 : 1, cursor: (loading || !file) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={20} />}
                            {loading ? 'Securing on Blockchain...' : 'Secure & Sign'}
                        </button>
                    </form>

                    {/* Post-Success Action */}
                    {stage === 'success' && mintedCert && (
                        <div style={{ marginTop: 24, padding: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, textAlign: 'center' }}>
                            <p style={{ color: '#10b981', fontWeight: 700, marginBottom: 12 }}>✓ Certificate successfully secured!</p>
                            <button onClick={() => generateSecurePDF(mintedCert)} className="btn btn-primary" style={{ background: '#10b981', border: 'none' }}>
                                <FileDown size={18} /> Download Secure Certificate
                            </button>
                        </div>
                    )}
                </div>
            )}

            {tab === 'history' && (
                <div className="fade-up" style={{ display: 'grid', gap: 12 }}>
                    {history.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                            No certificates issued yet.
                        </div>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.02)' }}>
                                <FileText size={20} style={{ color: '#3b82f6' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700 }}>{item.student_name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{item.course_name} • {item.hash.slice(0, 20)}...</div>
                                </div>
                                <button onClick={() => generateSecurePDF({
                                    studentName: item.student_name,
                                    hash: item.hash,
                                    courseName: item.course_name,
                                    university: item.issued_by
                                })} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                                    <Download size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
