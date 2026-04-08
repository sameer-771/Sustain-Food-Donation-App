import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { FoodListing } from '../types';
import {
  Coordinates,
  formatDistanceKm,
  getCurrentLocation,
  haversineDistanceKm,
  LocationSuggestion,
  searchNominatimLocations,
  watchCurrentLocation,
} from '../utils/location';
import { listingMarkerIcon, userLocationMarkerIcon } from '../utils/leaflet';

interface MapViewProps {
  listings: FoodListing[];
  onClaim: (id: string) => void;
}

const DEFAULT_CENTER: Coordinates = { lat: 13.0827, lng: 80.2707 };

type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface FlyToProps {
  center: Coordinates;
  zoom?: number;
}

const FlyToLocation: React.FC<FlyToProps> = ({ center, zoom = 14 }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.7 });
  }, [map, center.lat, center.lng, zoom]);

  return null;
};

const MapView: React.FC<MapViewProps> = ({ listings, onClaim }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'listings' | 'location'>('listings');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationError, setLocationError] = useState('');
  const [mapCenter, setMapCenter] = useState<Coordinates>(DEFAULT_CENTER);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshUserLocation = async () => {
    setLocationStatus('loading');
    setLocationError('');
    try {
      const current = await getCurrentLocation();
      setUserLocation(current);
      setMapCenter(current);
      setLocationStatus('ready');
    } catch (error) {
      setLocationStatus('error');
      setLocationError(error instanceof Error ? error.message : 'Unable to fetch current location.');
    }
  };

  useEffect(() => {
    void refreshUserLocation();
  }, []);

  useEffect(() => {
    const stopWatching = watchCurrentLocation(
      (location) => {
        setUserLocation(location);
        setLocationStatus('ready');
        setLocationError('');
      },
      (error) => {
        setLocationStatus('error');
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000,
      },
    );

    return () => {
      stopWatching();
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchNominatimLocations(query, 7);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const availableListings = useMemo(() => listings.filter((listing) => listing.status === 'available'), [listings]);

  const filteredListings = useMemo(() => {
    if (searchMode === 'location') {
      return availableListings;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return availableListings;
    }

    return availableListings.filter((listing) =>
      listing.title.toLowerCase().includes(query)
      || listing.location.address.toLowerCase().includes(query)
      || listing.category.toLowerCase().includes(query)
      || listing.donor.name.toLowerCase().includes(query),
    );
  }, [availableListings, searchMode, searchQuery]);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const nextCenter = {
      lat: Number.parseFloat(suggestion.lat),
      lng: Number.parseFloat(suggestion.lon),
    };

    setMapCenter(nextCenter);
    setSearchQuery(suggestion.display_name);
    setSearchMode('location');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-[90] pt-3 px-4 pb-3 bg-white/[0.92] dark:bg-ios-darkBg/[0.92] backdrop-blur-xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <div>
            <h1 className="text-xl font-black tracking-tight text-black dark:text-white">Food Map</h1>
            <p className="text-ios-systemGray font-semibold text-[11px]">
              {filteredListings.length} available near you
            </p>
          </div>
          <button
            onClick={() => void refreshUserLocation()}
            className="h-9 px-3 rounded-xl bg-ios-blue/10 text-ios-blue text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5"
          >
            <LocateFixed size={13} className={locationStatus === 'loading' ? 'animate-spin' : ''} />
            Locate
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ios-systemGray/60" />
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchMode('listings');
              setSearchQuery(event.target.value);
            }}
            onFocus={() => {
              setIsSearchFocused(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsSearchFocused(false);
              setTimeout(() => setShowSuggestions(false), 180);
            }}
            placeholder="Search locations, food, donor..."
            className={`w-full h-10 pl-10 pr-10 rounded-xl bg-black/5 dark:bg-white/10 border-none text-[13px] font-semibold text-black dark:text-white placeholder:text-ios-systemGray/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 transition-all ${
              isSearchFocused ? 'bg-white dark:bg-ios-darkCard shadow-sm' : ''
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchMode('listings');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-ios-systemGray/20 flex items-center justify-center"
            >
              <X size={10} className="text-ios-systemGray" />
            </button>
          )}

          {isSearching && (
            <div className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-ios-blue/30 border-t-ios-blue rounded-full animate-spin" />
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-ios-darkCard rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden z-[100] max-h-[46vh] overflow-y-auto">
              {suggestions.map((suggestion, idx) => {
                const parts = suggestion.display_name.split(',');
                const primary = parts[0]?.trim() || suggestion.display_name;
                const secondary = parts.slice(1, 4).join(',').trim();
                return (
                  <button
                    key={`${suggestion.place_id}-${idx}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectSuggestion(suggestion);
                    }}
                    onTouchEnd={(event) => {
                      event.preventDefault();
                      handleSelectSuggestion(suggestion);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-ios-blue/5 active:bg-ios-blue/10 border-b border-black/[0.05] dark:border-white/[0.06] last:border-none flex items-start gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-ios-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={15} className="text-ios-blue" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate">{primary}</div>
                      <div className="text-[11px] text-ios-systemGray font-medium truncate">{secondary}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {locationStatus === 'error' && (
          <p className="text-[11px] font-semibold text-ios-systemRed mt-2">
            {locationError}
          </p>
        )}
      </div>

      <div className="absolute bottom-24 left-4 z-[90] glass-panel rounded-2xl px-4 py-2.5 shadow-lg safe-area-bottom">
        <div className="text-[10px] font-bold uppercase tracking-wide text-ios-systemGray">
          {userLocation ? 'Live location enabled' : 'Location not granted'}
        </div>
      </div>

      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={13}
        className="w-full h-full relative z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToLocation center={mapCenter} zoom={14} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationMarkerIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {filteredListings.map((listing) => {
          const distanceText = userLocation
            ? formatDistanceKm(haversineDistanceKm(userLocation, { lat: listing.location.lat, lng: listing.location.lng }))
            : listing.location.distance;

          return (
            <Marker key={listing.id} position={[listing.location.lat, listing.location.lng]} icon={listingMarkerIcon}>
              <Popup>
                <div className="min-w-[210px]">
                  <p className="text-sm font-black mb-0.5">{listing.title}</p>
                  <p className="text-[11px] text-ios-systemGray font-semibold mb-1">by {listing.donor.name}</p>
                  <p className="text-[11px] text-ios-systemGray font-semibold mb-1">{listing.location.address}</p>
                  <p className="text-[11px] font-bold text-ios-blue mb-2">{distanceText}</p>
                  <button
                    onClick={() => onClaim(listing.id)}
                    className="w-full h-9 rounded-xl bg-ios-blue text-white text-[11px] font-black uppercase tracking-wide"
                  >
                    Claim Now
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
