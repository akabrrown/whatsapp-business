'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  Building,
  Compass,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronDown,
  Info,
} from 'lucide-react';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface LocationSelection {
  zoneName: string;
  feeP: number;
  lat?: number | null;
  lng?: number | null;
  address?: string;
  landmark?: string;
  ghanaPost?: string;
}

interface SmartLocationSelectorProps {
  selectedZone?: { name: string; feeP: number } | null;
  coords?: { lat: number; lng: number } | null;
  addressText?: string;
  onLocationSelect: (loc: LocationSelection) => void;
  className?: string;
}

const DEFAULT_ZONES = [
  { name: 'East Legon', feeP: 2500, tag: 'Most Popular', lat: 5.6360, lng: -0.1840 },
  { name: 'Osu / Oxford St', feeP: 2000, tag: 'Flagship Area', lat: 5.5560, lng: -0.1810 },
  { name: 'Airport Residential', feeP: 2500, tag: 'Fast Dispatch', lat: 5.6050, lng: -0.1710 },
  { name: 'Cantonments & Labone', feeP: 2000, tag: 'Central Accra', lat: 5.5770, lng: -0.1730 },
  { name: 'Spintex & Sakumono', feeP: 3000, tag: 'Express Route', lat: 5.6310, lng: -0.1290 },
  { name: 'Dzorwulu & Roman Ridge', feeP: 2500, tag: 'Central', lat: 5.6080, lng: -0.1980 },
  { name: 'Madina & Adenta', feeP: 3000, tag: 'Accra North', lat: 5.6830, lng: -0.1660 },
  { name: 'Dansoman & Korle Bu', feeP: 3000, tag: 'Accra West', lat: 5.5580, lng: -0.2540 },
  { name: 'Tema Communities', feeP: 4000, tag: 'Greater Accra', lat: 5.6690, lng: -0.0170 },
  { name: 'Achimota & Dome', feeP: 3000, tag: 'Fast Route', lat: 5.6200, lng: -0.2280 },
];

