'use client';

/**
 * CertificateList.tsx
 * Shows a table of certificates issued by the current university.
 */

import { Certificate } from '@/lib/types';
import { generateCertificatePdf } from '@/lib/generateCertificatePdf';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, Download, User, Calendar, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CertificateList({ certificates }: { certificates: Certificate[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDownload = async (cert: Certificate) => {
    if (cert.pdfUrl) {
      window.open(cert.pdfUrl, '_blank');
      return;
    }

    try {
      setIsGenerating(cert.id);
      const { pdfBlob } = await generateCertificatePdf({
        certificateId: cert.id,
        studentName: cert.studentName,
        courseName: cert.courseName,
        issueDate: cert.issueDate,
        universityName: cert.universityName || 'University',
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verified-certificate-${cert.studentName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF Generation Error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Download Failed', description: `Could not generate certificate PDF: ${errMsg}`, variant: 'destructive' });
    } finally {
      setIsGenerating(null);
    }
  };

  const filtered = certificates.filter(c =>
    c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name, course, or ID..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[200px]">Student / Course</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Blockchain Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  {searchTerm ? 'No matching certificates found.' : 'No certificates issued yet.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cert) => (
                <TableRow key={cert.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <User className="h-3 w-3 text-primary" /> {cert.studentName}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3 w-3" /> {cert.courseName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {cert.issueDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit bg-green-500/5 text-green-600 border-green-500/20 text-[10px]">
                        ✓ CONFIRMED
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                        {cert.transactionHash.slice(0, 15)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View Verification Page">
                        <Link href={`/verify/${cert.id}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-2"
                        title="Download Secured PDF"
                        onClick={() => handleDownload(cert)}
                        disabled={isGenerating === cert.id}
                      >
                        {isGenerating === cert.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span className="hidden sm:inline">
                          {isGenerating === cert.id ? 'Wait...' : 'Download'}
                        </span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
