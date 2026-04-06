import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';

import { PickupCodeResult } from '../types';

interface DonorPickupQrModalProps {
  listingTitle: string;
  pickupData: PickupCodeResult;
  onClose: () => void;
}

const DonorPickupQrModal: React.FC<DonorPickupQrModalProps> = ({ listingTitle, pickupData, onClose }) => {
  const [qrImage, setQrImage] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(pickupData.qrPayload, {
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrImage(url);
      })
      .catch(() => {
        if (active) setQrImage('');
      });

    return () => {
      active = false;
    };
  }, [pickupData.qrPayload]);

  const copyCode = async () => {
    await navigator.clipboard?.writeText(pickupData.pickupCode);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[220] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.25 }}
        className="relative w-full max-w-md bg-ios-lightBg dark:bg-ios-darkBg rounded-t-[2rem] px-5 pt-5 pb-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
        >
          <X size={16} />
        </button>

        <p className="text-[11px] uppercase tracking-widest font-black text-ios-systemGray">Secure Pickup Verification</p>
        <h3 className="text-xl font-black mt-1 leading-tight">Show this QR to the receiver</h3>
        <p className="text-sm text-ios-systemGray font-semibold mt-1">{listingTitle}</p>

        <div className="mt-4 rounded-2xl bg-white dark:bg-ios-darkCard p-4 border border-black/5 dark:border-white/10">
          <div className="w-full aspect-square rounded-xl bg-white flex items-center justify-center overflow-hidden">
            {qrImage ? (
              <img src={qrImage} alt="Pickup verification QR" className="w-full h-full object-contain" />
            ) : (
              <div className="text-ios-systemGray text-sm font-semibold flex items-center gap-2">
                <QrCode size={16} />
                Generating QR...
              </div>
            )}
          </div>

          <div className="mt-3 rounded-xl bg-ios-blue/10 border border-ios-blue/20 px-3 py-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-black text-ios-systemGray">6-Digit Pickup Code</p>
              <p className="text-lg font-black tracking-[0.2em] text-ios-blue">{pickupData.pickupCode}</p>
            </div>
            <button
              onClick={copyCode}
              className="w-9 h-9 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center"
            >
              <Copy size={14} className="text-ios-blue" />
            </button>
          </div>

          <p className="text-[11px] text-ios-systemGray font-semibold mt-3">
            Expires at {new Date(pickupData.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DonorPickupQrModal;
