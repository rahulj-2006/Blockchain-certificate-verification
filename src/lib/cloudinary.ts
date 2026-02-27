/**
 * src/lib/cloudinary.ts
 *
 * Cloudinary PDF uploader — browser-side, unsigned upload.
 * Uses Cloudinary's free tier (25GB storage, no credit card).
 *
 * Setup:
 *  1. Sign up at cloudinary.com
 *  2. Dashboard → Settings → Upload → Upload presets → Add preset
 *     - Name: certchain_certs
 *     - Signing mode: Unsigned
 *     - Folder: certificates
 *  3. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local
 *  4. Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local
 */

export type CloudinaryUploadResult = {
    url: string;   // HTTPS URL to the uploaded file
    publicId: string;   // Cloudinary public ID (for deletion/transformation)
    secureUrl: string;   // Always HTTPS version of url
    bytes: number;   // File size in bytes
};

/**
 * Uploads a PDF Blob to Cloudinary using an unsigned upload preset.
 * Works entirely in the browser — no server/API key needed.
 *
 * @param pdfBlob      The PDF Blob to upload
 * @param fileName     Filename to use (without extension)
 * @returns            CloudinaryUploadResult with the permanent URL
 */
export async function uploadPdfToCloudinary(
    pdfBlob: Blob,
    fileName: string
): Promise<CloudinaryUploadResult> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || cloudName === 'YOUR_CLOUD_NAME_HERE') {
        throw new Error(
            'Cloudinary cloud name not configured. ' +
            'Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local'
        );
    }
    if (!uploadPreset) {
        throw new Error(
            'Cloudinary upload preset not configured. ' +
            'Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local'
        );
    }

    // Build the multipart/form-data payload
    const formData = new FormData();
    formData.append('file', pdfBlob);
    formData.append('upload_preset', uploadPreset);
    formData.append('public_id', `certificates/${fileName}`);
    formData.append('resource_type', 'raw'); // 'raw' = non-image files like PDF

    // Upload to Cloudinary
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        {
            method: 'POST',
            body: formData,
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `Cloudinary upload failed: ${response.status} — ` +
            (errorData?.error?.message ?? response.statusText)
        );
    }

    const result = await response.json() as {
        secure_url: string;
        url: string;
        public_id: string;
        bytes: number;
    };

    return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
    };
}
