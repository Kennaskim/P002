import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDelivery, initiateMpesa, calculateDeliveryFee, updateDelivery, cancelDelivery } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import TrackingMapPanel from '../components/tracking/TrackingMapPanel';
import TrackingInfoPanel from '../components/tracking/TrackingInfoPanel';
import ChatWidget from '../components/ChatWidget';

const TrackingPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const ws = useRef(null);

    // State
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);

    // Logic State
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [booksTotal, setBooksTotal] = useState(0);

    // Map State
    const [geoCoords, setGeoCoords] = useState({ start: null, end: null, rider: null });
    const [routePath, setRoutePath] = useState(null);
    const [eta, setEta] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [processing, setProcessing] = useState(false);
    const hasCalculated = useRef(false);

    // --- 1. DATA LOADING ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await getDelivery(id);
                const data = res.data;
                setDelivery(data);

                // Initial sync
                if (!pickup) setPickup(data.pickup_location || '');
                if (!dropoff) setDropoff(data.dropoff_location || '');

                if (Number(data.transport_cost) > 0) setDeliveryFee(Number(data.transport_cost));

                if (data.orders?.length > 0) {
                    const total = data.orders.reduce((sum, order) => sum + Number(order.amount_paid), 0);
                    setBooksTotal(total);
                }

                if (data.pickup_location && data.dropoff_location) {
                    if (!hasCalculated.current || !routePath) {
                        hasCalculated.current = true;
                        await performCalculation(data.pickup_location, data.dropoff_location, !!data.swap, false);
                    }
                }

                if (data.current_lat) setGeoCoords(prev => ({ ...prev, rider: [data.current_lat, data.current_lng] }));
                if (data.status === 'shipped') setEta(15);

            } catch (err) { console.error(err); } finally { setLoading(false); }
        };

        fetchData();
        const interval = setInterval(fetchData, 8000);
        return () => clearInterval(interval);
    }, [id, routePath]); // Add routePath as dep to retry if missing

    // --- 2. WEBSOCKET ---
    useEffect(() => {
        if (!id) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//127.0.0.1:8000/ws/delivery/${id}/`;

        ws.current = new WebSocket(wsUrl);
        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.latitude) setGeoCoords(prev => ({ ...prev, rider: [data.latitude, data.longitude] }));
                if (data.status && delivery) setDelivery(prev => ({ ...prev, status: data.status }));
            } catch (e) { }
        };
        return () => { if (ws.current) ws.current.close(); };
    }, [id]);

    // --- 3. LOGIC HANDLERS ---
    const performCalculation = async (start, end, isSwapMode, saveToDb) => {
        try {
            const res = await calculateDeliveryFee(start, end, isSwapMode);
            if (res.data.pickup_coords && res.data.dropoff_coords) {
                setGeoCoords(prev => ({
                    ...prev,
                    start: res.data.pickup_coords,
                    end: res.data.dropoff_coords
                }));
            }

            // 2. Update Route Path
            if (res.data.route_geometry?.coordinates) {
                setRoutePath(res.data.route_geometry.coordinates.map(c => [c[1], c[0]]));
            }

            // Handle different fee key names from backend
            const cost = res.data.fee || res.data.delivery_fee;
            setDeliveryFee(cost);

            if (saveToDb) {
                await updateDelivery(id, {
                    pickup_location: start,
                    dropoff_location: end,
                    transport_cost: cost
                });
            }
            return res.data;
        } catch (e) { console.error("Calc Error:", e); }
    };

    const handleUpdateLocation = async (type, newLocation) => {
        try {
            // 1. Determine new pair
            const start = type === 'pickup' ? newLocation : pickup;
            const end = type === 'dropoff' ? newLocation : dropoff;

            if (type === 'pickup') setPickup(newLocation);
            if (type === 'dropoff') setDropoff(newLocation);

            // 2. Recalculate & Save
            await performCalculation(start, end, !!delivery.swap, true);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePay = async (phone) => {
        setProcessing(true);
        try {
            await updateDelivery(id, { transport_cost: deliveryFee });
            await initiateMpesa({ delivery_id: id, phone_number: phone });
            alert("STK Push Sent! Check your phone.");
        } catch (err) { alert("Payment Failed."); }
        finally { setProcessing(false); }
    };

    const handleCancel = async () => {
        if (!window.confirm("Cancel Order?")) return;
        await cancelDelivery(id);
        navigate('/dashboard');
    };

    // --- 4. PERMISSIONS ---
    const getPermissions = () => {
        if (!delivery || !user) return {};
        const isMe = (u) => u && (u.id === user.id || u === user.id);

        if (delivery.swap) {
            if (isMe(delivery.swap.sender)) return {
                canEditPickup: true, canEditDropoff: false, isPayer: true,
                roleName: 'Proposer', labelPickup: 'My Location', labelDropoff: "Partner's Location"
            };
            if (isMe(delivery.swap.receiver)) return {
                canEditPickup: false, canEditDropoff: true, isPayer: false,
                roleName: 'Partner', labelPickup: "Proposer's Location", labelDropoff: 'My Location'
            };
        } else {
            if (isMe(delivery.orders?.[0]?.buyer)) return {
                canEditPickup: false, canEditDropoff: true, isPayer: true,
                roleName: 'Buyer', labelPickup: 'Seller Location', labelDropoff: 'My Delivery Address'
            };
        }
        return { roleName: 'Viewer' };
    };

    if (loading || !delivery) return <div className="h-screen flex items-center justify-center">Loading Logistics...</div>;

    const permissions = getPermissions();

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20 px-4 py-4 shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{delivery.swap ? "🔄 Swap Logistics" : "📦 Delivery"}</h1>
                    <p className="text-xs text-gray-500">#{delivery.tracking_code} • {permissions.roleName}</p>
                </div>
                {delivery.status === 'shipped' && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">Live</span>}
            </div>

            <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 order-2 lg:order-1">
                    <TrackingInfoPanel
                        status={delivery.status}
                        riderPhone={delivery.rider_phone}
                        locations={{ pickup, dropoff }}
                        permissions={permissions}
                        costs={{ deliveryFee, booksTotal }}
                        onUpdateLocation={handleUpdateLocation}
                        onPay={handlePay}
                        onCancel={handleCancel}
                        isSwap={!!delivery.swap}
                        processing={processing}
                    />
                </div>
                <div className="lg:col-span-2 order-1 lg:order-2">
                    <TrackingMapPanel
                        geoCoords={geoCoords}
                        routePath={routePath}
                        isSwap={!!delivery.swap}
                        status={delivery.status}
                        eta={eta}
                        isFullScreen={isFullScreen}
                        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                    />
                </div>
            </div>

            {/* Chat */}
            {delivery.conversation_id && (
                <ChatWidget
                    conversationId={delivery.conversation_id}
                    delivery={delivery}
                />
            )}
        </div>
    );
};

export default TrackingPage;