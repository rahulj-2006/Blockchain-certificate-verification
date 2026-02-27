import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Certificate } from '@/lib/types';
import Link from 'next/link';
import { Button } from '../ui/button';

type VerifyState = {
  status: 'success_valid' | 'success_invalid';
  message: string;
  data?: Certificate;
};

export default function VerificationResult({ state }: { state: VerifyState }) {
  const isValid = state.status === 'success_valid';

  return (
    <Card className={isValid ? 'border-green-500/50' : 'border-red-500/50'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          {isValid ? (
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          ) : (
            <XCircle className="h-10 w-10 text-red-500" />
          )}
          <div className='flex flex-col gap-1'>
            <span className="text-2xl">Verification Result</span>
            <Badge variant={isValid ? 'default' : 'destructive'} className={isValid ? 'bg-green-600' : ''}>
              {isValid ? 'Certificate Valid' : 'Certificate Invalid'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{state.message}</p>
        {isValid && state.data && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Student Name:</span>
                <span className="font-mono">{state.data.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Course:</span>
                <span className="font-mono">{state.data.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Issue Date:</span>
                <span className="font-mono">{state.data.issueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Certificate ID:</span>
                <span className="font-mono truncate">{state.data.id}</span>
              </div>
               <div className="pt-2">
                 <Button asChild variant="outline" className="w-full">
                    <Link href={`/verify/${state.data.id}`} target='_blank'>
                        View Certificate Details <ExternalLink className='ml-2 h-4 w-4' />
                    </Link>
                 </Button>
               </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
