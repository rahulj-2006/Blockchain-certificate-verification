import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const ConnectWallet = ({ account, setAccount, error, setError }) => {
    const connect = async () => {
        try {
            setError('');
            if (!window.ethereum) {
                throw new Error("MetaMask not found. Please install the extension.");
            }
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAccount(accounts[0]);
        } catch (err) {
            setError(err.message);
        }
    };

    const disconnect = () => {
        setAccount('');
    };

    return (
        <div className="flex items-center gap-4">
            {account ? (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 bg-white/5 py-2 px-4 rounded-full border border-white/10"
                >
                    <span className="text-sm font-mono text-indigo-400">
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </span>
                    <button
                        onClick={disconnect}
                        className="p-1 hover:text-red-400 transition-colors"
                        title="Disconnect"
                    >
                        <LogOut size={18} />
                    </button>
                </motion.div>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={connect}
                    className="btn btn-primary"
                >
                    <Wallet size={20} />
                    Connect Wallet
                </motion.button>
            )}
        </div>
    );
};

export default ConnectWallet;
