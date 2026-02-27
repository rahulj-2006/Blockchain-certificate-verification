# CertChain - Blockchain-Based Certificate Verification Platform

> **Note on Current Implementation:** This project is a functional prototype that **simulates** a blockchain-based workflow using **Firebase Firestore** as the backend. The core logic for issuing and verifying certificates is in place, but the smart contract interactions and on-chain storage are currently simulated. Firestore provides data persistence and security for this version.

CertChain is a full-stack platform that leverages blockchain technology to create a secure, transparent, and fraud-proof system for issuing and verifying academic and professional certificates.

## System Workflow

The system is designed around three key entities: the Platform Admin, the Verified University (Issuer), and the Verifier (e.g., HR/Recruiter). The workflow ensures trust and integrity at every step.

---

### 🏛 1. University Registration Workflow

This workflow ensures that only legitimate and accredited institutions can issue certificates on the platform.

1.  **Account Creation:** A university representative creates an account on the CertChain platform.
2.  **Document Submission:** During onboarding, the university must submit:
    *   **Official Email Domain:** To verify their official communication channel.
    *   **Accreditation Proof:** Documents proving their status as a recognized educational institution.
    *   **Official Wallet Address:** A public cryptocurrency wallet address (e.g., from MetaMask) that will be used to sign and issue certificates.
3.  **Manual Verification:** The **Platform Admin** (the platform owner) manually reviews the submitted documents and credentials to verify the university's authenticity and accreditation.
4.  **Approval and On-Chain Registration (Simulated):** If approved:
    *   The university's wallet address is marked as a `Verified Issuer`. In this simulation, this is managed via a role or attribute in the database (Firestore). In a full blockchain implementation, this would be a transaction to a smart contract mapping like `mapping(address => bool) public verifiedUniversities;`.
    *   The university's profile on the platform receives a "Verified" badge, signaling their trusted status to all users.

> **Clarification:** The Platform Admin is the owner of the CertChain startup, not a governmental body like the UGC (University Grants Commission).

---

### 📜 2. Certificate Issuing Workflow

Once a university is verified, it can issue blockchain-secured certificates.

*   **Step 1: Login:** An authorized university official logs into their dashboard on the CertChain platform.
*   **Step 2: Upload Certificate:** The official uploads the student's certificate, typically in PDF format.
*   **Step 3: Generate Hash:** The backend system generates a unique cryptographic hash (SHA-256) of the certificate file. This hash acts as a digital fingerprint.
*   **Step 4: Smart Contract Interaction (Simulated):** The system calls a function (like the conceptual `issueCertificate()`) that stores the certificate metadata. In this simulation, the data is saved as a new document in Firestore. The data includes:
    *   A unique Certificate ID.
    *   The SHA-256 file hash.
    *   The issuer's wallet address (the university's).
    *   A timestamp of when the certificate was issued.
*   **Step 5: Blockchain Transaction (Simulated):** In this simulation, a unique transaction hash is generated and stored in Firestore. In a full implementation, this would be a real transaction recorded on a public blockchain (e.g., an Ethereum testnet).
*   **Step 6: Generate Verification Assets:** The system generates a unique **Certificate ID**, a scannable **QR Code**, and a **Verification URL** that points to the certificate's unique page on the platform.
*   **Step 7: Distribute to Student:** The university provides the student with the physical/digital certificate, along with the Certificate ID and QR code for verification purposes.

> **Important:** This process is secure because the backend logic (simulating a smart contract) is designed to only allow users with a `Verified Issuer` role to issue certificates.

---

### 🔎 3. Verification Workflow (HR Side)

An HR professional or any other verifier can easily and quickly confirm a certificate's authenticity.

The verifier can start by either:
*   **Option A:** Scanning the QR code on the certificate.
*   **Option B:** Visiting the CertChain platform and entering the Certificate ID manually.

The verification process proceeds as follows:

*   **Step 1: Retrieve Certificate Data (from Firestore):** The system uses the Certificate ID to query the Firestore database and retrieve the certificate's stored data: the file hash, the issuer's wallet address, and the timestamp. This simulates a query to the blockchain.
*   **Step 2: Check Issuer Identity:** The system cross-references the issuer's wallet address against a list of verified university roles in the database to confirm it belongs to a legitimate institution.
*   **Step 3: Generate New Hash (if file is uploaded):** If the verifier uploads the PDF file they received, the system generates a new SHA-256 hash from that file.
*   **Step 4: Compare Hashes:** The system compares the newly generated hash against the original hash stored in Firestore.

**Verification Outcome:**

*   ✅ **If both hashes match:** The system displays a "Certificate Valid" message with the following details:
    *   Confirmation of validity (e.g., a green checkmark).
    *   **Issued by:** [University Name] (e.g., Jain University).
    *   **Issued on:** [Date from timestamp].
    *   A link to the (simulated) blockchain transaction for transparency.

*   ❌ **If the hashes do not match:** The system displays a "Certificate Tampered or Fake" message, indicating that the document has been altered or is not the original one issued by the university.

---

### 🔐 4. The Three Layers of Trust

The platform's security is built on three distinct layers of trust:

*   **Layer 1 – Platform Trust (Manual Verification):** The Platform Admin manually vets and verifies each university before they are allowed to issue certificates. This ensures that the issuers themselves are legitimate.
*   **Layer 2 – Blockchain Trust (Simulated via Firestore):** Once a certificate is issued, its hash and the issuer's identity are recorded. In this prototype, Firestore serves as the immutable ledger. Its security rules and backend logic prevent unauthorized modification, providing a permanent source of truth for verification.
*   **Layer 3 – Cryptographic Trust (Hashing):** The use of SHA-256 hashing guarantees the integrity of the certificate file. Even a single-character change in the document will produce a completely different hash, making any tampering immediately detectable.

