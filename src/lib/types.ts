export type Certificate = {
  id: string;
  studentName: string;
  courseName: string;
  issueDate: string;
  certificateHash: string;
  transactionHash: string;
  universityName?: string;
  universityWallet?: string;
  pdfUrl?: string;
  issuedAt?: string;
};

export type UniversityStatus = 'pending' | 'verified' | 'rejected';

export type University = {
  id: string; // Document ID (usually the wallet address or Firebase UID)
  name: string;
  emailDomain: string;
  accreditationProofUrl?: string;
  walletAddress: string;
  status: UniversityStatus;
  createdAt: string;
  verifiedAt?: string;
  adminUid: string; // The Firebase Auth UID of the university representative
  initialPassword?: string; // Stored for admin reference
};