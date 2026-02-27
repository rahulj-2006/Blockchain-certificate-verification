import React, { useState } from 'react';
import { ShieldCheck, Award, Search, Users, Wallet } from 'lucide-react';

const roles = [
    {
        id: 'superadmin',
        icon: ShieldCheck,
        label: 'Super Admin',
        desc: 'Contract owner. Manage admins, revoke certificates, view all records.',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
        requiresWallet: true,
    },
    {
        id: 'admin',
        icon: Award,
        label: 'Admin / Issuer',
        desc: 'Authorized issuer. Upload and register certificates on the blockchain.',
        color: '#818cf8',
        bg: 'rgba(99,102,241,0.08)',
        border: 'rgba(99,102,241,0.25)',
        requiresWallet: true,
    },
    {
        id: 'user',
        icon: Search,
        label: 'Public Verify',
        desc: 'No wallet needed. Verify the authenticity of any certificate for free.',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.08)',
        border: 'rgba(16,185,129,0.25)',
        requiresWallet: false,
    },
];

export default function LandingPage({ onSelectRole }) {
    const [hoveredRole, setHoveredRole] = useState(null);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
        }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
                <div style={{
                    width: 52, height: 52,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                }}>
                    <ShieldCheck size={28} color="white" />
                </div>
                <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>ChainVerify</div>
                    <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Protocol 1.0</div>
                </div>
            </div>

            {/* Headline */}
            <div style={{ textAlign: 'center', marginBottom: 52, maxWidth: 520 }}>
                <h1 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 14 }}>
                    Who are you<br />
                    <span style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        logging in as?
                    </span>
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: '1rem', lineHeight: 1.6 }}>
                    Select your role to access the appropriate portal. Super Admin and Admin
                    logins require a connected MetaMask wallet.
                </p>
            </div>

            {/* Role cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 480 }}>
                {roles.map((role) => {
                    const Icon = role.icon;
                    const isHovered = hoveredRole === role.id;
                    return (
                        <button
                            key={role.id}
                            onMouseEnter={() => setHoveredRole(role.id)}
                            onMouseLeave={() => setHoveredRole(null)}
                            onClick={() => onSelectRole(role.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 18,
                                padding: '20px 24px',
                                background: isHovered ? role.bg : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isHovered ? role.border : 'rgba(255,255,255,0.07)'}`,
                                borderRadius: 18,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                transform: isHovered ? 'translateX(4px)' : 'none',
                                boxShadow: isHovered ? `0 8px 28px ${role.bg}` : 'none',
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                                background: role.bg,
                                border: `1px solid ${role.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon size={24} style={{ color: role.color }} />
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>{role.label}</span>
                                    {role.requiresWallet && (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '2px 8px', borderRadius: 999,
                                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                            fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-3)',
                                        }}>
                                            <Wallet size={10} /> Wallet required
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{role.desc}</div>
                            </div>

                            {/* Arrow */}
                            <div style={{ color: isHovered ? role.color : 'var(--text-3)', fontSize: '1.2rem', transition: 'color 0.2s' }}>›</div>
                        </button>
                    );
                })}
            </div>

            <p style={{ marginTop: 36, fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>
                © 2026 ChainVerify — Secured by Ethereum Smart Contracts
            </p>
        </div>
    );
}
