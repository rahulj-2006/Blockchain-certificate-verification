'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useMetaMask } from '@/hooks/useMetaMask';
import { generateCertificatePdf } from '@/lib/generateCertificatePdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Loader2, Wallet, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles
} from 'lucide-react';
import { RealQrCode } from '@/components/common/RealQrCode';
import { uploadPdfToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { extractCertificateInfo } from '@/ai/flows/extract-certificate-info';

type Step = 'idle' | 'signing' | 'confirming' | 'generating' | 'uploading' | 'done' | 'error';

type IssuedCert = {
  certificateId: string;
  transactionHash: string;
  pdfDownloadUrl: string;
  pdfBlob: Blob;
  studentName: string;
  courseName: string;
  issueDate: string;
  universityName: string;
};

const STEPS = [
  { id: 'signing', label: 'Sign Transaction' },
  { id: 'confirming', label: 'Blockchain Confirm' },
  { id: 'generating', label: 'Secure PDF' },
  { id: 'uploading', label: 'Save Record' },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4 mb-6 bg-muted/30 rounded-lg">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${i < idx ? 'bg-green-500 text-white' :
            i === idx ? 'bg-primary text-white ring-4 ring-primary/20 animate-pulse' :
              'bg-muted-foreground/20 text-muted-foreground'
            }`}>
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === idx ? 'text-primary' : 'text-muted-foreground'}`}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && <div className="w-4 h-px bg-border hidden sm:block" />}
        </div>
      ))}
    </div>
  );
}

