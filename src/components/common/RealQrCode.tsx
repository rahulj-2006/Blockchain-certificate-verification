'use client';

/**
 * RealQrCode.tsx
 * Generates a real, scannable QR code using the `qrcode` library.
 * The QR encodes a verification URL: /verify/<certificateId>
 */

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

type Props = {
    value: string;          // The data to encode (URL or ID)
    size?: number;          // Canvas size in pixels
    className?: string;
    dark?: string;          // Dark module color
    light?: string;         // Light module color
};

export function RealQrCode({
    value,
    size = 200,
    className,
    dark = '#000000',
    light = '#ffffff',
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !value) return;
        QRCode.toCanvas(canvasRef.current, value, {
            width: size,
            margin: 2,
            color: { dark, light },
            errorCorrectionLevel: 'H', // High — allows up to 30% damage
        }).catch(console.error);
    }, [value, size, dark, light]);

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className={cn('rounded', className)}
        />
    );
}

/**
 * getQrDataUrl — returns a data URL (PNG) of the QR code.
 * Used when embedding the QR into a generated PDF certificate.
 */
export async function getQrDataUrl(value: string, size = 300): Promise<string> {
    return QRCode.toDataURL(value, {
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
    });
}
