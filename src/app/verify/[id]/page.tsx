import { getCertificateById } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, ExternalLink, ShieldAlert, ShieldCheck,
  GraduationCap, Calendar, Hash, Building2, FileDown,
} from 'lucide-react';
import Link from 'next/link';

type Props = { params: Promise<{ id: string }> };

export default async function VerifyCertificatePage({ params }: Props) {
  const { id } = await params;
  const certificate = await getCertificateById(id);

  /* ── Not found ── */
  if (!certificate) {
    return (
      <div className="min-h-[calc(100vh-8rem)] gradient-bg dot-pattern flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center space-y-6 glow-red animate-scale-in">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-9 w-9 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-red-400">Certificate Not Found</h1>
            <p className="text-sm text-muted-foreground mt-2">
              No certificate found for ID:
            </p>
            <code className="text-xs font-mono bg-muted px-3 py-1.5 rounded-lg mt-2 inline-block break-all">
              {id}
            </code>
          </div>
          <Button asChild variant="outline" className="rounded-full gap-2">
            <Link href="/">← Verify Another</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Found ── */
  return (
    <div className="min-h-[calc(100vh-8rem)] gradient-bg dot-pattern py-12 px-4">

      {/* Background decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute top-1/4 -left-32 h-80 w-80 rounded-full bg-green-500/8 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative container mx-auto max-w-2xl animate-fade-up">

        {/* Valid badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30
                          bg-green-500/10 px-5 py-2 text-sm font-medium text-green-400 mb-4 glow-green">
            <CheckCircle2 className="h-4 w-4" />
            Verified on Ethereum Blockchain
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Certificate of <span className="gradient-text">Completion</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            This certificate is authentic and its integrity is secured on-chain.
          </p>
        </div>

        {/* Main card */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl glow-green">

          {/* Green header banner */}
          <div className="bg-gradient-to-r from-green-900/40 via-green-800/20 to-emerald-900/40 border-b border-green-500/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="bg-green-600/80 text-white border-0 gap-1.5 mb-3">
                  <CheckCircle2 className="h-3.5 w-3.5" /> VALID CERTIFICATE
                </Badge>
                <p className="text-2xl font-bold">{certificate.studentName}</p>
                <p className="text-muted-foreground text-sm mt-1">Certificate Recipient</p>
              </div>
              <div className="w-16 h-16 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="p-6 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Course */}
              <div className="rounded-xl bg-muted/40 p-4 flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Course / Degree</p>
                  <p className="font-semibold mt-0.5">{certificate.courseName}</p>
                </div>
              </div>

              {/* Date */}
              <div className="rounded-xl bg-muted/40 p-4 flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Issue Date</p>
                  <p className="font-semibold mt-0.5">{certificate.issueDate}</p>
                </div>
              </div>

              {/* University */}
              {certificate.universityName && (
                <div className="rounded-xl bg-muted/40 p-4 flex items-start gap-3 sm:col-span-2">
                  <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Issuing Institution</p>
                    <p className="font-semibold mt-0.5">{certificate.universityName}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator className="opacity-40" />

            {/* Technical verification details */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                On-Chain Proof
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certificate ID</p>
                    <p className="font-mono text-xs truncate">{certificate.id}</p>
                  </div>
                </div>

                {certificate.certificateHash && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certificate Hash (keccak256)</p>
                      <p className="font-mono text-xs truncate">{certificate.certificateHash}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {certificate.transactionHash && (
                <Button asChild className="flex-1 gap-2 rounded-xl">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${certificate.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" /> View on Etherscan
                  </a>
                </Button>
              )}

              {certificate.pdfUrl && (
                <Button asChild variant="outline" className="flex-1 gap-2 rounded-xl">
                  <a href={certificate.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <FileDown className="h-4 w-4" /> Download Certificate
                  </a>
                </Button>
              )}

              <Button asChild variant="ghost" className="flex-1 gap-2 rounded-xl">
                <Link href="/">← Verify Another</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
