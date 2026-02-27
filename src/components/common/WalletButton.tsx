'use client';

/**
 * WalletButton.tsx
 * Connect / disconnect MetaMask wallet button for the admin header.
 * Shows wallet address when connected, warns if on wrong network.
 */

import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Wallet, Loader2, AlertTriangle, ChevronDown, LogOut, CheckCircle2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function shortAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletButton() {
    const {
        account,
        isConnected,
        isConnecting,
        isCorrectNetwork,
        error,
        connect,
        switchToSepolia,
        disconnect,
    } = useMetaMask();

    // ── Not connected ────────────────────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="flex items-center gap-2">
                {error && (
                    <span className="text-xs text-destructive max-w-[160px] truncate" title={error}>
                        {error}
                    </span>
                )}
                <Button
                    id="wallet-connect-btn"
                    onClick={connect}
                    disabled={isConnecting}
                    variant="outline"
                    size="sm"
                    className="border-primary/50 hover:border-primary gap-2"
                >
                    {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Wallet className="h-4 w-4" />
                    )}
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
            </div>
        );
    }

    // ── Wrong network ─────────────────────────────────────────────────────
    if (!isCorrectNetwork) {
        return (
            <Button
                id="wallet-wrong-network-btn"
                onClick={switchToSepolia}
                variant="destructive"
                size="sm"
                className="gap-2"
            >
                <AlertTriangle className="h-4 w-4" />
                Switch to Sepolia
            </Button>
        );
    }

    // ── Connected & correct network ───────────────────────────────────────
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    id="wallet-connected-btn"
                    variant="outline"
                    size="sm"
                    className="border-green-500/40 hover:border-green-500 gap-2"
                >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-mono text-xs">{shortAddress(account!)}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="pb-0">Connected Wallet</DropdownMenuLabel>
                <div className="px-2 py-1.5">
                    <p className="font-mono text-xs text-muted-foreground break-all">{account}</p>
                </div>
                <div className="px-2 pb-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                        ✓ Sepolia Testnet
                    </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    id="wallet-view-etherscan"
                    onClick={() =>
                        window.open(`https://sepolia.etherscan.io/address/${account}`, '_blank')
                    }
                >
                    View on Etherscan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    id="wallet-disconnect-btn"
                    className="text-destructive focus:text-destructive"
                    onClick={disconnect}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
