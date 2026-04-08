import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Navigation, Clock, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { FoodListing } from '../types';
import { Coordinates, formatDistanceKm, getCurrentLocation, haversineDistanceKm, watchCurrentLocation } from '../utils/location';
import { listingMarkerIcon, userLocationMarkerIcon } from '../utils/leaflet';

interface PickupModalProps {
  listing: FoodListing;
  currentLocation: Coordinates | null;
  onClose: () => void;
  onConfirmPickup: (id: string) => void;
}

const PickupModal: React.FC<PickupModalProps> = ({ listing, currentLocation, onClose, onConfirmPickup }) => {
  const [modalLocation, setModalLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (currentLocation) {
      return;
    }

    let isActive = true;
    void getCurrentLocation()
      .then((location) => {
        if (isActive) {
          setModalLocation(location);
        }
      })
      .catch(() => {
        // Gracefully fall back to listing-provided distance text.
      });

    const stopWatching = watchCurrentLocation(
      (location) => {
        if (isActive) {
          setModalLocation(location);
        }
      },
      () => {
        // Keep last known location and fallback distance text.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000,
      },
    );

    return () => {
      isActive = false;
      stopWatching();
    };
  }, [currentLocation]);

  const effectiveLocation = currentLocation || modalLocation;

  const routeDistance = useMemo(() => {
    if (!effectiveLocation) {
      return listing.location.distance;
    }

    const distanceKm = haversineDistanceKm(effectiveLocation, {
      lat: listing.location.lat,
      lng: listing.location.lng,
    });
    return formatDistanceKm(distanceKm);
  }, [effectiveLocation, listing.location.distance, listing.location.lat, listing.location.lng]);

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(listing.location.address);
  };

  const handleOpenInMaps = () => {
    const origin = effectiveLocation ? `&origin=${effectiveLocation.lat},${effectiveLocation.lng}` : '';
    window.open(
      `https://www.google.com/maps/dir/?api=1${origin}&destination=${listing.location.lat},${listing.location.lng}`,
      '_blank',
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[150] flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md bg-ios-lightBg dark:bg-ios-darkBg rounded-t-[2rem] overflow-hidden"
        style={{ maxHeight: '90dvh' }}
      >
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-ios-lightBg dark:bg-ios-darkBg z-10">
          <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/10" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-4 w-11 h-11 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center z-20"
        >
          <X size={18} className="text-ios-systemGray" />
        </button>

        <div className="overflow-y-auto overscroll-contain px-5 pt-1 pb-32 safe-area-modal-bottom space-y-3.5" style={{ maxHeight: 'calc(90dvh - 32px)' }}>
          <div className="w-full h-44 rounded-2xl overflow-hidden shadow-lg">
            <img src={listing.imageUrl || listing.thumbnailUrl} alt={listing.title} className="w-full h-full object-cover" />
          </div>

          <div>
            <h3 className="text-xl font-black leading-tight">{listing.title}</h3>
            <p className="text-ios-systemGray text-sm font-semibold mt-0.5">from {listing.donor.name}</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">Food Claimed Successfully!</p>
              <p className="text-[11px] text-ios-systemGray font-medium">Head to the pickup location below.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-ios-darkCard rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-ios-blue" />
                <span className="text-[10px] font-black text-ios-systemGray uppercase tracking-widest">Pickup Location</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-[13px] font-bold">{listing.location.address}</p>
                  <p className="text-[11px] text-ios-systemGray font-medium">{routeDistance}</p>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="shrink-0 w-7 h-7 rounded-lg bg-ios-blue/10 flex items-center justify-center"
                >
                  <Copy size={12} className="text-ios-blue" />
                </button>
              </div>
            </div>

            <div className="h-[180px] w-full">
              <MapContainer
                center={[listing.location.lat, listing.location.lng]}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[listing.location.lat, listing.location.lng]} icon={listingMarkerIcon}>
                  <Popup>{listing.title}</Popup>
                </Marker>
                {effectiveLocation && (
                  <>
                    <Marker position={[effectiveLocation.lat, effectiveLocation.lng]} icon={userLocationMarkerIcon}>
                      <Popup>Your location</Popup>
                    </Marker>
                    <Polyline
                      positions={[
                        [effectiveLocation.lat, effectiveLocation.lng],
                        [listing.location.lat, listing.location.lng],
                      ]}
                      pathOptions={{ color: '#007AFF', weight: 4, opacity: 0.8 }}
                    />
                  </>
                )}
              </MapContainer>
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1 bg-white dark:bg-ios-darkCard rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
              <Clock size={13} className="text-amber-500" />
              <div>
                <p className="text-[9px] text-ios-systemGray font-bold uppercase">Pickup By</p>
                <p className="text-[12px] font-black">
                  {new Date(listing.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-ios-darkCard rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
              <Navigation size={13} className="text-ios-blue" />
              <div>
                <p className="text-[9px] text-ios-systemGray font-bold uppercase">Distance</p>
                <p className="text-[12px] font-black">{routeDistance}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => onConfirmPickup(listing.id)}
              className="w-full py-4 min-h-[48px] rounded-2xl bg-emerald-500 text-white font-black text-[14px] uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <CheckCircle size={18} />
              Verify Pickup with QR
            </button>
            <p className="text-[11px] font-semibold text-ios-systemGray text-center px-2">
              Ask donor to tap Show QR in Donor mode, then scan or enter the 6-digit code.
            </p>
            <button
              onClick={handleOpenInMaps}
              className="w-full py-3.5 min-h-[48px] rounded-2xl bg-ios-blue/10 text-ios-blue font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              <ExternalLink size={14} />
              Open in Google Maps
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 min-h-[48px] rounded-2xl bg-black/5 dark:bg-white/5 text-ios-systemGray font-bold text-[13px] active:scale-[0.97] transition-transform"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PickupModal;
