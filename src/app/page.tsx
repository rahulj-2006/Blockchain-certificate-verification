import VerificationForm from '@/components/verify/VerificationForm';
import { ShieldCheck, Zap, Lock, Globe } from 'lucide-react';

export const metadata = {
  title: 'CertChain — Blockchain Certificate Verification',
  description: 'Instantly verify the authenticity of any certificate on the Ethereum blockchain.',
};

const FEATURES = [
  { icon: ShieldCheck, title: 'Tamper-Proof', desc: 'Hashes stored on Ethereum — impossible to fake' },
  { icon: Zap, title: 'Instant Verify', desc: 'Results in seconds, no account needed' },
  { icon: Lock, title: 'Immutable', desc: 'Once issued, records can never be altered' },
  { icon: Globe, title: 'Public', desc: 'Anyone can verify, anywhere, anytime' },
];

export default function Home() {
  return (
    <div className="gradient-bg dot-pattern min-h-[calc(100vh-4rem)]">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 pt-16 pb-8 text-center">
        <div className="animate-fade-up stagger">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30
                          bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary
                          mb-6 animate-fade-up">
            <span className="status-dot online" />
            Live on Ethereum Sepolia
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl
                         leading-tight animate-fade-up">
            Verify Any{' '}
            <span className="gradient-text">Certificate</span>
            <br />in Seconds
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed animate-fade-up">
            Upload the certificate PDF or scan its QR code — we verify it
            directly on the blockchain. No login required.
          </p>
        </div>
      </section>

      {/* ── Verification Form ─────────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-12">
        <div className="mx-auto max-w-xl glass-card rounded-2xl p-6 sm:p-8 shadow-2xl animate-scale-in hover-lift">
          <VerificationForm />
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto stagger">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center p-4 rounded-xl border border-border/50
                         bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all
                         animate-fade-up hover-lift group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3
                              group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
