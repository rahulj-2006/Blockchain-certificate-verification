require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

// --- Validate required environment variables on startup ---
const requiredEnvVars = ['RPC_URL', 'PRIVATE_KEY', 'CONTRACT_ADDRESS', 'API_KEY'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const abi = [
    'function issueCertificate(string certificateId, bytes32 certificateHash) external',
];

const contractWithSigner = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

// --- Health check endpoint ---
app.get('/health', async (req, res) => {
    try {
        const network = await provider.getNetwork();
        const balance = await provider.getBalance(wallet.address);
        res.json({
            status: 'ok',
            network: network.name,
            chainId: network.chainId.toString(),
            walletAddress: wallet.address,
            walletBalanceETH: ethers.formatEther(balance),
            contractAddress: process.env.CONTRACT_ADDRESS,
        });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

// --- Issue certificate endpoint ---
app.post('/issue-certificate', async (req, res) => {
    try {
        // Auth check
        const apiKey = req.header('x-api-key');
        if (apiKey !== process.env.API_KEY) {
            return res.status(401).json({ error: 'Unauthorized: invalid API key' });
        }

        const { certificateId, certificateHash } = req.body;

        // Validate input
        if (!certificateId || !certificateHash) {
            return res.status(400).json({ error: 'certificateId and certificateHash are required' });
        }

        // Ensure hash is proper 32-byte hex (with or without 0x prefix)
        const hashHex = certificateHash.startsWith('0x') ? certificateHash : `0x${certificateHash}`;
        if (hashHex.length !== 66) {
            return res.status(400).json({
                error: `certificateHash must be 32-byte hex (64 chars). Got ${hashHex.length - 2} chars.`,
            });
        }

        console.log(`📋 Issuing certificate: ${certificateId}`);
        console.log(`🔑 Hash: ${hashHex}`);

        // Send blockchain transaction
        const tx = await contractWithSigner.issueCertificate(certificateId, hashHex);
        console.log(`⏳ Transaction sent: ${tx.hash} — waiting for confirmation...`);

        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block ${receipt.blockNumber}: ${receipt.hash}`);

        return res.json({ transactionHash: receipt.hash });
    } catch (e) {
        console.error('❌ Error issuing certificate:', e.message);

        // Provide a helpful error for common issues
        let userMessage = e.message || 'Unknown error';
        if (e.message?.includes('Not owner')) {
            userMessage = 'Contract error: the relayer wallet is not the contract owner. Deploy the contract from the same wallet as PRIVATE_KEY.';
        } else if (e.message?.includes('Already issued')) {
            userMessage = 'This certificate ID has already been issued on-chain.';
        } else if (e.message?.includes('insufficient funds')) {
            userMessage = 'Relayer wallet has insufficient ETH to pay for gas. Please fund the wallet.';
        }

        return res.status(500).json({ error: userMessage });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 CertChain Relayer running!');
    console.log(`   Port:     ${PORT}`);
    console.log(`   Wallet:   ${wallet.address}`);
    console.log(`   Contract: ${process.env.CONTRACT_ADDRESS}`);
    console.log('');
    console.log('📡 Endpoints:');
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   POST http://localhost:${PORT}/issue-certificate`);
    console.log('');
});
