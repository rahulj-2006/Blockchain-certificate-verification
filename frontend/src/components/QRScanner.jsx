import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, Loader2, Info } from 'lucide-react';

export default function QRScanner({ onScan, onClose }) {
    const [error, setError] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const scannerRef = useRef(null);
    const containerId = "qr-reader-container";

    useEffect(() => {
        let html5QrCode;

        // Safety: ensure we start with a clean state
        const init = async () => {
            try {
                html5QrCode = new Html5Qrcode(containerId);
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const boxSize = Math.floor(minEdge * 0.7);
                        return { width: boxSize, height: boxSize };
                    }
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (text) => {
                        console.log("Scanned:", text);
                        onScan(text);
                    },
                    () => { /* scan failures are normal and frequent */ }
                );

                setIsReady(true);
            } catch (err) {
                console.error("Scanner start error:", err);
                setError("Unable to start camera. Please check permissions.");
            }
        };

        // Wait a tiny bit for the DOM to settle
        const timer = setTimeout(init, 300);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().then(() => {
                        scannerRef.current.clear();
                    }).catch(e => console.warn("Cleanup warning:", e));
                }
            }
        };
    }, [onScan]);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(5, 5, 20, 0.95)',
            backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 99999, padding: 20
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: 480, padding: 0, overflow: 'hidden',
                background: '#0a0a16', border: '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Camera size={20} style={{ color: '#8b5cf6' }} />
                        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.02em' }}>SCANNED VERIFICATION</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Video Feed */}
                <div style={{ position: 'relative', background: '#000', minHeight: 320, width: '100%' }}>
                    <div id={containerId} style={{ width: '100%' }}></div>

                    {!isReady && !error && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 15 }}>
                            <Loader2 className="spin" size={32} style={{ color: '#8b5cf6' }} />
                            <span style={{ color: 'var(--text-3)', fontSize: '0.9rem', fontWeight: 600 }}>Initializing Lens...</span>
                        </div>
                    )}

                    {error && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
                            <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
                            <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>Camera Error</p>
                            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{error}</p>
                            <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Retry Browser</button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div style={{ padding: 24, background: 'rgba(139, 92, 246, 0.03)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <Info size={18} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                            Focus on the QR code printed on the certificate. This will automatically extract the <strong>Secured Blockchain Fingerprint</strong>.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        #${containerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
        #${containerId}__scan_region {
           background: transparent !important;
        }
      `}</style>
        </div>
    );
}
