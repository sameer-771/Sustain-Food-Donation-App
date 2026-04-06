import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ImageUp, Loader2, ShieldCheck, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerModalProps {
  title: string;
  onClose: () => void;
  onVerify: (payload: { scannedPayload?: string; code?: string }) => Promise<void>;
}

const QrScannerModal: React.FC<QrScannerModalProps> = ({ title, onClose, onVerify }) => {
  const [mode, setMode] = useState<'choose' | 'camera'>('choose');
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const scannerId = useMemo(() => `pickup-scanner-${Date.now()}`, []);
  const uploadScannerId = useMemo(() => `pickup-upload-scanner-${Date.now()}`, []);

  const verifyDecodedPayload = useCallback(async (decodedText: string) => {
    setIsVerifying(true);
    setErrorText(null);
    try {
      await onVerify({ scannedPayload: decodedText });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid QR code.';
      setErrorText(message);
      setIsVerifying(false);
    }
  }, [onVerify]);

  const stopActiveScanner = useCallback(async () => {
    if (!scannerRef.current) {
      return;
    }

    const activeScanner = scannerRef.current;
    scannerRef.current = null;
    await activeScanner.stop().catch(() => null);
    try {
      activeScanner.clear();
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (mode !== 'camera') {
      return;
    }

    let active = true;
    let html5QrCode: Html5Qrcode | null = null;

    setIsStarting(true);
    setErrorText(null);

    const start = async () => {
      try {
        html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (!active || isVerifying) return;
            await verifyDecodedPayload(decodedText);
          },
          () => {
            // no-op for scan errors
          },
        );
      } catch {
        setErrorText('Camera unavailable. Use image upload or 6-digit code below.');
        setMode('choose');
      } finally {
        if (active) {
          setIsStarting(false);
        }
      }
    };

    start();

    return () => {
      active = false;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => null).finally(() => {
          try {
            html5QrCode?.clear();
          } catch {
            // no-op
          }
        });
      }
      scannerRef.current = null;
    };
  }, [mode, scannerId, isVerifying, verifyDecodedPayload]);

  const scanQrFromImageFile = async (file: File): Promise<string> => {
    const fileScanner = new Html5Qrcode(uploadScannerId);
    try {
      const rawValue = await fileScanner.scanFile(file, false);
      const normalized = rawValue?.trim();
      if (!normalized) {
        throw new Error('No QR code found in the selected image.');
      }
      return normalized;
    } finally {
      try {
        fileScanner.clear();
      } catch {
        // no-op
      }
    }
  };

  const handleImageUploadScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || isVerifying || isUploading) {
      return;
    }

    try {
      setErrorText(null);
      setIsUploading(true);
      await stopActiveScanner();
      setMode('choose');
      const decodedText = await scanQrFromImageFile(selectedFile);
      await verifyDecodedPayload(decodedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read QR from this image.';
      setErrorText(message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const startCameraFlow = async () => {
    setErrorText(null);
    await stopActiveScanner();
    setMode('camera');
  };

  const submitManualCode = async () => {
    if (!manualCode.trim()) {
      return;
    }
    setIsVerifying(true);
    setErrorText(null);
    try {
      await onVerify({ code: manualCode.trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid pickup code.';
      setErrorText(message);
      setIsVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[230] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.25 }}
        className="relative w-full max-w-md bg-ios-lightBg dark:bg-ios-darkBg rounded-t-[2rem] overflow-hidden"
        style={{ maxHeight: '90dvh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overflow-y-auto overscroll-contain px-5 pt-5 pb-8" style={{ maxHeight: '90dvh' }}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
        >
          <X size={16} />
        </button>

        <p className="text-[11px] uppercase tracking-widest font-black text-ios-systemGray">Receiver Verification</p>
        <h3 className="text-xl font-black mt-1 leading-tight">Verify with donor QR, image, or code</h3>
        <p className="text-sm text-ios-systemGray font-semibold mt-1">{title}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={startCameraFlow}
            className="h-11 rounded-xl bg-ios-blue text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Camera size={16} />
            Scan with Camera
          </button>
          <label className="h-11 rounded-xl bg-ios-blue/10 text-ios-blue font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
            <ImageUp size={16} />
            {isUploading ? 'Scanning...' : 'Upload QR Image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUploadScan} />
          </label>
        </div>

        {mode === 'camera' && (
          <div className="mt-3 rounded-2xl bg-black p-3 border border-black/20">
            <div id={scannerId} className="w-full min-h-[260px] rounded-xl overflow-hidden bg-black" />
            {isStarting && (
              <div className="mt-2 text-white text-xs font-semibold flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Starting camera...
              </div>
            )}
          </div>
        )}

        <div id={uploadScannerId} className="hidden" />

        <div className="mt-4 rounded-2xl bg-white dark:bg-ios-darkCard p-4 border border-black/5 dark:border-white/10">
          <p className="text-[10px] uppercase tracking-wide font-black text-ios-systemGray mb-2">Or enter 6-digit code</p>
          <div className="flex items-center gap-2">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value.replaceAll(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="flex-1 h-11 rounded-xl bg-ios-lightBg dark:bg-black/20 px-4 text-center tracking-[0.25em] font-black"
            />
            <button
              onClick={submitManualCode}
              disabled={isVerifying || isUploading || manualCode.length !== 6}
              className="h-11 px-4 rounded-xl bg-ios-blue text-white font-bold disabled:opacity-60"
            >
              {isVerifying ? '...' : 'Verify'}
            </button>
          </div>
        </div>

        {isVerifying && (
          <div className="mt-3 flex items-center gap-2 text-ios-blue text-sm font-semibold">
            <Loader2 size={14} className="animate-spin" />
            Verifying pickup...
          </div>
        )}

        {errorText && (
          <p className="mt-3 text-sm font-semibold text-ios-systemRed">{errorText}</p>
        )}

        {!errorText && !isVerifying && (
          <p className="mt-3 text-xs text-ios-systemGray font-semibold flex items-center gap-1.5">
            <ShieldCheck size={13} />
            Pickup completes only after successful verification.
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 h-12 rounded-2xl bg-black/5 dark:bg-white/10 text-ios-systemGray font-bold"
        >
          Cancel
        </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QrScannerModal;
