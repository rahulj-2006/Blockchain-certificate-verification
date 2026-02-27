'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { University, Certificate } from '@/lib/types';
import CertificateForm from '@/components/admin/CertificateForm';
import CertificateList from '@/components/admin/CertificateList';
import { Loader2, AlertCircle, ShieldCheck, Building2, History, PlusCircle, Wallet, Crown } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMetaMask } from '@/hooks/useMetaMask';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const { account, isConnected, isCorrectNetwork, connect, getSignerContract, getReadContract, switchToSepolia } = useMetaMask();
  const { toast } = useToast();

  const [university, setUniversity] = useState<University | null>(null);
  const [issuedCertificates, setIssuedCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainStatus, setChainStatus] = useState<number>(-1); // -1: unregistered, 0: pending, 1: verified
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const qUni = query(
      collection(db, 'universities'),
      where('emailDomain', '==', user.email?.toLowerCase().trim())
    );

    const unsubscribeUni = onSnapshot(qUni, (snapshot) => {
      if (!snapshot.empty) {
        const uniDoc = snapshot.docs[0];
        const uniData = uniDoc.data() as Omit<University, 'id'>;
        setUniversity({ ...uniData, id: uniDoc.id });
        if (!uniData.adminUid) {
          updateDoc(doc(db, 'universities', uniDoc.id), { adminUid: user.uid }).catch(console.error);
        }
      } else {
        setUniversity(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });

    return () => unsubscribeUni();
  }, [user, isUserLoading]);

  useEffect(() => {
    const checkOnChain = async () => {
      if (!university?.walletAddress) return;
      const contract = getReadContract();
      if (!contract) return;
      try {
        const info = await contract.getUniversity(university.walletAddress);
        if (info && info.wallet !== ethers.ZeroAddress) {
          setChainStatus(Number(info.status));
        } else {
          setChainStatus(-1);
        }
      } catch (e) {
        setChainStatus(-1);
      }
    };
    checkOnChain();
    const interval = setInterval(checkOnChain, 10000);
    return () => clearInterval(interval);
  }, [university?.walletAddress, getReadContract]);

  useEffect(() => {
    if (!university?.walletAddress) return;
    const qCerts = query(collection(db, 'certificates'), where('universityWallet', '==', university.walletAddress));
    const unsubscribeCerts = onSnapshot(qCerts, (snapshot) => {
      const certs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Certificate));
      setIssuedCertificates(certs);
    });
    return () => unsubscribeCerts();
  }, [university?.walletAddress]);

  const handleBlockchainRegister = async () => {
    if (!isConnected) { connect(); return; }
    if (!isCorrectNetwork) { switchToSepolia(); return; }

    setIsRegistering(true);
    try {
      const contract = await getSignerContract();
      const domain = university?.emailDomain.split('@').pop() || 'edu.in';

      toast({ title: 'Registration Started', description: 'Signing on-chain profile registration...' });
      const tx = await contract.registerUniversity(university?.name || '', domain, 0);
      await tx.wait();

      setChainStatus(0);
      toast({ title: 'Profile Registered!', description: 'Now wait for the Super Admin to authorize your wallet.' });
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err.reason || err.message, variant: 'destructive' });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isUserLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Institution Not Found</AlertTitle>
          <AlertDescription>Your email domain is not recognized. Please contact the Platform Admin.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isVerified = chainStatus === 1;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      {/* Super Admin shortcut */}
      <div className="max-w-4xl mx-auto flex justify-end">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/admin/super">
            <Crown className="h-4 w-4 text-yellow-500" />
            Super Admin Panel
          </Link>
        </Button>
      </div>
      <div className="max-w-4xl mx-auto rounded-xl border border-primary/20 bg-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{university.name}</h1>
            {isVerified ? (
              <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/5">
                <ShieldCheck className="mr-1 h-3 w-3" /> VERIFIED ISSUER
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/5">
                {chainStatus === -1 ? 'NOT ON BLOCKCHAIN' : 'PENDING AUTHORIZATION'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">{university.walletAddress}</p>
        </div>
      </div>

      {!isVerified && (
        <div className="max-w-4xl mx-auto">
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <Wallet className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold">Blockchain Profile Setup</p>
                <p className="text-sm text-muted-foreground">
                  {chainStatus === -1
                    ? "You must register your profile on the blockchain before you can issue certificates."
                    : "Profile registered! Waiting for Super Admin authorization."}
                </p>
              </div>
              {chainStatus === -1 && (
                <Button onClick={handleBlockchainRegister} disabled={isRegistering} className="gap-2">
                  {isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Register on Blockchain
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isVerified && (
        <Tabs defaultValue="issue" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="issue" className="gap-2">
              <PlusCircle className="h-4 w-4" /> Issue Certificate
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="issue" className="space-y-4">
            <CertificateForm />
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            <CertificateList certificates={issuedCertificates} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
