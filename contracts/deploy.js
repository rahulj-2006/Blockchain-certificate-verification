/**
 * deploy.js — CertChain Multi-Tenant Contract Deployment Script
 *
 * Usage:
 *   1. cd contracts
 *   2. npm install ethers dotenv
 *   3. Add DEPLOYER_PRIVATE_KEY and RPC_URL to contracts/.env
 *   4. node deploy.js
 */

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// ── Validate env ─────────────────────────────────────────
const { DEPLOYER_PRIVATE_KEY, RPC_URL } = process.env;
if (!DEPLOYER_PRIVATE_KEY || !RPC_URL) {
    console.error('❌ Missing DEPLOYER_PRIVATE_KEY or RPC_URL in contracts/.env');
    process.exit(1);
}

// ── ABI + Bytecode (compile with solc or Remix, then paste here) ──────────────
// After compiling CertChain.sol in Remix:
//   1. Go to "Solidity Compiler" tab → Compile CertChain.sol
//   2. Click "ABI" → copy → paste below as a JSON string
//   3. Click "Bytecode" → copy object field → paste below
//
// For quick deployment, use Remix directly:
//   https://remix.ethereum.org
//   → Load CertChain.sol → Compile → Deploy on Injected Provider (MetaMask on Sepolia)

const ABI = [
    // --- Events ---
    "event UniversityRegistered(address indexed wallet, string name, string domain, uint8 accreditation, uint256 timestamp)",
    "event UniversityVerified(address indexed wallet, string name, uint256 timestamp)",
    "event UniversityDeactivated(address indexed wallet, string name, uint256 timestamp)",
    "event CertificateIssued(bytes32 indexed certificateHash, address indexed issuingUniversity, string studentName, string courseName, uint256 issueDate, uint256 timestamp)",
    "event CertificateRevoked(bytes32 indexed certificateHash, address indexed revokedBy, uint256 timestamp)",
    "event WalletUpdated(address indexed oldWallet, address indexed newWallet, string universityName, uint256 timestamp)",

    // --- View: Super Admin ---
    "function superAdmin() view returns (address)",

    // --- University Management ---
    "function registerUniversity(string name, string domain, uint8 accreditation) external",
    "function verifyUniversity(address wallet) external",
    "function deactivateUniversity(address wallet) external",
    "function reactivateUniversity(address wallet) external",
    "function updateUniversityWallet(address oldWallet, address newWallet) external",

    // --- Certificate Management ---
    "function issueCertificate(bytes32 certificateHash, string studentName, string courseName, uint256 issueDate) external",
    "function revokeCertificate(bytes32 certificateHash) external",

    // --- Public Verification ---
    "function verifyCertificate(bytes32 certificateHash) view returns (string studentName, string courseName, uint256 issueDate, address issuingUniversity, string universityName, string universityDomain, bool isRevoked, bool isValid, uint256 issuedAt)",

    // --- Read: Universities ---
    "function getUniversity(address wallet) view returns (tuple(address wallet, string name, string domain, uint8 accreditation, uint8 status, uint256 registeredAt, uint256 verifiedAt))",
    "function getUniversityStatus(address wallet) view returns (uint8)",
    "function getUniversityCertificates(address wallet) view returns (bytes32[])",

    // --- Read: Certificates ---
    "function certificateExists(bytes32 hash) view returns (bool)",
    "function getCertificate(bytes32 hash) view returns (tuple(bytes32 certificateHash, string studentName, string courseName, uint256 issueDate, address issuingUniversity, bool isRevoked, uint256 issuedAt))",
    "function walletMigrationHistory(address) view returns (address)",
];

// TODO: Replace with compiled bytecode from Remix
const BYTECODE = "0x..."; // <-- Paste compiled bytecode here

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    const network = await provider.getNetwork();
    const balance = await provider.getBalance(wallet.address);

    console.log('');
    console.log('🚀 CertChain Multi-Tenant Contract Deployment');
    console.log('─────────────────────────────────────────────');
    console.log(`   Network:  ${network.name} (chainId: ${network.chainId})`);
    console.log(`   Deployer: ${wallet.address}`);
    console.log(`   Balance:  ${ethers.formatEther(balance)} ETH`);
    console.log('');

    if (ethers.formatEther(balance) < 0.01) {
        console.warn('⚠️  Low balance! Get Sepolia ETH from: https://sepoliafaucet.com');
    }

    console.log('⏳ Deploying contract...');

    const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
    const contract = await factory.deploy();

    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const receipt = await contract.deploymentTransaction().wait();

    console.log('');
    console.log('✅ Contract deployed successfully!');
    console.log('─────────────────────────────────────────────');
    console.log(`   Contract Address: ${address}`);
    console.log(`   Tx Hash:          ${receipt.hash}`);
    console.log(`   Block:            ${receipt.blockNumber}`);
    console.log(`   Gas Used:         ${receipt.gasUsed.toString()}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log(`   1. Update certchain-relayer/.env → CONTRACT_ADDRESS=${address}`);
    console.log(`   2. Update .env.local             → BLOCKCHAIN_CONTRACT_ADDRESS=${address}`);
    console.log(`   3. Verify on Etherscan: https://sepolia.etherscan.io/address/${address}`);
    console.log('');

    // Save deployment info to file
    const deployInfo = {
        contractAddress: address,
        deployerAddress: wallet.address,
        network: network.name,
        chainId: network.chainId.toString(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
        path.join(__dirname, 'deployment.json'),
        JSON.stringify(deployInfo, null, 2)
    );
    console.log('💾 Deployment info saved to contracts/deployment.json');
}

main().catch((err) => {
    console.error('❌ Deployment failed:', err.message);
    process.exit(1);
});
