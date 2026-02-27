'use server';
/**
 * @fileOverview A certificate data extraction AI agent.
 *
 * - extractCertificateInfo - A function that handles the certificate data extraction process.
 * - ExtractInput - The input type for the extraction function.
 * - ExtractOutput - The return type for the extraction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A document of a certificate (PDF or Image), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInput = z.infer<typeof ExtractInputSchema>;

const ExtractOutputSchema = z.object({
  studentName: z.string().describe('The full name of the student/recipient found on the certificate.'),
  courseName: z.string().describe('The name of the course or degree awarded.'),
  issueDate: z.string().describe('The date the certificate was issued, formatted as YYYY-MM-DD if possible.'),
});
export type ExtractOutput = z.infer<typeof ExtractOutputSchema>;

export async function extractCertificateInfo(input: ExtractInput): Promise<ExtractOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    output: { schema: ExtractOutputSchema },
    prompt: [
      { text: "You are an expert document analyzer. Extract the student's name, the course name, and the issue date from the provided certificate document." },
      { media: { url: input.fileDataUri } },
    ],
  });

  if (!output) {
    throw new Error('Failed to extract data from the document.');
  }

  return output;
}
