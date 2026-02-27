'use server';

import { z } from 'zod';
import type { Certificate } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const issueCertificateSchema = z.object({
  studentName: z.string().min(2, 'Student name is required.'),
  courseName: z.string().min(2, 'Course name is required.'),
  issueDate: z.string().min(1, 'Issue date is required.'),
});

type IssueState = {
  status: 'error' | 'success' | 'idle';
  message: string;
  errors: {
    studentName?: string[];
    courseName?: string[];
    issueDate?: string[];
  } | null;
  data: {
    certificateId: string;
    transactionHash: string;
  } | null;
};

export async function issueCertificateAction(
  prevState: IssueState,
  formData: FormData
): Promise<IssueState> {
  const validatedFields = issueCertificateSchema.safeParse({
    studentName: formData.get('studentName'),
    courseName: formData.get('courseName'),
    issueDate: formData.get('issueDate'),
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      message: 'Please check the form for errors.',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  const { studentName, courseName, issueDate } = validatedFields.data;

  try {
    const transactionHash = (formData.get('transactionHash') as string) || 'pending';
    const certificateId = (formData.get('certificateId') as string) || crypto.randomUUID();

    const newCertificateData = {
      studentName,
      courseName,
      issueDate,
      certificateHash: (formData.get('certificateHash') as string) || '',
      transactionHash,
      issuedAt: new Date().toISOString(),
      universityName: (formData.get('universityName') as string) || '',
      universityWallet: (formData.get('universityWallet') as string) || '',
      pdfUrl: (formData.get('pdfUrl') as string) || '',
    };
    
    await setDoc(doc(db, 'certificates', certificateId), newCertificateData);

    revalidatePath('/');
    revalidatePath(`/verify/${certificateId}`);

    return {
      status: 'success',
      message: 'Certificate metadata saved!',
      data: { certificateId, transactionHash },
      errors: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return {
      status: 'error',
      message: `Database error: ${errorMessage}`,
      errors: null,
      data: null,
    };
  }
}

const verifyCertificateSchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required.'),
});

type VerifyState = {
  status: 'error' | 'success_valid' | 'success_invalid' | 'idle';
  message: string;
  errors: {
    certificateId?: string[];
  } | null;
  data: Certificate | null;
};

export async function verifyCertificateAction(
  prevState: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const validatedFields = verifyCertificateSchema.safeParse({
    certificateId: formData.get('certificateId'),
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      message: 'Please check the form for errors.',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  const { certificateId } = validatedFields.data;

  try {
    const certDoc = await getDoc(doc(db, 'certificates', certificateId));
    
    if (!certDoc.exists()) {
      return {
        status: 'success_invalid',
        message: 'Certificate ID not found on blockchain record.',
        errors: null,
        data: null,
      };
    }

    const storedCertificate = certDoc.data();
    const certificateData: Certificate = {
      id: certificateId,
      studentName: storedCertificate.studentName ?? 'Not available',
      courseName: storedCertificate.courseName ?? 'Not available',
      issueDate: storedCertificate.issueDate ?? 'Not available',
      certificateHash: storedCertificate.certificateHash ?? 'Not available',
      transactionHash: storedCertificate.transactionHash ?? 'Not available',
      pdfUrl: storedCertificate.pdfUrl ?? '',
      universityName: storedCertificate.universityName ?? '',
    };

    return {
      status: 'success_valid',
      message: 'Certificate found and verified!',
      data: certificateData,
      errors: null,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return {
      status: 'error',
      message: `Verification error: ${errorMessage}`,
      errors: null,
      data: null,
    };
  }
}

export async function getCertificateById(id: string): Promise<Certificate | null> {
  try {
    const certDoc = await getDoc(doc(db, "certificates", id));
    if (!certDoc.exists()) return null;
    const data = certDoc.data();
    return {
      id: certDoc.id,
      studentName: data.studentName,
      courseName: data.courseName,
      issueDate: data.issueDate,
      certificateHash: data.certificateHash,
      transactionHash: data.transactionHash,
      pdfUrl: data.pdfUrl || '',
      universityName: data.universityName || '',
    };
  } catch (error) {
    console.error("Error fetching certificate by ID:", error);
    return null;
  }
}