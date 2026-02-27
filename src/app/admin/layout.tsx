'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Loader2, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// No local Firebase initialization needed here.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setChecking(false);
            if (u) setUser(u);
            else router.replace('/login');
        });
        return () => unsub();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/login');
    };

    if (checking) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center gradient-bg">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                        <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Authenticating…</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* ── Admin sub-header ───────────────────────────────────── */}
            <div className="border-b border-border/50 bg-card/60 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">

                    {/* Left: Admin label */}
                    <div className="flex items-center gap-1">
                        <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="h-8 rounded-full text-xs gap-1.5 px-3"
                        >
                            <Link href="/admin">
                                <Shield className="h-3.5 w-3.5" />
                                Admin Dashboard
                            </Link>
                        </Button>
                    </div>

                    {/* Right: user email + logout */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1">
                            <span className="status-dot online" />
                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[160px]">
                                {user.email}
                            </span>
                        </div>
                        <Button
                            id="admin-logout-btn"
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="h-8 rounded-full text-xs gap-1.5 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Logout</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Page content ──────────────────────────────────────── */}
            {children}
        </div>
    );
}