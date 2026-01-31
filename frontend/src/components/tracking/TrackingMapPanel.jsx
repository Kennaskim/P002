import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- ICONS ---
const IconFactory = (emoji) => L.divIcon({
    html: `<div style="background-color: white; border-radius: 50%; padding: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 24px; text-align: center; line-height: 1;">${emoji}</div>`,
    className: 'custom-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Helper: Auto-center map when coordinates change
const MapRecenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

// Helper: robustly handles map resizing
const MapResizer = () => {
    const map = useMap();

    useEffect(() => {
        // Create an observer to watch the map container for size changes
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });

        // Start observing the map's container
        const container = map.getContainer();
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [map]);

    return null;
};

const TrackingMapPanel = ({ geoCoords, routePath, isSwap, status, eta, isFullScreen, onToggleFullScreen }) => {
    const center = [-0.4167, 36.9500]; // Default Nyeri

    return (
        <div
            className={`transition-all duration-300 bg-gray-200 border border-gray-300 relative overflow-hidden ${isFullScreen
                ? '!fixed !inset-0 !z-[9999] !w-screen !h-screen !rounded-none m-0 p-0' // Force breakout
                : 'h-[500px] lg:h-full rounded-xl shadow-inner' // Normal Grid Mode
                }`}
        >
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Logic Helpers */}
                <MapResizer />
                {geoCoords.rider && <MapRecenter center={geoCoords.rider} />}

                {/* Markers */}
                {geoCoords.start && <Marker position={geoCoords.start} icon={IconFactory('📍')}><Popup>Start</Popup></Marker>}
                {geoCoords.end && <Marker position={geoCoords.end} icon={IconFactory('🏁')}><Popup>End</Popup></Marker>}

                {geoCoords.rider && (
                    <Marker position={geoCoords.rider} icon={IconFactory('🏍️')}>
                        <Popup>
                            <strong>Rider</strong><br />
                            {status === 'shipped' ? 'In Transit' : 'Connecting...'}
                        </Popup>
                    </Marker>
                )}

                {routePath && <Polyline positions={routePath} color={isSwap ? "#9333ea" : "#2563eb"} weight={5} opacity={0.7} />}
            </MapContainer>

            {/* --- OVERLAY CONTROLS --- */}
            {/* Top Bar (Status) */}
            <div className="absolute top-4 left-4 right-4 z-[10000] flex justify-between items-start pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-bold uppercase text-gray-700 pointer-events-auto">
                    {status}
                    {status === 'shipped' && eta && <span className="block text-xs text-green-600 normal-case font-extrabold">~{eta} min</span>}
                </div>

                {/* Toggle Button */}
                <button
                    onClick={onToggleFullScreen}
                    className="bg-white text-gray-800 p-3 rounded-full shadow-lg font-bold text-xl hover:bg-gray-100 pointer-events-auto active:scale-95 transition-transform"
                    aria-label="Toggle Full Screen"
                >
                    {isFullScreen ? '↙' : '↗'}
                </button>
            </div>

            {/* Bottom Floating Action Button (Mobile Friendly Exit) */}
            {isFullScreen && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center z-[10000] pointer-events-none">
                    <button
                        onClick={onToggleFullScreen}
                        className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm pointer-events-auto flex items-center gap-2 hover:bg-black transition active:scale-95"
                    >
                        <span>✕</span> Close Map
                    </button>
                </div>
            )}
        </div>
    );
};

export default TrackingMapPanel;