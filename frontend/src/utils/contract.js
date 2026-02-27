import { ethers } from 'ethers';
import abi from '../../../artifacts/CertificateRegistry_ABI.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const RPC_URL = import.meta.env.VITE_RPC_URL;

export const getContractWithSigner = async () => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
};

export const getReadOnlyContract = async () => {
    let provider;
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
    } else if (RPC_URL) {
        provider = new ethers.JsonRpcProvider(RPC_URL);
    } else {
        throw new Error('No blockchain provider found');
    }
    return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
};

export const connectWallet = async () => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0];
};

/**
 * Determine role by querying the contract directly.
 * No hardcoded address needed — contract is the source of truth.
 * Returns: 'superadmin' | 'admin' | 'user'
 */
export const getRole = async (address) => {
    if (!address) return 'user';
    try {
        const contract = await getReadOnlyContract();
        const ownerAddress = await contract.owner();
        if (address.toLowerCase() === ownerAddress.toLowerCase()) return 'superadmin';
        const isAdmin = await contract.admins(address);
        if (isAdmin) return 'admin';
    } catch (e) {
        console.warn('Role check failed:', e.message);
    }
    return 'user';
};
