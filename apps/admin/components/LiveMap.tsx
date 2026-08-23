'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  ExternalLink,
  Plus,
  Minus,
  Store,
  Send,
  Navigation,
} from 'lucide-react';
import { formatGHS } from '@rose/shared';

const OSU_STORE_COORDS = { lat: 5.5560, lng: -0.1810, name: 'TOBI CLOTHINGS Flagship (Osu)' };

interface LiveMapProps {
  lat?: number | null;
  lng?: number | null;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  addressLabel?: string;
  totalP?: number;
  height?: string | number;
  className?: string;
}

export function LiveMap({
  lat = 5.6037,
  lng = -0.1870,
  orderNumber,
  customerName,
  customerPhone,
  addressLabel,
  totalP,
  height = 280,
  className = '',
}: LiveMapProps) {
  const currentLat = lat ?? 5.6037;
  const currentLng = lng ?? -0.1870;

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: currentLat, lng: currentLng });
  const [mapZoom, setMapZoom] = useState<number>(14);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; lat: number; lng: number }>({ x: 0, y: 0, lat: currentLat, lng: currentLng });

  useEffect(() => {
    if (lat && lng) {
      setMapCenter({ lat, lng });
    }
  }, [lat, lng]);

  const lon2tile = (lon: number, z: number) => ((lon + 180) / 360) * Math.pow(2, z);
  const lat2tile = (latVal: number, z: number) =>
    ((1 - Math.log(Math.tan((latVal * Math.PI) / 180) + 1 / Math.cos((latVal * Math.PI) / 180)) / Math.PI) / 2) *
    Math.pow(2, z);

  const tile2lon = (x: number, z: number) => (x / Math.pow(2, z)) * 360 - 180;
  const tile2lat = (y: number, z: number) => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, lat: mapCenter.lat, lng: mapCenter.lng };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const startTileX = lon2tile(dragStart.current.lng, mapZoom);
    const startTileY = lat2tile(dragStart.current.lat, mapZoom);

    setMapCenter({
      lat: tile2lat(startTileY - dy / 256, mapZoom),
      lng: tile2lon(startTileX - dx / 256, mapZoom),
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const getPixelPosition = (coordLat: number, coordLng: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const centerTileX = lon2tile(mapCenter.lng, mapZoom);
    const centerTileY = lat2tile(mapCenter.lat, mapZoom);

    const targetTileX = lon2tile(coordLng, mapZoom);
    const targetTileY = lat2tile(coordLat, mapZoom);

    return {
      x: centerX + (targetTileX - centerTileX) * 256,
      y: centerY + (targetTileY - centerTileY) * 256,
    };
  };

  const customerPinPixel = lat && lng ? getPixelPosition(lat, lng) : null;
  const storePinPixel = getPixelPosition(OSU_STORE_COORDS.lat, OSU_STORE_COORDS.lng);

  const centerTileX = Math.floor(lon2tile(mapCenter.lng, mapZoom));
  const centerTileY = Math.floor(lat2tile(mapCenter.lat, mapZoom));
  const tileOffsetX = (lon2tile(mapCenter.lng, mapZoom) - centerTileX) * 256;
  const tileOffsetY = (lat2tile(mapCenter.lat, mapZoom) - centerTileY) * 256;

  const gMapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : `https://www.google.com/maps?q=${currentLat},${currentLng}`;

  const riderMsg = encodeURIComponent(
    `*DISPATCH DETAILS — ${orderNumber || 'Order'}*\n` +
    `Customer: ${customerName || customerPhone || 'Customer'}\n` +
    `Phone: ${customerPhone || ''}\n` +
    `Address: ${addressLabel || 'See map pin'}\n` +
    (lat && lng ? `Live GPS Pin: https://www.google.com/maps?q=${lat},${lng}\n` : '') +
    (totalP ? `Total Amount: ${formatGHS(totalP)}` : '')
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-sand/60 bg-[#E8ECEF] shadow-sm select-none ${className}`}>
      {/* Map Header Action Bar */}
      <div className="flex items-center justify-between border-b border-sand/40 bg-white/95 backdrop-blur-xs px-4 py-2.5 z-20 relative">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-charcoal">
            {lat && lng ? 'Live GPS Location' : 'Default Area View'}
          </span>
          {lat && lng && (
            <span className="font-mono text-[10px] text-charcoal/50">
              ({lat.toFixed(4)}, {lng.toFixed(4)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={gMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-sand/80 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo hover:bg-sand/10 transition shadow-2xs"
          >
            <ExternalLink size={11} /> Google Maps
          </a>
          <a
            href={`https://wa.me/?text=${riderMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 transition shadow-2xs"
          >
            <Send size={11} /> Send to Rider
          </a>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ height }}
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Render Map Tiles */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `translate(-${tileOffsetX}px, -${tileOffsetY}px)` }}
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
                  src={`https://tile.openstreetmap.org/${mapZoom}/${tx}/${ty}.png`}
                  alt="map tile"
                  loading="lazy"
                  className="absolute h-[256px] w-[256px] object-cover pointer-events-none"
                  style={{ left: `${(dx + 1) * 256}px`, top: `${(dy + 1) * 256}px` }}
                />
              );
            })
          )}
        </div>

        {/* Store Flagship Marker */}
        {storePinPixel && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ left: `${storePinPixel.x}px`, top: `${storePinPixel.y}px` }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-indigo px-2 py-0.5 text-[9px] font-bold text-white shadow-md uppercase tracking-wider mb-1 whitespace-nowrap border border-white">
                Osu Store
              </div>
              <div className="h-6 w-6 rounded-full bg-indigo text-white flex items-center justify-center shadow-lg border-2 border-white">
                <Store size={12} />
              </div>
            </div>
          </div>
        )}

        {/* Customer Delivery Pin Marker */}
        {customerPinPixel && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none animate-bounce"
            style={{ left: `${customerPinPixel.x}px`, top: `${customerPinPixel.y}px` }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-md whitespace-nowrap mb-1 border border-white">
                Customer Pin
              </div>
              <div className="relative">
                <MapPin size={32} className="text-emerald-600 drop-shadow-md fill-emerald-500 stroke-white stroke-2" />
                <span className="absolute left-1/2 top-[10px] -translate-x-1/2 h-2 w-2 rounded-full bg-white animate-ping" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1 shadow-md">
        <button
          type="button"
          onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
          className="h-7 w-7 rounded-lg bg-white/95 text-charcoal hover:bg-sand/20 flex items-center justify-center border border-sand/80 shadow-2xs transition"
          title="Zoom In"
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          onClick={() => setMapZoom((z) => Math.max(10, z - 1))}
          className="h-7 w-7 rounded-lg bg-white/95 text-charcoal hover:bg-sand/20 flex items-center justify-center border border-sand/80 shadow-2xs transition"
          title="Zoom Out"
        >
          <Minus size={13} />
        </button>
      </div>
    </div>
  );
}
