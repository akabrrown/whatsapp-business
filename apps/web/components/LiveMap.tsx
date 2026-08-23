'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Plus,
  Minus,
  RotateCcw,
  Store,
  Layers,
  Search,
  Check,
  Compass,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const OSU_STORE_COORDS = { lat: 5.5560, lng: -0.1810, name: 'TOBI CLOTHINGS Flagship (Osu)' };

interface LiveMapProps {
  lat?: number | null;
  lng?: number | null;
  addressLabel?: string;
  zoom?: number;
  height?: string | number;
  interactive?: boolean;
  showStore?: boolean;
  onLocationChange?: (loc: { lat: number; lng: number; address?: string; suburb?: string; zoneName?: string; feeP?: number }) => void;
  className?: string;
}

export function LiveMap({
  lat = 5.6037, // Default Accra Center
  lng = -0.1870,
  addressLabel,
  zoom = 14,
  height = 240,
  interactive = true,
  showStore = true,
  onLocationChange,
  className = '',
}: LiveMapProps) {
  const currentLat = lat ?? 5.6037;
  const currentLng = lng ?? -0.1870;

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: currentLat, lng: currentLng });
  const [mapZoom, setMapZoom] = useState<number>(zoom);
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );
  const [mapType, setMapType] = useState<'standard' | 'humanitarian'>('standard');
  const [resolving, setResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(addressLabel || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; lat: number; lng: number }>({ x: 0, y: 0, lat: currentLat, lng: currentLng });

  // Synchronize incoming lat/lng
  useEffect(() => {
    if (lat && lng) {
      setPinCoords({ lat, lng });
      setMapCenter({ lat, lng });
    }
  }, [lat, lng]);

  useEffect(() => {
    if (addressLabel) setResolvedAddress(addressLabel);
  }, [addressLabel]);

  // Convert GPS Coordinates to OpenStreetMap Slippy Map Tile numbers
  const lon2tile = (lon: number, z: number) => ((lon + 180) / 360) * Math.pow(2, z);
  const lat2tile = (latVal: number, z: number) =>
    ((1 - Math.log(Math.tan((latVal * Math.PI) / 180) + 1 / Math.cos((latVal * Math.PI) / 180)) / Math.PI) / 2) *
    Math.pow(2, z);

  const tile2lon = (x: number, z: number) => (x / Math.pow(2, z)) * 360 - 180;
  const tile2lat = (y: number, z: number) => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  // Reverse geocode when pin moves
  const resolveLocation = useCallback(
    async (coords: { lat: number; lng: number }) => {
      if (!onLocationChange) return;
      setResolving(true);
      try {
        const res = await fetch(`${API}/api/zones/match-pin?lat=${coords.lat}&lng=${coords.lng}`).then((r) => r.json());
        if (res.match) {
          const m = res.match;
          const display = m.address || m.displayName || m.zone?.name || 'Accra Area';
          setResolvedAddress(display);
          onLocationChange({
            lat: coords.lat,
            lng: coords.lng,
            address: display,
            suburb: m.suburb || m.zone?.name,
            zoneName: m.zone?.name,
            feeP: m.zone?.feeP,
          });
        }
      } catch {
        // Fallback
      } finally {
        setResolving(false);
      }
    },
    [onLocationChange]
  );

  // Handle map click to drop/move pin
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const tileX = lon2tile(mapCenter.lng, mapZoom);
    const tileY = lat2tile(mapCenter.lat, mapZoom);

    const pixelOffsetX = clickX - centerX;
    const pixelOffsetY = clickY - centerY;

    const newTileX = tileX + pixelOffsetX / 256;
    const newTileY = tileY + pixelOffsetY / 256;

    const newLng = tile2lon(newTileX, mapZoom);
    const newLat = tile2lat(newTileY, mapZoom);

    const newCoords = { lat: newLat, lng: newLng };
    setPinCoords(newCoords);
    resolveLocation(newCoords);
  };

  // Dragging logic for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, lat: mapCenter.lat, lng: mapCenter.lng };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !interactive || !containerRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const startTileX = lon2tile(dragStart.current.lng, mapZoom);
    const startTileY = lat2tile(dragStart.current.lat, mapZoom);

    const newTileX = startTileX - dx / 256;
    const newTileY = startTileY - dy / 256;

    setMapCenter({
      lat: tile2lat(newTileY, mapZoom),
      lng: tile2lon(newTileX, mapZoom),
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Calculate pixel positions for active pin and store pin relative to map center
  const getPixelPosition = (coordLat: number, coordLng: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const centerTileX = lon2tile(mapCenter.lng, mapZoom);
    const centerTileY = lat2tile(mapCenter.lat, mapZoom);

    const targetTileX = lon2tile(coordLng, mapZoom);
    const targetTileY = lat2tile(coordLat, mapZoom);

    const x = centerX + (targetTileX - centerTileX) * 256;
    const y = centerY + (targetTileY - centerTileY) * 256;

    return { x, y };
  };

  // Geolocation trigger
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setResolving(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(coords);
        setPinCoords(coords);
        setMapZoom(15);
        resolveLocation(coords);
      },
      () => setResolving(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Forward search in Accra
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API}/api/geocode/search?q=${encodeURIComponent(searchQuery.trim())}`).then((r) => r.json());
      if (res.results && res.results.length > 0) {
        const top = res.results[0];
        const coords = { lat: top.lat, lng: top.lng };
        setMapCenter(coords);
        setPinCoords(coords);
        setMapZoom(15);
        resolveLocation(coords);
      }
    } catch {}
    setIsSearching(false);
  };

  const activePinPixel = pinCoords ? getPixelPosition(pinCoords.lat, pinCoords.lng) : null;
  const storePinPixel = showStore ? getPixelPosition(OSU_STORE_COORDS.lat, OSU_STORE_COORDS.lng) : null;

  // External Google Maps directions URL
  const gMapsUrl = pinCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${OSU_STORE_COORDS.lat},${OSU_STORE_COORDS.lng}&destination=${pinCoords.lat},${pinCoords.lng}`
    : `https://www.google.com/maps?q=${currentLat},${currentLng}`;

  // Slippy tile grid calculation (3x3 grid around center)
  const centerTileX = Math.floor(lon2tile(mapCenter.lng, mapZoom));
  const centerTileY = Math.floor(lat2tile(mapCenter.lat, mapZoom));
  const tileOffsetX = (lon2tile(mapCenter.lng, mapZoom) - centerTileX) * 256;
  const tileOffsetY = (lat2tile(mapCenter.lat, mapZoom) - centerTileY) * 256;

  const tileBaseUrl =
    mapType === 'humanitarian'
      ? 'https://a.tile.openstreetmap.fr/hot'
      : 'https://tile.openstreetmap.org';

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-sand/60 bg-[#E8ECEF] shadow-sm select-none ${className}`}>
      {/* Map Search Bar */}
      {interactive && (
        <div className="absolute top-3 left-3 right-12 z-20">
          <form onSubmit={handleSearchAddress} className="flex items-center gap-1.5 shadow-md rounded-xl bg-white/95 backdrop-blur-xs p-1 border border-sand/80">
            <Search size={14} className="text-charcoal/40 ml-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Accra area, street, or landmark…"
              className="w-full bg-transparent px-2 py-1 text-xs text-charcoal outline-none placeholder:text-charcoal/40"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="rounded-lg bg-indigo px-3 py-1 text-[11px] font-bold text-white hover:bg-indigo-deep disabled:opacity-40 transition shrink-0"
            >
              {isSearching ? '…' : 'Find'}
            </button>
          </form>
        </div>
      )}

      {/* Map Viewport Canvas */}
      <div
        ref={containerRef}
        onClick={handleMapClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ height }}
        className="relative w-full overflow-hidden cursor-crosshair active:cursor-grabbing"
      >
        {/* Render Map Tiles */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(-${tileOffsetX}px, -${tileOffsetY}px)`,
          }}
        >
          {[-1, 0, 1, 2].map((dx) =>
            [-1, 0, 1, 2].map((dy) => {
              const tx = centerTileX + dx;
              const ty = centerTileY + dy;
              const maxTile = Math.pow(2, mapZoom);
              if (tx < 0 || tx >= maxTile || ty < 0 || ty >= maxTile) return null;

              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${tx}-${ty}-${mapZoom}`}
                  src={`${tileBaseUrl}/${mapZoom}/${tx}/${ty}.png`}
                  alt="map tile"
                  loading="lazy"
                  className="absolute h-[256px] w-[256px] object-cover pointer-events-none transition-opacity duration-200"
                  style={{
                    left: `${(dx + 1) * 256}px`,
                    top: `${(dy + 1) * 256}px`,
                  }}
                />
              );
            })
          )}
        </div>

        {/* Store Flagship Marker */}
        {showStore && storePinPixel && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none transition-transform duration-100"
            style={{ left: `${storePinPixel.x}px`, top: `${storePinPixel.y}px` }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-indigo px-2 py-0.5 text-[9px] font-bold text-white shadow-md uppercase tracking-wider mb-1 whitespace-nowrap border border-white/80">
                Osu Store
              </div>
              <div className="h-6 w-6 rounded-full bg-indigo text-white flex items-center justify-center shadow-lg border-2 border-white">
                <Store size={12} />
              </div>
            </div>
          </div>
        )}

        {/* Customer Active Delivery Pin */}
        {activePinPixel && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none transition-transform duration-100 animate-bounce"
            style={{ left: `${activePinPixel.x}px`, top: `${activePinPixel.y}px` }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-md whitespace-nowrap mb-1 border border-white/80">
                Delivery Pin
              </div>
              <div className="relative">
                <MapPin size={32} className="text-emerald-600 drop-shadow-md fill-emerald-500 stroke-white stroke-2" />
                <span className="absolute left-1/2 top-[10px] -translate-x-1/2 h-2 w-2 rounded-full bg-white animate-ping" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Map Controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5 shadow-md">
        <button
          type="button"
          onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
          className="h-8 w-8 rounded-xl bg-white/95 text-charcoal hover:bg-sand/20 flex items-center justify-center border border-sand/80 shadow-xs transition"
          title="Zoom In"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={() => setMapZoom((z) => Math.max(10, z - 1))}
          className="h-8 w-8 rounded-xl bg-white/95 text-charcoal hover:bg-sand/20 flex items-center justify-center border border-sand/80 shadow-xs transition"
          title="Zoom Out"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={handleLocateMe}
          className="h-8 w-8 rounded-xl bg-white/95 text-indigo hover:bg-indigo/10 flex items-center justify-center border border-sand/80 shadow-xs transition"
          title="Locate My GPS Position"
        >
          <Navigation size={14} className={resolving ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Map Bottom Attribution & Address Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sand/40 bg-white/95 backdrop-blur-xs px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="truncate font-semibold text-charcoal text-[11px]">
            {resolving ? 'Detecting address…' : resolvedAddress || 'Accra Location'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={gMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-[10px] text-indigo hover:underline"
          >
            <ExternalLink size={10} /> Google Maps
          </a>
          <span className="text-[9px] text-charcoal/40 font-mono">© OpenStreetMap</span>
        </div>
      </div>
    </div>
  );
}
