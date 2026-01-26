import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getDelivery, initiateMpesa, calculateDeliveryFee, updateDelivery, cancelDelivery } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import L from 'leaflet';

// --- CONSTANTS ---
const NYERI_LOCATIONS = [
    "Nyeri Town", "Ruring'u", "Skuta", "Kamakwa", "King'ong'o", "Nyaribo",
    "Karatina", "Othaya", "Mukurwe-ini", "Chaka", "Naromoru", "Kiganjo",
    "Mweiga", "Gatitu", "Marua", "Ihururu", "Giakanja", "Tetuh",
    "Dedan Kimathi University", "Nyeri PGH", "Mathari", "Mathira",
    "Endarasha", "Gia-akanja", "Wamagana", "Gakawa"
].sort();

const NYERI_CENTER = [-0.4167, 36.9500];

// --- ICONS ---
const IconFactory = (emoji) => L.divIcon({
    html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">${emoji}</div>`,
    className: 'custom-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const TrackingPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- EXPLICIT STATE FOR FIELDS (No "My Location" abstraction) ---
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');

    // Calculations
    const [calculatedCost, setCalculatedCost] = useState(0);
    const [eta, setEta] = useState(null);
    const [routePath, setRoutePath] = useState(null);
    const [geoCoords, setGeoCoords] = useState({ start: null, end: null, rider: null });

    // UI State
    const [paymentPhone, setPaymentPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState('delivery');

    // Ref to prevent infinite calculation loops
    const hasAutoCalculated = useRef(false);

    // --- 1. LOAD DATA ---
    useEffect(() => {
        if (!id || id === 'undefined') return navigate('/dashboard');

        const fetchData = async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const res = await getDelivery(id);
                const data = res.data;
                setDelivery(data);

                // Sync inputs only if empty (prevents overwriting user typing)
                if (!pickup) setPickup(data.pickup_location || '');
                if (!dropoff) setDropoff(data.dropoff_location || '');

                // Update cost if DB has value
                if (Number(data.transport_cost) > 0) {
                    setCalculatedCost(Number(data.transport_cost));
                }

                // Rider Position
                if (data.current_lat && data.current_lng) {
                    setGeoCoords(prev => ({ ...prev, rider: [data.current_lat, data.current_lng] }));
                }

                // Initial Visual Route
                if (!hasAutoCalculated.current && data.pickup_location && data.dropoff_location) {
                    hasAutoCalculated.current = true;
                    await runCalculation(data.pickup_location, data.dropoff_location, !!data.swap, false, true);
                }

                if (data.status === 'shipped') {
                    const baseTime = 15;
                    setEta(baseTime + Math.round((data.transport_cost / 30) * 2));
                }

            } catch (err) {
                console.error(err);
            } finally {
                if (!silent) setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(() => fetchData(true), 5000);
        return () => clearInterval(interval);
    }, [id]);

    // --- 2. PERMISSION LOGIC ---
    const getPermissions = () => {
        if (!delivery || !user) return { canEditPickup: false, canEditDropoff: false, role: 'viewer' };

        if (delivery.swap) {
            // SWAP: Sender edits Pickup, Receiver edits Dropoff
            if (user.id === delivery.swap.sender) {
                return { canEditPickup: true, canEditDropoff: false, role: 'Sender (Pickup)' };
            } else if (user.id === delivery.swap.receiver) {
                return { canEditPickup: false, canEditDropoff: true, role: 'Receiver (Dropoff)' };
            }
        } else {
            // ORDER: Buyer edits Dropoff, Pickup is fixed (Seller)
            if (user.id === delivery.orders?.[0]?.buyer) {
                return { canEditPickup: false, canEditDropoff: true, role: 'Buyer' };
            }
        }
        return { canEditPickup: false, canEditDropoff: false, role: 'Viewer' };
    };

    const { canEditPickup, canEditDropoff, role } = getPermissions();
    const isSwap = !!delivery?.swap;

    // --- 3. CALCULATION HANDLER ---
    const runCalculation = async (start, end, isSwapMode, saveToDb = false, drawOnly = false) => {
        try {
            const res = await calculateDeliveryFee(start, end, isSwapMode);

            if (!drawOnly) {
                setCalculatedCost(res.data.delivery_fee);
            }

            setGeoCoords(prev => ({
                ...prev,
                start: res.data.pickup_coords,
                end: res.data.dropoff_coords
            }));

            if (res.data.route_geometry?.coordinates) {
                setRoutePath(res.data.route_geometry.coordinates.map(c => [c[1], c[0]]));
            }

            if (saveToDb) {
                await updateDelivery(delivery.id, {
                    pickup_location: start,
                    dropoff_location: end,
                    transport_cost: res.data.delivery_fee
                });
            }
        } catch (err) {
            console.error("Calc Error", err);
        }
    };

    const handleUpdateRoute = (e) => {
        e.preventDefault();
        setProcessing(true);
        // Explicitly pass current 'pickup' and 'dropoff' state
        runCalculation(pickup, dropoff, isSwap, true).finally(() => setProcessing(false));
    };

    // --- 4. ACTIONS ---
    const handlePay = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (deliveryMode === 'meetup') {
                if (confirm("Confirm meetup? Delivery fee will be set to 0.")) {
                    await updateDelivery(delivery.id, { transport_cost: 0, status: 'pending' });
                    alert("Meetup Confirmed! Arrange a time in chat.");
                    setCalculatedCost(0);
                }
            } else {
                if (calculatedCost <= 0) {
                    setProcessing(false);
                    return alert("Please click 'Update Route' to calculate price first.");
                }

                // Ensure backend has latest cost
                await updateDelivery(delivery.id, { transport_cost: calculatedCost });

                await initiateMpesa({ delivery_id: delivery.id, phone_number: paymentPhone });
                alert("STK Push Sent! Check your phone.");
            }
        } catch (err) {
            alert("Action failed: " + (err.response?.data?.error || err.message));
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Cancel this order?")) return;
        try {
            await cancelDelivery(delivery.id);
            navigate('/dashboard');
        } catch (err) { alert("Failed to cancel."); }
    };

    if (loading || !delivery) return <div className="flex h-screen items-center justify-center text-gray-500">Loading Logistics...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* HEADER */}
            <div className="bg-white border-b sticky top-0 z-20 px-4 py-4 shadow-sm">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {isSwap ? <span className="text-purple-600">⇄ Swap Logistics</span> : <span className="text-blue-600">📦 Delivery</span>}
                        </h1>
                        <p className="text-xs text-gray-500">Tracking #{delivery.tracking_code || "PENDING"} • Role: {role}</p>
                    </div>
                    {delivery.status === 'shipped' && (
                        <div className="bg-green-100 text-green-800 px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                            Rider Active • ~{eta} mins away
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* --- LEFT PANEL: LOGISTICS SETTINGS --- */}
                <div className="lg:col-span-1 space-y-6">

                    {/* 1. ROUTE CARD */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <h3 className="font-bold text-gray-800 mb-6">Route Details</h3>

                        {/* VISUAL TIMELINE */}
                        <div className="relative pl-4 border-l-2 border-gray-200 ml-2 space-y-8">

                            {/* STEP 1: PICKUP */}
                            <div className="relative">
                                <span className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-white ring-1 ring-gray-200 ${canEditPickup ? 'bg-blue-600' : 'bg-gray-400'}`}></span>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                                    Step 1: Pickup {canEditPickup ? "(You)" : "(Partner)"}
                                </label>
                                <input
                                    list="nyeri-locations"
                                    disabled={!canEditPickup}
                                    value={pickup}
                                    onChange={e => setPickup(e.target.value)}
                                    className={`w-full p-2 text-sm border rounded ${!canEditPickup ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-200'}`}
                                    placeholder="Pickup Town..."
                                />
                            </div>

                            {/* SWAP INDICATOR */}
                            {isSwap && (
                                <div className="ml-2 text-xs text-purple-600 font-medium py-1 bg-purple-50 inline-block px-2 rounded">
                                    ⇅ Round Trip (Books Swapped)
                                </div>
                            )}

                            {/* STEP 2: DROPOFF */}
                            <div className="relative">
                                <span className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-white ring-1 ring-gray-200 ${canEditDropoff ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                                    Step 2: Dropoff {canEditDropoff ? "(You)" : "(Partner)"}
                                </label>
                                <input
                                    list="nyeri-locations"
                                    disabled={!canEditDropoff}
                                    value={dropoff}
                                    onChange={e => setDropoff(e.target.value)}
                                    className={`w-full p-2 text-sm border rounded ${!canEditDropoff ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-green-300 focus:ring-2 focus:ring-green-200'}`}
                                    placeholder="Dropoff Town..."
                                />
                            </div>
                        </div>

                        {/* AUTOCOMPLETE DATALIST */}
                        <datalist id="nyeri-locations">
                            {NYERI_LOCATIONS.map(loc => <option key={loc} value={loc} />)}
                        </datalist>

                        {/* UPDATE BUTTON */}
                        {(delivery.status === 'pending' || delivery.status === 'paid') && (
                            <button
                                onClick={handleUpdateRoute}
                                disabled={processing}
                                className="mt-6 w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition"
                            >
                                {processing ? "Calculating..." : "Update Route & Price"}
                            </button>
                        )}
                    </div>

                    {/* 2. PAYMENT CARD */}
                    {(delivery.status === 'pending' || delivery.status === 'paid') && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Payment</h3>

                            <div className="flex justify-between items-center mb-4 text-sm">
                                <span className="text-gray-600">Total Delivery Fee:</span>
                                <span className="text-xl font-bold text-green-600">KSh {Number(calculatedCost).toFixed(0)}</span>
                            </div>

                            <form onSubmit={handlePay} className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="M-Pesa Number (07...)"
                                    value={paymentPhone}
                                    onChange={e => setPaymentPhone(e.target.value)}
                                    className="w-full border p-3 rounded-lg text-sm outline-none focus:border-green-500"
                                    required
                                />
                                <button disabled={processing} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition">
                                    {processing ? "Processing..." : `Pay KSh ${Number(calculatedCost).toFixed(0)}`}
                                </button>
                            </form>

                            <button onClick={handleCancel} className="mt-4 w-full text-center text-red-500 text-xs font-bold hover:underline">
                                Cancel Order
                            </button>
                        </div>
                    )}
                </div>

                {/* --- RIGHT PANEL: MAP --- */}
                <div className="lg:col-span-2 h-[500px] lg:h-auto bg-gray-200 rounded-xl overflow-hidden shadow-inner border border-gray-300 relative">
                    <MapContainer center={NYERI_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {geoCoords.start && <Marker position={geoCoords.start} icon={IconFactory('📦')}><Popup>Pickup Point</Popup></Marker>}
                        {geoCoords.end && <Marker position={geoCoords.end} icon={IconFactory('🏁')}><Popup>Dropoff Point</Popup></Marker>}
                        {geoCoords.rider && <Marker position={geoCoords.rider} icon={IconFactory('🏍️')}><Popup>Rider</Popup></Marker>}

                        {routePath && (
                            <Polyline
                                positions={routePath}
                                color={isSwap ? "#9333ea" : "#2563eb"}
                                weight={6}
                                opacity={0.8}
                            />
                        )}
                    </MapContainer>

                    {/* STATUS OVERLAY */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg z-[1000] border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Status</p>
                        <div className={`text-sm font-bold px-2 py-1 rounded ${delivery.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                delivery.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {delivery.status.toUpperCase()}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TrackingPage;