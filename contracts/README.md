# CertChain Multi-Tenant Smart Contract

## Architecture Overview

```
Super Admin (UGC / Contract Deployer)
    │
    ├── verifyUniversity()       → Approves universities to issue certs
    ├── deactivateUniversity()   → Suspends a university
    ├── reactivateUniversity()   → Re-enables a suspended university
    └── updateUniversityWallet() → Wallet recovery (lost/compromised key)
         │
         ▼
    Universities (Verified Wallets)
         │
         ├── registerUniversity()  → Submit registration (requires Super Admin approval)
         ├── issueCertificate()    → Issue cert on-chain (verified only)
         └── revokeCertificate()   → Revoke own cert only
              │
              ▼
         Public / Verifiers (No login needed)
              └── verifyCertificate() → Check any cert by hash
```

---

## Roles

| Role | Who | Key Permissions |
|---|---|---|
| `Super Admin` | Contract deployer (UGC) | Verify/deactivate universities, wallet recovery |
| `University Admin` | Verified university wallet | Issue & revoke their own certificates |
| `Public` | Anyone | Verify any certificate |

---

## Contract Functions

### Super Admin Only
| Function | Description |
|---|---|
| `verifyUniversity(address)` | Approves a Pending university |
| `deactivateUniversity(address)` | Suspends a Verified university |
| `reactivateUniversity(address)` | Re-verifies a Deactivated university |
| `updateUniversityWallet(old, new)` | Migrates university to new wallet (key recovery) |

### University (Must be Verified)
| Function | Description |
|---|---|
| `registerUniversity(name, domain, type)` | Submit registration request |
| `issueCertificate(hash, student, course, date)` | Record a certificate on-chain |
| `revokeCertificate(hash)` | Revoke one of their own certificates |

### Public (No Auth)
| Function | Description |
|---|---|
| `verifyCertificate(hash)` | Returns full cert details + validity |
| `getCertificate(hash)` | Returns raw certificate struct |
| `getUniversity(wallet)` | Returns university profile |
| `getUniversityCertificates(wallet)` | Returns all hashes issued by a university |
| `certificateExists(hash)` | Quick existence check |

---

## University Lifecycle

```
Registration → Pending → [Super Admin Verifies] → Verified → Can Issue Certs
                                                      │
                                          [Super Admin Deactivates]
                                                      │
                                                 Deactivated → Cannot Issue
                                                      │
                                          [Super Admin Reactivates]
                                                      │
                                                  Verified ←─────────────┘
```

---

## Accreditation Types

| Value | Type |
|---|---|
| 0 | UGC |
| 1 | IIT |
| 2 | NIT |
| 3 | Private |
| 4 | Other |

---

## Deployment Instructions

### Option A — Remix (Quickest, No Compilation Needed)

1. Go to [https://remix.ethereum.org](https://remix.ethereum.org)
2. Create new file → Paste contents of `CertChain.sol`
3. **Solidity Compiler** tab → Select `0.8.20` → Compile
4. **Deploy & Run** tab:
   - Environment: `Injected Provider - MetaMask`
   - Switch MetaMask to **Sepolia Testnet**
   - Click **Deploy**
5. Copy the deployed contract address
6. Update your environment files:
   - `certchain-relayer/.env` → `CONTRACT_ADDRESS=<new address>`
   - `.env.local` → `BLOCKCHAIN_CONTRACT_ADDRESS=<new address>`

### Option B — Script Deployment

```bash
cd contracts
npm install ethers dotenv
```

Create `contracts/.env`:
```
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

Compile `CertChain.sol` in Remix → Copy the **Bytecode** (the `object` field) → Paste into `deploy.js` at the `BYTECODE` variable.

```bash
node deploy.js
```

---

## Relayer Update Required

After deploying the new contract, the relayer's `server.js` ABI call must be updated:

**Old (single-admin contract):**
```js
'function issueCertificate(string certificateId, bytes32 certificateHash) external'
```

**New (multi-tenant contract):**
```js
'function issueCertificate(bytes32 certificateHash, string studentName, string courseName, uint256 issueDate) external'
```

The relayer now calls the function with the full certificate data, not just the hash.

---

## Events Reference

| Event | When Emitted |
|---|---|
| `UniversityRegistered` | University calls `registerUniversity()` |
| `UniversityVerified` | Super admin calls `verifyUniversity()` or `reactivateUniversity()` |
| `UniversityDeactivated` | Super admin calls `deactivateUniversity()` |
| `CertificateIssued` | University calls `issueCertificate()` |
| `CertificateRevoked` | University calls `revokeCertificate()` |
| `WalletUpdated` | Super admin calls `updateUniversityWallet()` |

---

## Security Notes

- `superAdmin` is `immutable` — set once at deploy, can never change
- Duplicate certificate hashes are rejected (`certificateExists` guard)
- Only issuing university can revoke its own certificates
- Deactivated universities cannot issue new certs (past certs remain valid)
- Wallet migration cleans up old wallet state to prevent dual-access
