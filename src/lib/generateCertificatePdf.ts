import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getQrDataUrl } from '@/components/common/RealQrCode';

export type CertificateData = {
    certificateId: string;
    studentName: string;
    courseName: string;
    issueDate: string;
    universityName: string;
};

/**
 * Generates a beautiful minimal certificate PDF with a large QR code from scratch.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<{
    pdfBlob: Blob;
    pdfDataUrl: string;
}> {
    const {
        certificateId,
        studentName,
        courseName,
        issueDate,
        universityName,
    } = data;

    // Create a new PDF Document (Landscape: A4 dimensions)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 landscape size in points
    const { width, height } = page.getSize();

    // Fonts
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ── Generate QR Code ──
    const qrValue = certificateId;
    // Generate high-res QR for embedding
    const qrDataUrl = await getQrDataUrl(qrValue, 800);
    const qrImage = await pdfDoc.embedPng(qrDataUrl);

    // ── Design Elements ──

    // Background color (very subtle off-white)
    page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(0.98, 0.98, 0.98),
    });

    // Dark border
    const margin = 30;
    page.drawRectangle({
        x: margin,
        y: margin,
        width: width - margin * 2,
        height: height - margin * 2,
        borderColor: rgb(0.1, 0.1, 0.15),
        borderWidth: 2,
        color: rgb(1, 1, 1),
    });

    // Inner thin border
    page.drawRectangle({
        x: margin + 8,
        y: margin + 8,
        width: width - (margin + 8) * 2,
        height: height - (margin + 8) * 2,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
    });

    // ── Typography ──
    const textCenter = (text: string, font: any, size: number) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        return (width - textWidth) / 2;
    };

    // University Name (Header)
    const uniSize = 24;
    page.drawText(universityName.toUpperCase(), {
        x: textCenter(universityName.toUpperCase(), fontBold, uniSize),
        y: height - 100,
        size: uniSize,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
    });

    // Title
    const title = 'CERTIFICATE OF COMPLETION';
    const titleSize = 36;
    page.drawText(title, {
        x: textCenter(title, fontBold, titleSize),
        y: height - 170,
        size: titleSize,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.3), // Dark blueish
    });

    // Subtitle
    const sub1 = 'This is to proudly certify that';
    const sub1Size = 16;
    page.drawText(sub1, {
        x: textCenter(sub1, fontRegular, sub1Size),
        y: height - 220,
        size: sub1Size,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
    });

    // Student Name
    const nameSize = 48;
    page.drawText(studentName, {
        x: textCenter(studentName, fontBold, nameSize),
        y: height - 280,
        size: nameSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    // Line under name
    const lineY = height - 295;
    page.drawLine({
        start: { x: width / 2 - 200, y: lineY },
        end: { x: width / 2 + 200, y: lineY },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });

    // Course completion text
    const sub2 = `has successfully completed the course`;
    const sub2Size = 16;
    page.drawText(sub2, {
        x: textCenter(sub2, fontRegular, sub2Size),
        y: height - 330,
        size: sub2Size,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
    });

    // Course Name
    const courseSize = 24;
    page.drawText(courseName, {
        x: textCenter(courseName, fontBold, courseSize),
        y: height - 370,
        size: courseSize,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
    });

    // ── Layout for Date & QR ──

    // Left side: Signature / Date area
    page.drawText('Date of Issue', {
        x: 150,
        y: 110,
        size: 12,
        font: fontBold,
        color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(issueDate, {
        x: 150,
        y: 85,
        size: 18,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
    });
    // Signature line
    page.drawLine({
        start: { x: 120, y: 130 },
        end: { x: 280, y: 130 },
        thickness: 1,
        color: rgb(0.5, 0.5, 0.5),
    });


    // Right side: Large QR Code
    // Make QR much larger (e.g., 180px)
    const qrSize = 140;
    const qrX = width - qrSize - 120;
    const qrY = 65;

    page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
    });

    page.drawText('SCAN TO VERIFY', {
        x: qrX + (qrSize - fontBold.widthOfTextAtSize('SCAN TO VERIFY', 10)) / 2,
        y: qrY - 15,
        size: 10,
        font: fontBold,
        color: rgb(0.4, 0.4, 0.4),
    });

    // Subtext at bottom center
    const idText = `Certificate ID: ${certificateId}`;
    page.drawText(idText, {
        x: textCenter(idText, fontRegular, 9),
        y: 50,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
    });

    // Hidden metadata as fallback for forensic tools
    pdfDoc.setSubject(certificateId);
    pdfDoc.setAuthor(universityName);
    pdfDoc.setTitle(`Certificate - ${studentName}`);

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfDataUrl = URL.createObjectURL(pdfBlob);

    return { pdfBlob, pdfDataUrl };
}
