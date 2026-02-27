# CertChain Beginner Guide: Move from Simulation to Real Blockchain

This guide is for beginners and gives a practical path to make CertChain work with a **real blockchain**.

---

## 0) What you already have

Your current app already does two important things:

1. It can **issue** by calling a relayer endpoint (`BLOCKCHAIN_RELAYER_URL`).
2. It can **verify** by reading the blockchain through JSON-RPC (`BLOCKCHAIN_RPC_URL`) and contract address (`BLOCKCHAIN_CONTRACT_ADDRESS`).

So the remaining work is mainly to provide the missing infrastructure:
- a deployed smart contract,
- a relayer server,
- and environment variables.

---

## 1) Big picture architecture

You will run 3 parts:

1. **CertChain Next.js app** (this repo)
2. **Smart contract** on Sepolia (or other EVM testnet)
3. **Relayer backend** that sends transactions to your contract

Flow:
- University uploads PDF in your app
- App hashes PDF (SHA-256)
- App calls relayer with `{ certificateId, certificateHash }`
- Relayer sends blockchain transaction
- Verifier uploads PDF + ID
- App reads `getCertificateHash(certificateId)` from chain and compares hashes

---

## 2) Beginner prerequisites

Install and prepare:

- Node.js 20+
- MetaMask browser wallet
- Sepolia test ETH (faucet)
- An RPC provider account (Infura/Alchemy/QuickNode)
- Git

Optional but recommended:
- Etherscan account for explorer/API usage

---

## 3) Smart contract: easiest beginner path (Remix)

If this is your first contract deployment, use **Remix**:

1. Open [https://remix.ethereum.org](https://remix.ethereum.org)
2. Create `CertRegistry.sol`
3. Paste this minimal contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertRegistry {
    address public owner;
    mapping(string => bytes32) private certificateHashes;

    event CertificateIssued(string certificateId, bytes32 certificateHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function issueCertificate(string calldata certificateId, bytes32 certificateHash) external onlyOwner {
        require(certificateHashes[certificateId] == bytes32(0), "Already issued");
        certificateHashes[certificateId] = certificateHash;
        emit CertificateIssued(certificateId, certificateHash);
    }

    function getCertificateHash(string calldata certificateId) external view returns (bytes32) {
        return certificateHashes[certificateId];
    }
}
```

4. Compile with Solidity `0.8.20`
5. Deploy to **Sepolia** using MetaMask
6. Save deployed contract address

> Important: The app currently expects `getCertificateHash(string)` exactly.

---

## 4) Build a simple relayer backend

You need a small backend service that:
- accepts POST `{ certificateId, certificateHash }`
- converts hash into `bytes32`
- calls `issueCertificate(...)` on your deployed contract
- returns `{ transactionHash }`

### 4.1 Create a new folder

```bash
mkdir certchain-relayer
cd certchain-relayer
npm init -y
npm install express ethers dotenv
```

### 4.2 Create `.env`

```bash
RPC_URL=https://sepolia.infura.io/v3/<your-project-id>
PRIVATE_KEY=0x<relayer-wallet-private-key>
CONTRACT_ADDRESS=0x<deployed-contract-address>
API_KEY=<strong-secret>
PORT=8080
```

### 4.3 Create `server.js`

```js
require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const abi = [
  'function issueCertificate(string certificateId, bytes32 certificateHash) external',
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

app.post('/issue-certificate', async (req, res) => {
  try {
    const apiKey = req.header('x-api-key');
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { certificateId, certificateHash } = req.body;
    if (!certificateId || !certificateHash) {
      return res.status(400).json({ error: 'certificateId and certificateHash are required' });
    }

    const hashHex = certificateHash.startsWith('0x') ? certificateHash : `0x${certificateHash}`;
    if (hashHex.length !== 66) {
      return res.status(400).json({ error: 'certificateHash must be 32-byte hex (64 chars)' });
    }

    const tx = await contract.issueCertificate(certificateId, hashHex);
    const receipt = await tx.wait();

    return res.json({ transactionHash: receipt.hash });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Relayer listening on port ${process.env.PORT || 8080}`);
});
```

### 4.4 Start relayer

```bash
node server.js
```

---

## 5) Configure this CertChain app

In this repository root, create `.env.local`:

```bash
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/<your-project-id>
BLOCKCHAIN_CONTRACT_ADDRESS=0x<deployed-contract-address>
BLOCKCHAIN_RELAYER_URL=http://localhost:8080/issue-certificate
BLOCKCHAIN_RELAYER_API_KEY=<same-secret-as-relayer>
```

Run app:

```bash
npm install
npm run dev
```

Open `http://localhost:9002`.

---

## 6) First end-to-end test (happy path)

1. Issue a certificate from admin flow with a PDF.
2. Confirm you receive `certificateId` and `transactionHash`.
3. Open Sepolia explorer and verify transaction exists.
4. Verify same `certificateId` with the same original PDF.
5. Expect valid result.

---

## 7) Tamper test (must fail)

1. Edit the PDF file (or export again, changing bytes).
2. Re-verify same certificate ID.
3. Expect invalid result (hash mismatch).

---

## 8) Common beginner mistakes

- Using wrong network (contract on Sepolia, RPC on another chain).
- Wrong contract address.
- Relayer wallet not funded with Sepolia ETH.
- Hash format mismatch (`certificateHash` must represent 32 bytes).
- API key mismatch between app and relayer.

---

## 9) What to build next (recommended order)

1. Add contract events + indexing for history.
2. Add issuer role control (not only owner).
3. Add revocation function.
4. Store file on IPFS and include CID on-chain or off-chain signed metadata.
5. Add wallet-based issuer authentication in frontend.

---

## 10) Production caution

For production, do **not** keep a hot private key in a plain server without proper controls. Use a secure key management approach (HSM/KMS or managed relayer infrastructure), rate limiting, request signing, and monitoring.
