# **App Name**: CertChain

## Core Features:

- Admin Login: Secure login for administrators using JWT authentication.
- Certificate Upload & Hash Generation: Upload PDF certificates, generate SHA-256 hashes, and store them on the blockchain. Utilizes Multer for file handling and Crypto for hashing.
- Blockchain Storage: Store certificate hashes on the Ethereum Sepolia testnet using a Solidity smart contract and Hardhat for deployment.
- Metadata Storage: Store certificate metadata (student name, course, issue date, etc.) in MongoDB, linking to the blockchain transaction hash.
- QR Code Generation: Generate QR codes containing the certificate ID for easy verification.
- Certificate Verification: Verify certificates by uploading or entering the certificate ID, generating a SHA-256 hash, and comparing it with the hash stored on the blockchain. The system then checks if a match is found and if a matching hash is located in the MongoDB tool and then generates a notification
- View Certificate: User can view the stored certificate using the certificate ID and a generated link.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and security.
- Background color: Dark gray (#303030), creating a modern dark theme.
- Accent color: Cyan (#00BCD4) to highlight interactive elements and status indicators, providing a high contrast within the dark theme.
- Body and headline font: 'Inter', a grotesque sans-serif known for its modern, machined, objective, and neutral look, makes it very suitable for both headlines and body text
- Use minimalist, line-based icons to maintain a clean and modern look. Icons should clearly represent actions and statuses (e.g., checkmark for valid, cross for invalid).
- Implement a simple, dashboard-style layout with clear sections for admin and verifier roles. Use a grid system for consistent spacing and alignment.
- Use subtle animations, such as loading spinners and transition effects, to enhance user experience without being distracting.