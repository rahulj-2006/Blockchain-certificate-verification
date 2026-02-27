import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

async function generate() {
    console.log("Creating PDF...");
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]);

    const qrDataUrl = await QRCode.toDataURL("test", { width: 800 });
    console.log("QR Length:", qrDataUrl.length);
    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    console.log("QR Image dimensions:", qrImage.width, qrImage.height);

    console.log("Done");
}

generate().catch(console.error);
