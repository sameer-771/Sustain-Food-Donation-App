
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Search, X } from 'lucide-react';
import { FoodListing } from '../types';

declare const L: any;

interface MapViewProps {
  listings: FoodListing[];
  onClaim: (id: string) => void;
}

const MapView: React.FC<MapViewProps> = ({ listings, onClaim }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || typeof L === 'undefined') return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([13.0827, 80.2707], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter listings based on search
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? listings.filter(l =>
          l.title.toLowerCase().includes(query) ||
          l.location.address.toLowerCase().includes(query) ||
          l.category.toLowerCase().includes(query) ||
          l.donor.name.toLowerCase().includes(query)
        )
      : listings;

    // Add markers for each listing
    filtered.forEach(listing => {
      if (!listing.location.lat || !listing.location.lng) return;

      let color = '#34C759';
      let label = 'Available';
      if (listing.status === 'claimed') {
        color = '#007AFF';
        label = 'Claimed';
      } else if (listing.status === 'expired') {
        color = '#FF3B30';
        label = 'Expired';
      }

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px; height: 32px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([listing.location.lat, listing.location.lng], { icon })
        .addTo(mapRef.current);

      const claimBtn = listing.status === 'available'
        ? `<button onclick="window.__claimFood('${listing.id}')" style="
            background: #007AFF; color: white; border: none; padding: 8px 16px;
            border-radius: 12px; font-weight: 800; font-size: 12px; cursor: pointer;
            width: 100%; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;
          ">Claim Now</button>`
        : `<div style="
            background: ${color}20; color: ${color}; padding: 6px 12px;
            border-radius: 12px; font-weight: 800; font-size: 11px;
            text-align: center; margin-top: 8px; text-transform: uppercase;
          ">${label}</div>`;

      marker.bindPopup(`
        <div style="min-width: 180px; font-family: Inter, sans-serif;">
          <div style="font-weight: 900; font-size: 14px; margin-bottom: 4px;">${listing.title}</div>
          <div style="color: #8E8E93; font-size: 11px; font-weight: 600; margin-bottom: 2px;">
            by ${listing.donor.name}
          </div>
          <div style="color: #8E8E93; font-size: 11px; font-weight: 600; margin-bottom: 2px;">
            📍 ${listing.location.address}
          </div>
          <div style="color: #8E8E93; font-size: 11px; font-weight: 600;">
            🍽️ ${listing.servings} servings • ${listing.location.distance}
          </div>
          ${claimBtn}
        </div>
      `, { closeButton: true, maxWidth: 250 });

      markersRef.current.push(marker);
    });

    // If there's a search with results, zoom to fit
    if (query && filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((l: FoodListing) => [l.location.lat, l.location.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    // Global claim handler
    (window as any).__claimFood = (id: string) => {
      onClaim(id);
      mapRef.current?.closePopup();
    };

    return () => {
      delete (window as any).__claimFood;
    };
  }, [listings, onClaim, searchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const availableCount = listings.filter(l => l.status === 'available').length;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Header with Search */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pt-3 px-4 pb-3" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h1 className="text-xl font-black tracking-tight">Food Map</h1>
            <p className="text-ios-systemGray font-semibold text-[11px]">
              {availableCount} available near you
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ios-systemGray/60" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search food, location, donor..."
            className={`w-full h-10 pl-10 pr-10 rounded-xl bg-black/5 dark:bg-white/10 border-none text-[13px] font-semibold placeholder:text-ios-systemGray/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 transition-all ${
              isSearchFocused ? 'bg-white dark:bg-ios-darkCard shadow-sm' : ''
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-ios-systemGray/20 flex items-center justify-center"
            >
              <X size={10} className="text-ios-systemGray" />
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] glass-panel rounded-2xl px-4 py-2.5 shadow-lg">
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wide">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#34C759]" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#007AFF]" />
            <span>Claimed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF3B30]" />
            <span>Expired</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
    </div>
  );
};

export default MapView;
