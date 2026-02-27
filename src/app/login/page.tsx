import LoginForm from '@/components/auth/LoginForm';
import { Logo } from '@/components/common/Logo';
import { ShieldCheck, Lock } from 'lucide-react';

export const metadata = {
  title: 'Admin Login — CertChain',
  description: 'Secure login for university administrators',
};

export default function LoginPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 gradient-bg dot-pattern">

      {/* Background decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/8 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">

        {/* Logo + title above card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 animate-pulse-ring">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Secure access to the issuance dashboard
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <LoginForm />
        </div>

        {/* Features row */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground stagger animate-fade-in">
          {[
            { icon: '🔗', text: 'Blockchain-backed' },
            { icon: '🔒', text: 'Encrypted' },
            { icon: '✅', text: 'Auditable' },
          ].map(({ icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 animate-fade-up">
              <span>{icon}</span>
              <span>{text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
