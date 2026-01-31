import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom'; // <--- IMPORT THIS
import { getAvailableDeliveries, acceptDeliveryJob, completeDeliveryJob, updateDeliveryLocation } from '../utils/api';
import ChatWidget from '../components/ChatWidget';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Helper: Recenter map when rider moves
const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

const RiderPage = () => {
    const [isOnline, setIsOnline] = useState(false);
    const [activeJob, setActiveJob] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [myLocation, setMyLocation] = useState(null);
    const [gpsStatus, setGpsStatus] = useState("Waiting for GPS...");
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    const ws = useRef(null);
    const watchId = useRef(null);

    // 1. Load Data
    const loadJobs = () => {
        getAvailableDeliveries().then(res => {
            const data = res.data.results || res.data;

            // SMART CHECK: Check if I am already 'shipped' (In Transit)
            const ongoing = data.find(j => j.status === 'shipped');

            if (ongoing) {
                setActiveJob(ongoing);
                setIsOnline(true);
                setJobs([]);
            } else {
                setActiveJob(null);
                setJobs(data.filter(j => j.status === 'paid'));
            }
        }).catch(err => console.error("Error loading jobs:", err));
    };

    // Initial Load
    useEffect(() => {
        loadJobs();
        return () => stopTracking();
    }, []);

    // Poll for new jobs
    useEffect(() => {
        const interval = setInterval(() => {
            if (isOnline && !activeJob) loadJobs();
        }, 8000);
        return () => clearInterval(interval);
    }, [isOnline, activeJob]);

    // 2. Tracking System
    useEffect(() => {
        if (activeJob) {
            startTracking();
            connectWebSocket(activeJob.id);
        } else {
            stopTracking();
            if (ws.current) ws.current.close();
        }
    }, [activeJob]);

    const connectWebSocket = (deliveryId) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use Backend Port 8000
        const wsUrl = `${protocol}//127.0.0.1:8000/ws/delivery/${deliveryId}/`;

        ws.current = new WebSocket(wsUrl);
        ws.current.onopen = () => console.log("✅ Rider Socket Connected");
    };

    const startTracking = () => {
        if (!navigator.geolocation) return alert("GPS Required!");

        setGpsStatus("Locating...");

        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, heading } = pos.coords;
                setMyLocation([latitude, longitude]);
                setGpsStatus("Broadcasting 📡");

                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        latitude, longitude, heading, status: 'shipped'
                    }));
                }

                if (activeJob) {
                    updateDeliveryLocation(activeJob.id, { lat: latitude, lng: longitude }).catch(() => { });
                }
            },
            (err) => setGpsStatus("❌ GPS Error: " + err.message),
            { enableHighAccuracy: true, maximumAge: 0 }
        );
    };

    const stopTracking = () => {
        if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };

    const handleAccept = async (id) => {
        try {
            await acceptDeliveryJob(id);
            loadJobs();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to accept job.");
            loadJobs();
        }
    };

    const handleComplete = async () => {
        if (confirm("Confirm Delivery?")) {
            await completeDeliveryJob(activeJob.id);
            setActiveJob(null);
            loadJobs();
            alert("✅ Job Done!");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans flex flex-col">
            {/* Header */}
            {!isMapExpanded && (
                <div className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-xl z-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Rider App</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-slate-400 text-sm">
                                    {activeJob ? <span className="text-blue-400 font-bold animate-pulse">● ON DUTY</span> :
                                        isOnline ? <span className="text-green-400 font-bold">● ONLINE</span> : 'OFFLINE'}
                                </p>
                                {/* --- NEW: WALLET LINK --- */}
                                <Link to="/rider/earnings" className="text-xs bg-slate-800 hover:bg-slate-700 text-green-400 px-3 py-1 rounded-full border border-slate-700 transition flex items-center gap-1">
                                    <span>💰</span> Wallet
                                </Link>
                            </div>
                        </div>
                        {/* Toggle */}
                        {!activeJob && (
                            <button onClick={() => setIsOnline(!isOnline)} className={`w-14 h-8 rounded-full p-1 transition-all ${isOnline ? 'bg-green-500' : 'bg-slate-600'}`}>
                                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${isOnline ? 'translate-x-6' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className={`flex-1 relative ${!isMapExpanded ? '-mt-4 px-4' : ''} z-30`}>

                {activeJob ? (
                    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col ${isMapExpanded ? 'h-screen fixed inset-0 z-50 rounded-none' : ''}`}>

                        {/* Map Section */}
                        <div className={`relative ${isMapExpanded ? 'flex-1' : 'h-64'} bg-gray-200`}>
                            {myLocation ? (
                                <MapContainer center={myLocation} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={myLocation}><Popup>You</Popup></Marker>
                                    <RecenterMap lat={myLocation[0]} lng={myLocation[1]} />
                                </MapContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500 bg-gray-100">
                                    <div className="text-center">
                                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
                                        <p>Acquiring GPS...</p>
                                    </div>
                                </div>
                            )}

                            <button onClick={() => setIsMapExpanded(!isMapExpanded)} className="absolute top-4 right-4 bg-white p-2 rounded shadow z-[1000] text-xs font-bold">
                                {isMapExpanded ? 'Minimize ↘' : 'Maximize ↖'}
                            </button>

                            <div className="absolute bottom-4 left-4 bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-bold shadow z-[1000] opacity-90">
                                {gpsStatus}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 bg-white border-t">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">Current Delivery</h2>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">#{activeJob.tracking_code}</span>
                                </div>
                                <span className="text-xl font-extrabold text-green-600">KSh {activeJob.transport_cost}</span>
                            </div>

                            <div className="space-y-6 mb-6 text-sm">
                                {/* PICKUP SECTION */}
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center pt-1"><div className="w-2 h-2 bg-slate-800 rounded-full"></div><div className="w-0.5 h-full bg-slate-200"></div></div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400 font-bold">PICKUP</p>
                                        <p className="font-medium text-gray-900 mb-1">{activeJob.pickup_location}</p>
                                        {activeJob.pickup_contact && (
                                            <a href={`tel:${activeJob.pickup_contact}`} className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 px-2 py-1 rounded border transition">
                                                📞 {activeJob.pickup_contact} (Call)
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* DROPOFF SECTION */}
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center pt-1"><div className="w-0.5 h-full bg-slate-200"></div><div className="w-2 h-2 bg-green-500 rounded-full"></div></div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400 font-bold">DROPOFF</p>
                                        <p className="font-medium text-gray-900 mb-1">{activeJob.dropoff_location}</p>
                                        {activeJob.dropoff_contact && (
                                            <a href={`tel:${activeJob.dropoff_contact}`} className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 px-2 py-1 rounded border transition">
                                                📞 {activeJob.dropoff_contact} (Call)
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleComplete} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition active:scale-95">
                                ✅ Mark Delivered
                            </button>
                        </div>
                    </div>
                ) : (
                    /* JOB LIST */
                    <div className="space-y-4 pt-4">
                        {isOnline && jobs.length === 0 && (
                            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-gray-400 text-sm">Scanning for requests...</p>
                            </div>
                        )}
                        {!isOnline && (
                            <div className="text-center py-12 text-gray-400 bg-white rounded-xl">
                                <p>You are offline.</p>
                            </div>
                        )}

                        {isOnline && jobs.map(job => (
                            <div key={job.id} className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-blue-500 hover:shadow-lg transition">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                                        {job.swap ? 'SWAP' : 'DELIVERY'}
                                    </span>
                                    <span className="font-bold text-gray-900 text-lg">KSh {job.transport_cost}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                                    <div><span className="text-xs font-bold text-gray-400 block">FROM</span> {job.pickup_location}</div>
                                    <div><span className="text-xs font-bold text-gray-400 block">TO</span> {job.dropoff_location}</div>
                                </div>
                                <button onClick={() => handleAccept(job.id)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-black transition">
                                    Accept Job
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {activeJob && activeJob.conversation_id && (
                <ChatWidget conversationId={activeJob.conversation_id} />
            )}
        </div>
    );
};

export default RiderPage;