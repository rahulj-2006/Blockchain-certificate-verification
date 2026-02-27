'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Super admin gets redirected to /admin/super
      const isSuperAdmin = credential.user.email === 'admin@certchain.edu';
      router.push(isSuperAdmin ? '/admin/super' : '/admin');
    } catch (err: unknown) {
      setIsLoading(false);
      const code = (err as { code?: string }).code ?? '';
      if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(code)) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a few minutes.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Contact the platform admin.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection.');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@university.edu"
            required
            autoComplete="email"
            disabled={isLoading}
            className="pl-10 h-11 bg-muted/50 border-border/60 focus:border-primary/60 focus:bg-background transition-all rounded-xl"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="password"
            name="password"
            type={showPass ? 'text' : 'password'}
            required
            placeholder="••••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            className="pl-10 pr-10 h-11 bg-muted/50 border-border/60 focus:border-primary/60 focus:bg-background transition-all rounded-xl"
          />
          <button
            type="button"
            onClick={() => setShowPass(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive animate-fade-up">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <Button
        id="login-submit-btn"
        type="submit"
        className="w-full h-11 rounded-xl font-semibold text-sm gap-2 glow-primary"
        disabled={isLoading}
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
        ) : (
          <><Lock className="h-4 w-4" /> Sign In</>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Authorized university administrators only
      </p>
    </form>
  );
}
