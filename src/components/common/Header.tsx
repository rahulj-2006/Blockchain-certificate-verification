'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, Menu, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { WalletButton } from '@/components/common/WalletButton';
import { useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isVerify = pathname?.startsWith('/verify') || pathname === '/';
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      {/* Subtle top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md group-hover:bg-primary/30 transition-all" />
            <Logo className="relative h-8 w-8 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Cert<span className="text-primary">Chain</span>
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="hidden sm:flex items-center gap-2">
          <Button
            asChild
            variant={isVerify ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 rounded-full"
          >
            <Link href="/">
              <ShieldCheck className="h-4 w-4" />
              Verify
            </Link>
          </Button>

          {isAdmin ? (
            <WalletButton />
          ) : (
            <Button asChild size="sm" className="gap-2 rounded-full glow-primary">
              <Link href="/login">
                <Lock className="h-4 w-4" />
                Admin Login
              </Link>
            </Button>
          )}
        </nav>

        {/* ── Mobile hamburger ── */}
        <button
          className="sm:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {open && (
        <div className="sm:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-2">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => setOpen(false)}>
            <Link href="/"><ShieldCheck className="h-4 w-4" />Verify Certificate</Link>
          </Button>
          {isAdmin
            ? <div className="pt-1"><WalletButton /></div>
            : (
              <Button asChild size="sm" className="w-full gap-2" onClick={() => setOpen(false)}>
                <Link href="/login"><Lock className="h-4 w-4" />Admin Login</Link>
              </Button>
            )
          }
        </div>
      )}
    </header>
  );
}
