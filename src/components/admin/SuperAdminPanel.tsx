'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { University } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMetaMask } from '@/hooks/useMetaMask';
import { 
  Loader2, 
  ShieldCheck, 
  Trash2, 
  Wallet,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { ethers } from 'ethers';

export default function SuperAdminPanel() {
  const { isConnected, account, isCorrectNetwork, connect, getSignerContract, getReadContract, switchToSepolia } = useMetaMask();
  const [universities, setUniversities] = useState<University[]>([]);
  const [onChainStatuses, setOnChainStatuses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [txLoading, setTxLoading] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkRole = async () => {
      if (!account || !isConnected) {
        setIsSuperAdmin(null);
        return;
      }
      const contract = getReadContract();
      if (!contract) return;
      try {
        const adminAddr = await contract.superAdmin();
        setIsSuperAdmin(adminAddr.toLowerCase() === account.toLowerCase());
      } catch (e) {
        setIsSuperAdmin(false);
      }
    };
    checkRole();
  }, [account, isConnected, getReadContract]);

  useEffect(() => {
    const q = query(collection(db, 'universities'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as University));
      setUniversities(unis);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshOnChainStatus = useCallback(async () => {
    const contract = getReadContract();
    if (!contract || universities.length === 0) return;

    const statuses: Record<string, number> = {};
    for (const uni of universities) {
      try {
        const uniInfo = await contract.getUniversity(uni.walletAddress);
        if (uniInfo && uniInfo.wallet !== ethers.ZeroAddress) {
          statuses[uni.walletAddress] = Number(uniInfo.status);
        } else {
          statuses[uni.walletAddress] = -1;
        }
      } catch (e) {
        statuses[uni.walletAddress] = -1;
      }
    }
    setOnChainStatuses(statuses);
  }, [getReadContract, universities]);

  useEffect(() => {
    refreshOnChainStatus();
  }, [refreshOnChainStatus]);

  const handleAddUniversity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdding(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = (formData.get('email') as string).toLowerCase().trim();
    const wallet = (formData.get('wallet') as string).toLowerCase().trim();
    const password = formData.get('password') as string;

    try {
      if (!ethers.isAddress(wallet)) throw new Error('Invalid Ethereum address.');
      await setDoc(doc(db, 'universities', wallet), {
        name,
        emailDomain: email, 
        walletAddress: wallet,
        status: 'pending', 
        createdAt: new Date().toISOString(),
        initialPassword: password,
      });
      toast({ title: 'Whitelisted', description: `${name} added to database.` });
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleBlockchainAuthorize = async (uni: University) => {
    if (!isConnected) return connect();
    if (!isCorrectNetwork) return switchToSepolia();
    if (isSuperAdmin === false) {
      return toast({ title: 'Denied', description: 'Only Super Admin can authorize.', variant: 'destructive' });
    }

    setTxLoading(uni.id);
    try {
      const contract = await getSignerContract();
      toast({ title: 'Processing', description: 'Authorizing university on-chain...' });
      const tx = await contract.verifyUniversity(uni.walletAddress);
      await tx.wait();

      await updateDoc(doc(db, 'universities', uni.id), {
        status: 'verified',
        verifiedAt: new Date().toISOString()
      });

      refreshOnChainStatus();
      toast({ title: 'Success', description: `${uni.name} is now authorized.` });
    } catch (err: any) {
      toast({ title: 'Failed', description: err.reason || err.message, variant: 'destructive' });
    } finally {
      setTxLoading(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Blockchain Authority Console</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={refreshOnChainStatus}><RefreshCw className="h-4 w-4" /></Button>
          {!isConnected ? <Button onClick={connect}>Connect Wallet</Button> : (
            <Badge variant={isSuperAdmin ? "default" : "destructive"} className="h-10 px-4 font-mono">
              {account?.slice(0, 6)}...{account?.slice(-4)} {isSuperAdmin && "(ADMIN)"}
            </Badge>
          )}
        </div>
      </div>

      {isConnected && isSuperAdmin === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wrong Wallet</AlertTitle>
          <AlertDescription>Connected wallet is not the Contract Super Admin.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Whitelist University</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUniversity} className="space-y-4">
              <div className="space-y-1"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-1"><Label>Email</Label><Input name="email" type="email" required /></div>
              <div className="space-y-1"><Label>Wallet</Label><Input name="wallet" placeholder="0x..." required /></div>
              <div className="space-y-1"><Label>Initial Password</Label><Input name="password" required /></div>
              <Button type="submit" className="w-full" disabled={isAdding}>Whitelist</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>On-Chain Registry</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>University</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.map((uni) => {
                  const chainStatus = onChainStatuses[uni.walletAddress] ?? -1;
                  return (
                    <TableRow key={uni.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{uni.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{uni.walletAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={chainStatus === 1 ? "text-green-500" : "text-orange-500"}>
                          {chainStatus === -1 ? 'NOT REGISTERED' : chainStatus === 0 ? 'PENDING' : 'VERIFIED'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {chainStatus === 0 && (
                            <Button size="sm" onClick={() => handleBlockchainAuthorize(uni)} disabled={txLoading === uni.id || !isSuperAdmin}>
                              {txLoading === uni.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Authorize"}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`https://sepolia.etherscan.io/address/${uni.walletAddress}`} target="_blank"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db, 'universities', uni.id))} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
