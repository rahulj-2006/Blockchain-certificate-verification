'use client';

/**
 * /admin/super/page.tsx
 *
 * Access is granted in two ways:
 *  1. Firebase Auth email === SUPER_ADMIN_EMAIL  (primary — login-based)
 *  2. MetaMask wallet === contract superAdmin()  (fallback — wallet-based)
 *
 * On-chain actions (verify/deactivate) still require MetaMask deployer wallet.
 */

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useMetaMask } from '@/hooks/useMetaMask';
import { CONTRACT_ADDRESS } from '@/lib/blockchain';
import SuperAdminPanel from '@/components/admin/SuperAdminPanel';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldX, Crown, Wallet } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'admin@certchain.edu';

// Shared Firebase auth used

type AccessState = 'loading' | 'denied' | 'granted';

export default function SuperAdminPage() {
  const { account, isConnected, connect } = useMetaMask();
  const [access, setAccess] = useState<AccessState>('loading');
  const [authEmail, setAuthEmail] = useState('');
  const [superAdmin, setSuperAdmin] = useState('');

  // ── Get Firebase Auth user ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setAuthEmail(user.email);
        if (user.email === SUPER_ADMIN_EMAIL) {
          setAccess('granted'); // email-based grant — no wallet needed to view
        }
      }
    });
    return () => unsub();
  }, []);

  // ── Fetch on-chain superAdmin address (for wallet-based fallback) ─────
  useEffect(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL;
    if (!rpcUrl) return;
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_call',
        params: [{ to: CONTRACT_ADDRESS, data: '0x2b2e05c1' }, 'latest'],
      }),
    })
      .then(r => r.json())
      .then((d: { result?: string }) => {
        if (d.result && d.result !== '0x') {
          setSuperAdmin(('0x' + d.result.slice(-40)).toLowerCase());
        }
      })
      .catch(() => { });
  }, []);

  // ── If email not matching, check wallet as fallback ───────────────────
  useEffect(() => {
    if (access === 'granted') return; // already granted by email
    if (!superAdmin) return;

    if (isConnected && account && account.toLowerCase() === superAdmin) {
      setAccess('granted');
    } else if (authEmail && authEmail !== SUPER_ADMIN_EMAIL) {
      // Logged in as a university admin, not super admin
      setAccess('denied');
    }
  }, [account, isConnected, superAdmin, authEmail, access]);

  // ── Timeout: if still loading after 5s with email known and not super → deny
  useEffect(() => {
    const t = setTimeout(() => {
      if (access === 'loading' && authEmail && authEmail !== SUPER_ADMIN_EMAIL) {
        setAccess('denied');
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [access, authEmail]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (access === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying super admin access…</p>
        </div>
      </div>
    );
  }

  // ── Access Denied ──────────────────────────────────────────────────────
  if (access === 'denied') {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <div className="glass-card rounded-2xl p-10 space-y-6 border-red-500/20">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldX className="h-9 w-9 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              This panel is only accessible to the super admin.
            </p>
            {authEmail && (
              <p className="mt-3 text-xs font-mono bg-muted/50 px-3 py-2 rounded-lg text-muted-foreground">
                Logged in as: {authEmail}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Access Granted ─────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl animate-fade-up">
      <SuperAdminPanel />
    </div>
  );
}
