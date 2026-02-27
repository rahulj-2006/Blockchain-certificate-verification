'use client';

/**
 * src/hooks/useMetaMask.ts
 *
 * MetaMask wallet connection hook for CertChain V2.
 *
 * Provides:
 *  - connect()              → Request wallet connection
 *  - account                → Connected wallet address
 *  - isConnected            → Boolean
 *  - isCorrectNetwork       → True if on Sepolia
 *  - switchToSepolia()      → Prompt user to switch network
 *  - getSignerContract()    → ethers.Contract with signer (for write txns)
 *  - getReadContract()      → ethers.Contract read-only (for frontend reads)
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CERTCHAIN_ABI, CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID_HEX } from '@/lib/blockchain';

// Extend Window type for MetaMask
declare global {
    interface Window {
        ethereum?: {
            isMetaMask?: boolean;
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on: (event: string, handler: (...args: unknown[]) => void) => void;
            removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
        };
    }
}

export type MetaMaskState = {
    account: string | null;
    chainId: string | null;
    isConnected: boolean;
    isCorrectNetwork: boolean;
    isConnecting: boolean;
    error: string | null;
    connect: () => Promise<void>;
    switchToSepolia: () => Promise<void>;
    getSignerContract: () => Promise<ethers.Contract>;
    getReadContract: () => ethers.Contract | null;
    disconnect: () => void;
};

export function useMetaMask(): MetaMaskState {
    const [account, setAccount] = useState<string | null>(null);
    const [chainId, setChainId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isCorrectNetwork = chainId?.toLowerCase() === SEPOLIA_CHAIN_ID_HEX.toLowerCase();

    // ── On Mount: detect already-connected accounts ───────────────────────
    useEffect(() => {
        if (typeof window === 'undefined' || !window.ethereum) return;

        // Check if already connected
        window.ethereum
            .request({ method: 'eth_accounts' })
            .then((accounts) => {
                const list = accounts as string[];
                if (list.length > 0) setAccount(list[0]);
            })
            .catch(() => { });

        // Get current chain
        window.ethereum
            .request({ method: 'eth_chainId' })
            .then((id) => setChainId(id as string))
            .catch(() => { });

        // Listen for account changes
        const onAccountsChanged = (accounts: unknown) => {
            const list = accounts as string[];
            setAccount(list.length > 0 ? list[0] : null);
        };

        // Listen for network changes
        const onChainChanged = (id: unknown) => {
            setChainId(id as string);
        };

        window.ethereum.on('accountsChanged', onAccountsChanged);
        window.ethereum.on('chainChanged', onChainChanged);

        return () => {
            window.ethereum?.removeListener('accountsChanged', onAccountsChanged);
            window.ethereum?.removeListener('chainChanged', onChainChanged);
        };
    }, []);

    // ── Connect Wallet ────────────────────────────────────────────────────
    const connect = useCallback(async () => {
        setError(null);

        if (typeof window === 'undefined' || !window.ethereum) {
            setError('MetaMask is not installed. Please install it from metamask.io');
            return;
        }

        setIsConnecting(true);
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            }) as string[];

            setAccount(accounts[0]);

            const id = await window.ethereum.request({ method: 'eth_chainId' }) as string;
            setChainId(id);

            // Auto-switch to Sepolia if on wrong network
            if (id.toLowerCase() !== SEPOLIA_CHAIN_ID_HEX.toLowerCase()) {
                await switchToSepolia();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                if ((err as { code?: number }).code === 4001) {
                    setError('Connection rejected. Please approve the MetaMask request.');
                } else {
                    setError(err.message);
                }
            }
        } finally {
            setIsConnecting(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Switch to Sepolia ─────────────────────────────────────────────────
    const switchToSepolia = useCallback(async () => {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
            });
        } catch (err: unknown) {
            // Error code 4902 = chain not added yet
            if ((err as { code?: number }).code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: SEPOLIA_CHAIN_ID_HEX,
                        chainName: 'Sepolia Testnet',
                        nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://rpc.sepolia.org'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io'],
                    }],
                });
            }
        }
    }, []);

    // ── Disconnect (local state only — MetaMask has no disconnect API) ────
    const disconnect = useCallback(() => {
        setAccount(null);
        setError(null);
    }, []);

    // ── Get contract with signer (for WRITE operations) ───────────────────
    const getSignerContract = useCallback(async (): Promise<ethers.Contract> => {
        if (!window.ethereum) throw new Error('MetaMask not available');
        if (!account) throw new Error('Wallet not connected');
        if (!isCorrectNetwork) throw new Error('Please switch to Sepolia network');

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        return new ethers.Contract(CONTRACT_ADDRESS, CERTCHAIN_ABI, signer);
    }, [account, isCorrectNetwork]);

    // ── Get contract read-only (for frontend READ operations) ─────────────
    const getReadContract = useCallback((): ethers.Contract | null => {
        const rpcUrl = process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL;
        if (!rpcUrl) return null;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        return new ethers.Contract(CONTRACT_ADDRESS, CERTCHAIN_ABI, provider);
    }, []);

    return {
        account,
        chainId,
        isConnected: !!account,
        isCorrectNetwork,
        isConnecting,
        error,
        connect,
        switchToSepolia,
        getSignerContract,
        getReadContract,
        disconnect,
    };
}