---

### 🧠 5. Why This System Prevents Fraud

This multi-layered approach effectively combats certificate fraud:

*   **Integrity:** No one can modify a certificate's content (e.g., change a name or grade) without altering its hash, which would instantly invalidate it upon verification.
*   **Authenticity:** No one can fake a certificate from a prestigious university because they cannot issue it from that university's verified account.
*   **Exclusivity:** Only accounts belonging to universities verified by the Platform Admin can issue certificates.
*   **Permanence:** The database's security rules ensure that verification records cannot be erased or secretly modified by unauthorized users.

---

### 🎯 6. Admin Role Clarification

It is crucial to understand the role of the admin in this system:

*   The **Platform Admin** is the **super admin** of the CertChain platform itself (i.e., the startup owner or company operating it).
*   The admin's primary role is to onboard and verify educational institutions to maintain the integrity of the issuer network.
*   This role is **not** filled by a government entity like the UGC or any other regulatory body.

> **Future Enhancement:** Integration with bodies like the UGC could be a future feature to further automate and strengthen the university verification process. A full blockchain integration would replace the simulated components with on-chain smart contracts.
## Beginner implementation guide

If you want a complete step-by-step setup (contract + relayer + app env + first successful test), follow:

- [`docs/beginner-real-blockchain-guide.md`](docs/beginner-real-blockchain-guide.md)


## Real Blockchain Integration Configuration

To run CertChain against a real blockchain network, configure these environment variables:

- `BLOCKCHAIN_RPC_URL`: JSON-RPC endpoint for your EVM network (e.g., Sepolia).
- `BLOCKCHAIN_CONTRACT_ADDRESS`: Deployed certificate registry contract address.
- `BLOCKCHAIN_RELAYER_URL`: HTTPS endpoint of your transaction relayer service that submits `issueCertificate` transactions.
- `BLOCKCHAIN_RELAYER_API_KEY`: API key used by the app when calling the relayer.

### Contract Compatibility

The verification flow expects a contract method with this exact signature:

```solidity
function getCertificateHash(string calldata certificateId) external view returns (bytes32);
```

The issuance flow expects the relayer endpoint to accept:

```json
{
  "certificateId": "<uuid>",
  "certificateHash": "<sha256 hex without 0x>"
}
```

and respond with:

```json
{
  "transactionHash": "0x..."
}
```


## Is the app now completely on a real blockchain?

Short answer: **not 100% by default**.

The app logic is now wired to use real blockchain APIs for:
- **issuing** (through a relayer endpoint that submits a real transaction), and
- **verification** (through `eth_call` against your contract).

However, it becomes truly real only when you provide:
1. a deployed contract implementing `getCertificateHash(string)`,
2. a working relayer that writes certificates on-chain, and
3. valid environment variables.

If any of those are missing, issuance/verification will fail at runtime.

---

## Complete testing guide (end-to-end)

### 1) Deploy or reuse a compatible contract

Your contract must expose:

```solidity
function getCertificateHash(string calldata certificateId) external view returns (bytes32);
```

And your relayer should call the matching write function in your contract (for example `issueCertificate(certificateId, certificateHash)`).

### 2) Configure environment variables

Create `.env.local` in the project root:

```bash
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/<project-id>
BLOCKCHAIN_CONTRACT_ADDRESS=0x<deployed-contract-address>
BLOCKCHAIN_RELAYER_URL=https://<your-relayer-domain>/issue-certificate
BLOCKCHAIN_RELAYER_API_KEY=<relayer-api-key>
```

### 3) Start the app

```bash
npm run dev
```

Open `http://localhost:9002`.

### 4) Test issuance flow (admin side)

1. Go to the certificate issuance screen.
2. Fill student name, course, issue date.
3. Upload a PDF.
4. Submit.

Expected result:
- success toast,
- certificate ID shown,
- transaction hash returned from relayer.

### 5) Verify on-chain transaction externally

Use your network explorer (for Sepolia: Etherscan Sepolia) and confirm:
- transaction exists,
- it called your contract,
- and emitted your issuance event (if defined).

### 6) Test verification flow (verifier side)

1. Copy the certificate ID from issuance output.
2. Open verification form.
3. Upload the **same original PDF**.
4. Submit.

Expected result:
- `Certificate is valid!`
- hash matches on-chain `bytes32` value.

### 7) Tamper test

1. Modify the PDF (even one character/metadata update).
2. Re-upload with same certificate ID.

Expected result:
- invalid status,
- hash mismatch against on-chain record.

### 8) Negative ID test

Use a random UUID that was never issued.

Expected result:
- invalid status,
- `Certificate ID not found on blockchain`.

---

## Troubleshooting checklist

- **`BLOCKCHAIN_RPC_URL is not configured`**: `.env.local` missing/incorrect.
- **`Relayer call failed`**: relayer URL/API key invalid, relayer down, or CORS/auth issue.
- **Always invalid**: relayer stored a different hash format than app (must be raw SHA-256 hex bytes32-compatible).
- **Not found on-chain**: tx reverted, wrong contract address, wrong network RPC, or relayer wrote to different network.

---

## Production hardening recommendations

- Add contract events and index them for audit trails.
- Include chain ID in QR verification URL to avoid network mismatch.
- Add retry/backoff around relayer and RPC calls.
- Move from single relayer secret to signed issuer-wallet transactions (or custody model with role controls).
