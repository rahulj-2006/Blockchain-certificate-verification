'use client';

/**
 * VerificationForm.tsx — CertChain V2
 *
 * Three verification modes:
 *  1. Upload PDF/Image   — renders PDF → canvas → jsqr scan
 *  2. Camera QR Scan     — live camera via @zxing/browser
 *  3. Manual Entry       — type/paste Certificate ID directly
 *
 * QR scanning uses jsqr (reliable pixel-level scanner) instead of
 * BrowserQRCodeReader.decodeFromImageElement (often fails on canvas).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2, XCircle, Loader2, Camera, StopCircle, RotateCcw,
  ExternalLink, ShieldCheck, Upload, AlertTriangle, FileText,
} from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────
type Mode = 'choose' | 'scan' | 'upload' | 'manual';
type Status = 'idle' | 'scanning_pdf' | 'loading' | 'valid' | 'invalid' | 'error';

type CertResult = {
  studentName: string;
  courseName: string;
  issueDate: string;
  issuingUniversity: string;
  universityName: string;
  universityDomain: string;
  isRevoked: boolean;
  certificateId: string;
  transactionHash: string;
};

// ── Extract cert ID from QR text ──────────────────────────────────────────
function extractCertId(text: string): string {
  // Try to match a UUID from a verify URL: /verify/<uuid>
  const uuidMatch = text.match(/\/verify\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidMatch) return uuidMatch[1];
  // Try to match a bare UUID
  const bareUuid = text.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (bareUuid) return bareUuid[1];
  return text.trim();
}

// ── Scan QR from canvas using jsqr (reliable pixel-level scanner) ─────────
async function scanQrFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Try multiple crops of the canvas to find the QR (it's usually in the bottom-right)
  const { width, height } = canvas;

  const regions = [
    // Full image
    { sx: 0, sy: 0, sw: width, sh: height },
    // Bottom-right quadrant (where QR usually is in our cert template)
    { sx: Math.floor(width * 0.55), sy: Math.floor(height * 0.65), sw: Math.floor(width * 0.45), sh: Math.floor(height * 0.35) },
    // Bottom half
    { sx: 0, sy: Math.floor(height * 0.5), sw: width, sh: Math.floor(height * 0.5) },
    // Right half
    { sx: Math.floor(width * 0.5), sy: 0, sw: Math.floor(width * 0.5), sh: height },
  ];

  // Dynamic import so it doesn't break SSR
  const jsqr = (await import('jsqr')).default;

  for (const { sx, sy, sw, sh } of regions) {
    if (sw <= 0 || sh <= 0) continue;
    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const code = jsqr(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code?.data) {
      return extractCertId(code.data);
    }
  }
  return null;
}

// ── Render PDF page to canvas ─────────────────────────────────────────────
async function renderPdfToCanvas(file: File, scale = 3.0): Promise<HTMLCanvasElement | null> {
  try {
    // Dynamically import pdfjs-dist to avoid SSR issues
    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  } catch (err) {
    console.error('PDF render error:', err);
    return null;
  }
}

// ── Camera QR Scanner ─────────────────────────────────────────────────────
function CameraScanner({ onScan }: { onScan: (id: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');

  const start = useCallback(async () => {
    setCamError('');
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (!devices.length) throw new Error('No camera found.');
      const deviceId = devices[devices.length - 1].deviceId;

      const controls = await reader.decodeFromVideoDevice(
        deviceId, videoRef.current!,
        (result) => {
          if (result) {
            controlsRef.current?.stop();
            setScanning(false);
            onScan(extractCertId(result.getText()));
          }
        }
      );
      controlsRef.current = controls;
    } catch (err: unknown) {
      setCamError(err instanceof Error ? err.message : 'Camera error');
      setScanning(false);
    }
  }, [onScan]);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    setScanning(false);
  }, []);

  useEffect(() => () => { controlsRef.current?.stop(); }, []);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <Camera className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Camera preview</p>
          </div>
        )}
        {scanning && (
          <div className="absolute inset-8 border-2 border-primary/80 rounded pointer-events-none">
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary" />
          </div>
        )}
      </div>
      {camError && <p className="text-sm text-destructive text-center">{camError}</p>}
      <div className="flex justify-center">
        {!scanning
          ? <Button onClick={start} className="gap-2"><Camera className="h-4 w-4" /> Start Camera</Button>
          : <Button onClick={stop} variant="destructive" className="gap-2"><StopCircle className="h-4 w-4" /> Stop</Button>
        }
      </div>
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────────────────────
function ResultCard({ status, result, certId }: {
  status: 'valid' | 'invalid';
  result?: CertResult;
  certId: string;
}) {
  const ok = status === 'valid';
  return (
    <Card className={ok ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {ok ? <CheckCircle2 className="h-9 w-9 text-green-500 shrink-0" />
            : <XCircle className="h-9 w-9 text-red-500 shrink-0" />}
          <div className="flex flex-col gap-1">
            <span className="text-lg">Verification Result</span>
            <Badge className={ok ? 'bg-green-600 w-fit' : 'bg-red-600 w-fit'}>
              {ok ? '✓ Certificate Valid' : '✗ Not Found on Blockchain'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ok && result ? (
          <>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              {[
                { label: 'Student Name', value: result.studentName },
                { label: 'Course', value: result.courseName },
                { label: 'Issue Date', value: result.issueDate },
                { label: 'University', value: result.universityName || result.issuingUniversity.slice(0, 14) + '…' },
                { label: 'Cert ID', value: certId.slice(0, 18) + '…' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="font-medium break-all text-sm">{value}</p>
                </div>
              ))}
            </div>

            {result.transactionHash && (
              <>
                <Separator />
                <Button asChild variant="outline" size="sm" className="w-full gap-2">
                  <a href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> View On Etherscan
                  </a>
                </Button>
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <span>
              No matching certificate found on the blockchain for ID: <code className="text-xs bg-muted px-1 rounded">{certId.slice(0, 20)}…</code>
              <br />It may be fake, tampered, or not yet recorded.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function VerificationForm() {
  const { getReadContract } = useMetaMask();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('choose');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<CertResult | undefined>(undefined);
  const [certId, setCertId] = useState('');
  const [manualId, setManualId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pdfMsg, setPdfMsg] = useState('');

  // ── Core verify logic ─────────────────────────────────────────────────
  const verify = useCallback(async (id: string) => {
    const trimmedId = id.trim();
    if (!trimmedId) { setErrorMsg('Please enter a Certificate ID.'); return; }

    setCertId(trimmedId);
    setStatus('loading');
    setErrorMsg('');
    setResult(undefined);

    try {
      // Step 1: Check Firestore
      const snap = await getDoc(doc(db, 'certificates', trimmedId));
      if (!snap.exists()) { setStatus('invalid'); return; }

      const stored = snap.data();

      // Step 2: Verify on blockchain
      const contract = getReadContract();
      if (contract && stored.certificateHash) {
        const hashBytes32 = stored.certificateHash.startsWith('0x')
          ? stored.certificateHash
          : `0x${stored.certificateHash}`;
        try {
          const onChain = await contract.verifyCertificate(hashBytes32);
          const isRevoked = onChain[6] as boolean;
          const isValid = onChain[7] as boolean;

          if (!isValid || isRevoked) {
            setStatus('invalid');
            setResult({
              studentName: stored.studentName ?? '',
              courseName: stored.courseName ?? '',
              issueDate: stored.issueDate ?? '',
              issuingUniversity: String(onChain[3] ?? ''),
              universityName: String(onChain[4] ?? stored.universityName ?? ''),
              universityDomain: String(onChain[5] ?? ''),
              isRevoked,
              certificateId: trimmedId,
              transactionHash: stored.transactionHash ?? '',
            });
            return;
          }

          setStatus('valid');
          setResult({
            studentName: String(onChain[0]) || stored.studentName,
            courseName: String(onChain[1]) || stored.courseName,
            issueDate: stored.issueDate,
            issuingUniversity: String(onChain[3]),
            universityName: String(onChain[4]) || stored.universityName || '',
            universityDomain: String(onChain[5]) || '',
            isRevoked: false,
            certificateId: trimmedId,
            transactionHash: stored.transactionHash ?? '',
          });
          return;
        } catch {
          // Contract call failed → cert not found on-chain
          setStatus('invalid');
          return;
        }
      }

      // Firestore-only fallback (no RPC)
      setStatus('valid');
      setResult({
        studentName: stored.studentName ?? '',
        courseName: stored.courseName ?? '',
        issueDate: stored.issueDate ?? '',
        issuingUniversity: stored.universityWallet ?? '',
        universityName: stored.universityName ?? '',
        universityDomain: '',
        isRevoked: false,
        certificateId: trimmedId,
        transactionHash: stored.transactionHash ?? '',
      });
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setErrorMsg(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }, [getReadContract, toast]);

  // ── PDF / Image upload handler ────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

    setMode('upload');
    setStatus('scanning_pdf');
    setErrorMsg('');
    setResult(undefined);
    setPdfMsg(`Processing: ${file.name}`);

    try {
      let canvas: HTMLCanvasElement | null = null;

      if (file.type === 'application/pdf') {
        setPdfMsg('Rendering PDF pages…');
        // Try scale 3 first, then 5 for better resolution
        canvas = await renderPdfToCanvas(file, 3.0);
        if (!canvas) throw new Error('Could not render PDF. Make sure it is a valid PDF file.');
      } else if (file.type.startsWith('image/')) {
        // Render image to canvas
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(file);
        });
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = dataUrl;
        });
        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
      } else {
        throw new Error('Please upload a PDF or image file (PNG, JPG, etc.).');
      }

      if (!canvas) throw new Error('Could not read the file.');

      // Scan QR from canvas using jsqr
      setPdfMsg('Scanning for QR code…');
      let scannedId = await scanQrFromCanvas(canvas);

      // Try with higher scale if first attempt failed (PDF only)
      if (!scannedId && file.type === 'application/pdf') {
        setPdfMsg('Retrying with higher resolution…');
        const canvas2 = await renderPdfToCanvas(file, 6.0);
        if (canvas2) scannedId = await scanQrFromCanvas(canvas2);
      }

      if (!scannedId) {
        setStatus('idle');
        setMode('manual');
        setPdfMsg('');
        toast({
          title: '⚠️ QR Not Detected',
          description: 'Could not find a QR code in the file. Please enter the Certificate ID manually.',
          variant: 'destructive',
        });
        return;
      }

      setPdfMsg('');
      toast({ title: '✅ QR Detected!', description: `Certificate ID found` });
      await verify(scannedId);

    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'File processing failed';
      setErrorMsg(msg);
      setPdfMsg('');
    }
  };

  const reset = () => {
    setMode('choose');
    setStatus('idle');
    setResult(undefined);
    setCertId('');
    setManualId('');
    setErrorMsg('');
    setPdfMsg('');
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ---- Mode chooser ---- */}
      {mode === 'choose' && status === 'idle' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Upload PDF */}
          <label
            htmlFor="cert-file-upload"
            className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30
                       bg-card p-6 text-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
          >
            <FileText className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
            <div>
              <p className="font-semibold text-sm">Upload Certificate</p>
              <p className="text-xs text-muted-foreground mt-1">PDF or image — auto-scans QR</p>
            </div>
            <input
              id="cert-file-upload"
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => { handleFileUpload(e); }}
            />
          </label>

          {/* Camera scan */}
          <button
            id="verify-mode-camera-btn"
            onClick={() => setMode('scan')}
            className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30
                       bg-card p-6 text-center transition-all hover:border-primary hover:bg-primary/5"
          >
            <Camera className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
            <div>
              <p className="font-semibold text-sm">Scan QR Code</p>
              <p className="text-xs text-muted-foreground mt-1">Use your camera</p>
            </div>
          </button>

          {/* Manual entry */}
          <button
            id="verify-mode-manual-btn"
            onClick={() => setMode('manual')}
            className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30
                       bg-card p-6 text-center transition-all hover:border-primary hover:bg-primary/5"
          >
            <ShieldCheck className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
            <div>
              <p className="font-semibold text-sm">Enter ID Manually</p>
              <p className="text-xs text-muted-foreground mt-1">Paste Certificate ID</p>
            </div>
          </button>
        </div>
      )}

      {/* ---- PDF scanning progress ---- */}
      {status === 'scanning_pdf' && (
        <Card className="border-primary/20">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-semibold">Scanning Certificate…</p>
              <p className="text-sm text-muted-foreground mt-1">{pdfMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Camera mode ---- */}
      {mode === 'scan' && status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-5 w-5" /> Scan QR Code
            </CardTitle>
            <CardDescription>Point your camera at the QR code on the certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <CameraScanner onScan={(id) => { setMode('manual'); setManualId(id); verify(id); }} />
          </CardContent>
        </Card>
      )}

      {/* ---- Manual entry mode ---- */}
      {(mode === 'manual') && (status === 'idle' || status === 'error') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5" /> Verify Certificate
            </CardTitle>
            <CardDescription>Enter the Certificate ID printed on the certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); verify(manualId); }} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cert-id-input">Certificate ID</Label>
                <Input
                  id="cert-id-input"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="font-mono"
                  autoFocus
                />
              </div>

              {/* Also allow uploading from manual mode */}
              <div className="border-t pt-3">
                <Label htmlFor="cert-file-upload-manual" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-2 hover:text-foreground transition-colors">
                  <Upload className="h-4 w-4" />
                  Or upload the certificate PDF / image to auto-detect ID
                </Label>
                <input
                  id="cert-file-upload-manual"
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  onChange={handleFileUpload}
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{errorMsg}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  id="verify-submit-btn"
                  type="submit"
                  disabled={!manualId.trim()}
                  className="flex-1 gap-2"
                >
                  <ShieldCheck className="h-4 w-4" /> Verify
                </Button>
                <Button id="verify-reset-btn" type="button" variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ---- Blockchain loading ---- */}
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Querying the blockchain…</p>
        </div>
      )}

      {/* ---- Results ---- */}
      {(status === 'valid' || status === 'invalid') && (
        <div className="space-y-4">
          <ResultCard status={status} result={result} certId={certId} />
          <Button id="verify-again-btn" variant="outline" onClick={reset} className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> Verify Another Certificate
          </Button>
        </div>
      )}
    </div>
  );
}
