'use client';

import { useState } from 'react';
import { useUser } from '@/firebase/provider';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Wallet } from 'lucide-react';

export default function UniversityRegistration({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const walletAddress = formData.get('walletAddress') as string;
    const name = formData.get('name') as string;
    const emailDomain = formData.get('emailDomain') as string;

    try {
      // Create a registration document in Firestore
      // We use the wallet address as the ID to prevent duplicates
      await setDoc(doc(db, 'universities', walletAddress.toLowerCase()), {
        name,
        emailDomain,
        walletAddress: walletAddress.toLowerCase(),
        status: 'pending',
        adminUid: user.uid,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Registration Submitted',
        description: 'Your university details have been sent to the Super Admin for verification.',
      });
      onSubmitted();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> University Onboarding
        </CardTitle>
        <CardDescription>
          Submit your institution details for verification. Once approved, you can issue blockchain-secured certificates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">University Name</Label>
            <Input id="name" name="name" placeholder="e.g., Jain University" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailDomain">Official Email Domain</Label>
            <Input id="emailDomain" name="emailDomain" placeholder="e.g., jainuniversity.ac.in" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="walletAddress">Official Wallet Address (MetaMask)</Label>
            <div className="flex gap-2">
              <Input id="walletAddress" name="walletAddress" placeholder="0x..." required className="font-mono" />
              <Button type="button" variant="outline" size="icon" title="Connect Wallet">
                <Wallet className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit for Verification'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
