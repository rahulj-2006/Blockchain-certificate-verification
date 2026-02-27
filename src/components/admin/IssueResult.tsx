'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { RealQrCode } from '@/components/common/RealQrCode';

type CopyState = 'idle' | 'copied';

function CopyableInput({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const onCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        setCopyState('copied');
        toast({ title: 'Copied!', description: `${label} copied to clipboard.` });
        setTimeout(() => setCopyState('idle'), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({ 
        title: 'Copy Failed', 
        description: 'Your browser settings blocked clipboard access.', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input type="text" readOnly value={value} className="pr-10 font-mono text-xs" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
          onClick={onCopy}
        >
          {copyState === 'copied' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function IssueResult({ 
  certificateId, 
  transactionHash,
  onDownload 
}: { 
  certificateId: string; 
  transactionHash: string;
  onDownload?: () => void;
}) {
  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader>
        <CardTitle>Certificate Issued Successfully</CardTitle>
        <CardDescription>
          Recorded on the blockchain. Share the Certificate ID or the PDF with the student.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2 space-y-4">
          <CopyableInput label="Certificate ID" value={certificateId} />
          <CopyableInput label="Transaction Hash" value={transactionHash} />
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className='w-full'>
              <Link href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target='_blank' rel="noopener noreferrer">
                View on Etherscan <ExternalLink className='ml-2 h-4 w-4' />
              </Link>
            </Button>
            {onDownload && (
              <Button onClick={onDownload} className='w-full gap-2 bg-green-600 hover:bg-green-700'>
                <Download className='h-4 w-4' /> Download PDF
              </Button>
            )}
          </div>
          <Button asChild variant="ghost" className='w-full'>
            <Link href={`/verify/${certificateId}`} target='_blank'>
              Open Verification Page
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <RealQrCode value={certificateId} size={140} />
          </div>
          <p className="text-xs text-muted-foreground text-center">Scan ID to verify authenticity</p>
        </div>
      </CardContent>
    </Card>
  );
}