export function SmartLocationSelector({
  selectedZone,
  coords,
  addressText = '',
  onLocationSelect,
  className = '',
}: SmartLocationSelectorProps) {
  const [activeTab, setActiveTab] = useState<'popular' | 'search' | 'gps'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ displayName: string; lat: number; lng: number; suburb?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [landmarkNote, setLandmarkNote] = useState(addressText);
  const [zonesList, setZonesList] = useState(DEFAULT_ZONES);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch live zones configured by admin
  useEffect(() => {
    fetch(`${API}/api/zones`)
      .then((r) => r.json())
      .then((d) => {
        if (d.zones && Array.isArray(d.zones) && d.zones.length > 0) {
          setZonesList((prev) => {
            const map = new Map<string, { name: string; feeP: number }>(d.zones.map((z: any) => [z.name.toLowerCase(), z]));
            return prev.map((pz) => {
              const matched = map.get(pz.name.toLowerCase());
              return matched ? { ...pz, feeP: matched.feeP, name: matched.name } : pz;
            });
          });
        }
      })
      .catch(() => {});
  }, []);

  // Handle Quick Zone Selection
  const handleZoneClick = (z: (typeof DEFAULT_ZONES)[0]) => {
    onLocationSelect({
      zoneName: z.name,
      feeP: z.feeP,
      lat: z.lat,
      lng: z.lng,
      address: landmarkNote || z.name,
    });
  };

  // Search places via Nominatim API
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (!text.trim() || text.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/geocode/search?q=${encodeURIComponent(text + ', Accra, Ghana')}`).then((r) => r.json());
        if (res.results && Array.isArray(res.results)) {
          setSearchResults(res.results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectSearchResult = async (item: { displayName: string; lat: number; lng: number; suburb?: string }) => {
    setSearching(true);
    try {
      const matchRes = await fetch(`${API}/api/zones/match-pin?lat=${item.lat}&lng=${item.lng}`).then((r) => r.json());
      const zoneName = matchRes?.match?.zone?.name || item.suburb || 'Accra Area';
      const feeP = matchRes?.match?.zone?.feeP ?? 2500;
      const cleanAddress = item.displayName.split(',').slice(0, 3).join(', ');

      setLandmarkNote(cleanAddress);
      onLocationSelect({
        zoneName,
        feeP,
        lat: item.lat,
        lng: item.lng,
        address: cleanAddress,
      });
      setSearchResults([]);
      setSearchQuery(cleanAddress);
    } catch {
      onLocationSelect({
        zoneName: item.suburb || 'Accra Area',
        feeP: 2500,
        lat: item.lat,
        lng: item.lng,
        address: item.displayName,
      });
    } finally {
      setSearching(false);
    }
  };

  // 1-Tap Device GPS Geolocation
  const handleLiveGPS = () => {
    setGpsLoading(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const matchRes = await fetch(`${API}/api/zones/match-pin?lat=${latitude}&lng=${longitude}`).then((r) => r.json());
          const match = matchRes?.match;
          const zoneName = match?.zone?.name || match?.suburb || 'Accra Central';
          const feeP = match?.zone?.feeP ?? 2500;
          const detectedAddress = match?.address || match?.displayName || `${zoneName}, Accra`;

          setLandmarkNote(detectedAddress);
          onLocationSelect({
            zoneName,
            feeP,
            lat: latitude,
            lng: longitude,
            address: detectedAddress,
          });
        } catch {
          onLocationSelect({
            zoneName: 'Accra Area',
            feeP: 2500,
            lat: latitude,
            lng: longitude,
            address: `GPS Pin (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          });
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError('Location permission denied. Please pick your neighborhood below.');
        } else {
          setGpsError('Unable to detect location. Please select your area below.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Segmented Mode Selector */}
      <div className="flex rounded-2xl bg-sand/30 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('popular')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
            activeTab === 'popular'
              ? 'bg-white text-indigo font-bold shadow-xs'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <Building size={14} />
          <span>Neighborhoods</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
            activeTab === 'search'
              ? 'bg-white text-indigo font-bold shadow-xs'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <Search size={14} />
          <span>Search Landmark</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('gps');
            handleLiveGPS();
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
            activeTab === 'gps'
              ? 'bg-white text-indigo font-bold shadow-xs'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          <Navigation size={14} className={gpsLoading ? 'animate-spin text-indigo' : ''} />
          <span>Use GPS</span>
        </button>
      </div>

      {/* Tab 1: Popular Accra Neighborhoods (Instant Selection Grid) */}
      {activeTab === 'popular' && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal/50">
            Select Your Delivery Area (Accra)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {zonesList.map((z) => {
              const isSelected = selectedZone?.name?.toLowerCase() === z.name.toLowerCase();
              return (
                <button
                  key={z.name}
                  type="button"
                  onClick={() => handleZoneClick(z)}
                  className={`group relative flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                    isSelected
                      ? 'border-indigo bg-indigo/5 text-indigo shadow-xs ring-1 ring-indigo/30'
                      : 'border-sand/70 bg-white hover:border-indigo/40 hover:bg-sand/10 text-charcoal'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs font-bold truncate pr-1">{z.name}</span>
                    {isSelected ? (
                      <span className="h-4 w-4 rounded-full bg-indigo text-white flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono text-charcoal/50">
                        {formatGHS(z.feeP)}
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-[10px] text-charcoal/50 flex items-center gap-1">
                    <Compass size={10} className="text-indigo/60" /> {z.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Landmark & Street Search */}
      {activeTab === 'search' && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal/50">
            Search Any Accra Landmark or Street
          </p>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="e.g. American House, A&C Mall, Spintex Shell, Kotoka Airport…"
              className="w-full rounded-xl border border-sand/80 bg-white pl-10 pr-10 py-3 text-xs text-charcoal outline-none focus:border-indigo shadow-2xs"
            />
            <Search size={16} className="absolute left-3.5 top-3.5 text-charcoal/40" />
            {searching && (
              <Loader2 size={16} className="absolute right-3.5 top-3.5 animate-spin text-indigo" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="rounded-2xl border border-sand/70 bg-white p-1.5 shadow-md divide-y divide-sand/30 max-h-56 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSearchResult(r)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-indigo/5 transition flex items-start gap-2.5 text-xs text-charcoal"
                >
                  <MapPin size={15} className="text-indigo mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-charcoal truncate">{r.displayName.split(',')[0]}</p>
                    <p className="text-[10px] text-charcoal/50 truncate">{r.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: 1-Tap Live GPS */}
      {activeTab === 'gps' && (
        <div className="rounded-2xl border border-sand/70 bg-sand/10 p-4 text-center space-y-3">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo/10 text-indigo shadow-inner">
            <span className="absolute inset-0 rounded-full bg-indigo/20 animate-ping opacity-60" />
            <Navigation size={24} className={gpsLoading ? 'animate-spin' : ''} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-charcoal">
              {gpsLoading ? 'Acquiring High-Accuracy GPS…' : 'Device Location Detected'}
            </h4>
            <p className="text-[11px] text-charcoal/60 mt-0.5">
              {gpsError || 'We pinpoint your exact coordinates for the dispatch rider.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLiveGPS}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2 text-xs font-bold text-white hover:bg-indigo-deep transition shadow-xs disabled:opacity-50"
          >
            <Navigation size={13} />
            <span>{gpsLoading ? 'Detecting…' : 'Refresh GPS Location'}</span>
          </button>
        </div>
      )}

      {/* Specific Street Address / GhanaPost / Landmark Input */}
      <div className="pt-2 border-t border-sand/30 space-y-1.5">
        <label className="text-xs font-bold text-charcoal flex items-center justify-between">
          <span>Street Address / Landmark (Optional)</span>
          <span className="text-[10px] font-normal text-charcoal/50">e.g. Gate color, House number</span>
        </label>
        <input
          type="text"
          value={landmarkNote}
          onChange={(e) => {
            setLandmarkNote(e.target.value);
            if (selectedZone) {
              onLocationSelect({
                zoneName: selectedZone.name,
                feeP: selectedZone.feeP,
                lat: coords?.lat,
                lng: coords?.lng,
                address: e.target.value,
              });
            }
          }}
          placeholder="e.g. Near American House, House #14, Green gate"
          className="w-full rounded-xl border border-sand/80 bg-white px-3.5 py-2.5 text-xs text-charcoal outline-none focus:border-indigo shadow-2xs"
        />
      </div>

      {/* Confirmed Location Badge */}
      {selectedZone && (
        <div className="rounded-2xl border border-emerald-600/20 bg-emerald-50/70 p-3.5 text-xs flex items-center justify-between gap-3 text-emerald-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check size={14} strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-emerald-900 truncate">
                Delivery to {selectedZone.name}
              </p>
              <p className="text-[10px] text-emerald-800/80 truncate">
                {landmarkNote || 'Standard Delivery (~25–45 mins)'}
              </p>
            </div>
          </div>
          <span className="font-bold font-mono text-xs text-emerald-900 shrink-0">
            {formatGHS(selectedZone.feeP)}
          </span>
        </div>
      )}
    </div>
  );
}