export default function CertificateForm() {
  const { account, isConnected, isCorrectNetwork, connect, getSignerContract, getReadContract } = useMetaMask();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [issuedCert, setIssuedCert] = useState<IssuedCert | null>(null);

  const [studentName, setStudentName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [onChainVerified, setOnChainVerified] = useState<boolean | null>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkOnChain = async () => {
      if (!account || !isConnected) {
        setOnChainVerified(null);
        return;
      }
      const contract = getReadContract();
      if (!contract) return;
      try {
        const uniInfo = await contract.getUniversity(account);
        if (uniInfo && uniInfo.wallet !== ethers.ZeroAddress) {
          setOnChainVerified(Number(uniInfo.status) === 1);
        } else {
          setOnChainVerified(false);
        }
      } catch (e) {
        setOnChainVerified(false);
      }
    };
    checkOnChain();
  }, [account, isConnected, getReadContract]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setErrorMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUri = event.target?.result as string;
        try {
          const extracted = await extractCertificateInfo({ fileDataUri: dataUri });
          setStudentName(extracted.studentName);
          setCourseName(extracted.courseName);
          setIssueDate(extracted.issueDate);
          toast({ title: 'AI Extraction Successful', description: 'Data auto-filled from document.' });
        } catch (aiErr) {
          toast({ title: 'Extraction Failed', description: 'Please enter details manually.', variant: 'destructive' });
        } finally {
          setIsExtracting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsExtracting(false);
    }
  };

  const calculateFileHash = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConnected || !account) {
      setErrorMsg('Connect your MetaMask wallet.');
      return;
    }

    if (!isCorrectNetwork) {
      setErrorMsg('Switch to Sepolia network.');
      return;
    }

    if (onChainVerified === false) {
      setErrorMsg('Your wallet is not authorized on-chain. Contact Super Admin.');
      return;
    }

    try {
      const contract = await getSignerContract();

      let uniName = '';
      try {
        const uni = await contract.getUniversity(account);
        uniName = uni.name as string;
      } catch (e) {
        setErrorMsg('Wallet is not recognized as a registered university on the blockchain.');
        return;
      }

      const certData = `${account}:${studentName}:${courseName}:${issueDate}:${Date.now()}`;
      const certBytes32 = ethers.keccak256(ethers.toUtf8Bytes(certData));
      const certId = crypto.randomUUID();
      const issueDateTs = Math.floor(new Date(issueDate).getTime() / 1000);

      setStep('signing');
      const tx = await contract.issueCertificate(certBytes32, studentName, courseName, issueDateTs);

      setStep('confirming');
      const receipt = await tx.wait();
      const txHash = receipt.hash as string;

      setStep('generating');

      const { pdfBlob } = await generateCertificatePdf({
        certificateId: certId,
        studentName,
        courseName,
        issueDate,
        universityName: uniName
      });

      const securedPdfHash = await calculateFileHash(pdfBlob);

      setStep('uploading');
      let pdfDownloadUrl = '';
      try {
        const safeName = studentName.replace(/\s+/g, '-').toLowerCase();
        const uploaded = await uploadPdfToCloudinary(pdfBlob, `${certId}-${safeName}`);
        pdfDownloadUrl = uploaded.secureUrl;
      } catch (uErr) {
        console.warn('Cloudinary upload skipped', uErr);
      }

      await setDoc(doc(db, 'certificates', certId), {
        studentName,
        courseName,
        issueDate,
        certificateHash: certBytes32,
        securedPdfHash,
        transactionHash: txHash,
        issuedAt: new Date().toISOString(),
        universityName: uniName,
        universityWallet: account,
        pdfUrl: pdfDownloadUrl,
        originalFileAttached: false,
      });

      setStep('done');
      setIssuedCert({
        certificateId: certId,
        transactionHash: txHash,
        pdfDownloadUrl,
        pdfBlob,
        studentName,
        courseName,
        issueDate,
        universityName: uniName,
      });

      setStudentName('');
      setCourseName('');
      setIssueDate('');
      toast({ title: 'Certificate Issued Successfully' });

    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.reason || err.message || 'Issuance failed');
    }
  };

  const downloadPdf = () => {
    if (!issuedCert) return;
    const url = URL.createObjectURL(issuedCert.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verified-certificate-${issuedCert.studentName.replace(/\s+/g, '-')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isProcessing = ['signing', 'confirming', 'generating', 'uploading'].includes(step);

  return (
    <div className="space-y-6">
      {onChainVerified === false && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Wallet Not Authorized</AlertTitle>
          <AlertDescription>
            Your account is whitelisted in our database, but your wallet ({account?.slice(0, 10)}...) is not yet authorized on the blockchain.
          </AlertDescription>
        </Alert>
      )}

      {!isConnected && (
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-4">
            <Wallet className="h-10 w-10 text-yellow-500" />
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold">MetaMask Required</p>
              <p className="text-sm text-muted-foreground">Connect your wallet to sign on-chain certificates.</p>
            </div>
            <Button onClick={connect}>Connect Wallet</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Issue New Certificate</CardTitle>
          <CardDescription>Upload an old certificate to auto-fill details using AI, or simply enter them manually. A clean, fresh PDF will be generated and signed on the blockchain.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-2">
              <Label htmlFor="doc-upload">Upload Document for AI Auto-Fill (Optional)</Label>
              <div className="relative">
                <Input
                  id="doc-upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isProcessing || isExtracting}
                  accept="application/pdf,image/*"
                />
                {isExtracting && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-primary animate-pulse flex items-center gap-1.5 font-medium bg-background/80 px-2 py-1 rounded">
                    <Sparkles className="h-3.5 w-3.5" /> Extracting details...
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Student Name</Label>
                <Input value={studentName} onChange={e => setStudentName(e.target.value)} required disabled={isProcessing} placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Course Name</Label>
                <Input value={courseName} onChange={e => setCourseName(e.target.value)} required disabled={isProcessing} placeholder="e.g. Bachelor of Science" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required disabled={isProcessing} />
            </div>

            {isProcessing && <StepIndicator current={step} />}

            {step === 'error' && errorMsg && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isProcessing || !isConnected || onChainVerified === false}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {STEPS.find(s => s.id === step)?.label}</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Generate & Sign Certificate</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {step === 'done' && issuedCert && (
        <Card className="border-green-500/30 bg-green-500/5 animate-in zoom-in-95">
          <CardHeader>
            <CardTitle className="text-green-500">Certificate Secured!</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-4">
              <div className="p-3 bg-background/50 border rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Blockchain ID</p>
                <p className="font-mono text-xs break-all">{issuedCert.certificateId}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadPdf} className="flex-1 bg-green-600">Download PDF</Button>
                <Button variant="outline" asChild className="flex-1">
                  <a href={`https://sepolia.etherscan.io/tx/${issuedCert.transactionHash}`} target="_blank">Etherscan</a>
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg">
              <RealQrCode value={issuedCert.certificateId} size={120} />
              <p className="text-[10px] mt-2 text-zinc-500">Scan ID to verify</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
