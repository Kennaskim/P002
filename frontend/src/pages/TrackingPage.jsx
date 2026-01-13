import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getDelivery, initiateMpesa, calculateDeliveryFee, updateDelivery } from '../utils/api';
import L from 'leaflet';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Nyeri Coordinates for the Map
const NYERI_CENTER = [-0.4167, 36.9500];

const TrackingPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data State
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);

    // User Choices State
    const [deliveryMode, setDeliveryMode] = useState('delivery'); // 'delivery' or 'meetup'
    const [newLocation, setNewLocation] = useState(''); // Buyer's location input
    const [calculatedCost, setCalculatedCost] = useState(null);
    const [distanceText, setDistanceText] = useState('');

    // Payment State
    const [paymentPhone, setPaymentPhone] = useState('');
    const [processing, setProcessing] = useState(false);

    // Map State
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropoffCoords, setDropoffCoords] = useState(null);

    useEffect(() => {
        loadDelivery();
    }, [id]);

    const loadDelivery = () => {
        getDelivery(id).then(res => {
            setDelivery(res.data);
            setCalculatedCost(res.data.transport_cost);
            setLoading(false);
        }).catch(err => {
            alert("Delivery not found");
            navigate('/dashboard');
        });
    };

    // --- STEP 1: CALCULATE PRICE ---
    const handleCalculate = async (e) => {
        e.preventDefault();
        if (!newLocation) return alert("Please enter your location");

        setProcessing(true);
        try {
            const originAddress = delivery.seller_location || delivery.pickup_location;
            const res = await calculateDeliveryFee(originAddress, newLocation);

            setCalculatedCost(res.data.delivery_fee);
            setDistanceText(res.data.distance);
            setPickupCoords(res.data.pickup_coords);
            setDropoffCoords(res.data.dropoff_coords);

            // Automatically SAVE this to the database so the price is official
            await updateDelivery(delivery.id, {
                dropoff_location: newLocation,
                transport_cost: res.data.delivery_fee
            });

            alert(`Distance: ${res.data.distance}\nNew Cost: KSh ${res.data.delivery_fee}`);
            loadDelivery(); // Refresh data

        } catch (err) {
            console.error(err);
            alert("Could not calculate distance. Try adding 'Nyeri' to the location name.");
        } finally {
            setProcessing(false);
        }
    };

    // --- STEP 2: SWITCH TO MEETUP ---
    const handleSwitchToMeetup = async () => {
        if (window.confirm("Switch to Meetup? Delivery fee will be KSh 0.")) {
            setDeliveryMode('meetup');
            setCalculatedCost(0);
            // Update DB
            await updateDelivery(delivery.id, {
                transport_cost: 0.00,
                status: 'pending' // Keeps it pending until they confirm/meet
            });
            loadDelivery();
        }
    };

    // --- STEP 3: PAY OR CONFIRM ---
    const handleProcessOrder = async (e) => {
        e.preventDefault();
        setProcessing(true);

        if (calculatedCost <= 0 || deliveryMode === 'meetup') {
            // FREE / MEETUP FLOW
            if (delivery.seller_phone) {
                alert(`MEETUP CONFIRMED!\n\nPlease call ${delivery.seller_name} at: ${delivery.seller_phone}\nto arrange the meetup.`);
            } else {
                alert("Meetup Confirmed! Use the Chat feature to agree on a time.");
            }

            setProcessing(false);
        } else {
            // M-PESA FLOW
            try {
                const res = await initiateMpesa({
                    delivery_id: delivery.id,
                    phone_number: paymentPhone
                });
                alert(`Payment Sent! Check your phone. Transaction: ${res.data.transaction_code}`);
                loadDelivery();
            } catch (err) {
                alert("Payment failed. Ensure phone number is valid.");
            } finally {
                setProcessing(false);
            }
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Logistics...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">📦 Fulfillment & Payment</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT: Action Section */}
                <div className="space-y-6">

                    {/* 1. STATUS CARD */}
                    <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                        <h3 className="font-bold">Status: <span className="uppercase text-blue-600">{delivery.status}</span></h3>
                        {delivery.tracking_code && <p>Tracking Code: <strong>{delivery.tracking_code}</strong></p>}
                    </div>

                    {/* 2. CHOICE CARD (Only if Pending) */}
                    {delivery.status === 'pending' && (
                        <div className="bg-white p-6 rounded shadow">
                            <h3 className="font-bold text-lg mb-4">1. Choose Method</h3>
                            <div className="flex gap-4 mb-4">
                                <button
                                    onClick={() => setDeliveryMode('delivery')}
                                    className={`flex-1 py-2 rounded border ${deliveryMode === 'delivery' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                                >
                                    🚚 Delivery (Paid)
                                </button>
                                <button
                                    onClick={handleSwitchToMeetup}
                                    className={`flex-1 py-2 rounded border ${deliveryMode === 'meetup' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
                                >
                                    🤝 Meetup (Free)
                                </button>
                            </div>

                            {/* CALCULATOR (Only for Delivery) */}
                            {deliveryMode === 'delivery' && (
                                <div className="bg-gray-50 p-4 rounded mb-4">
                                    <label className="block text-sm font-bold mb-1">Pickup Location (Seller)</label>
                                    <input
                                        value={delivery.seller_location || delivery.pickup_location}
                                        disabled={true}
                                        className="w-full border p-2 rounded mb-3 bg-gray-200 cursor-not-allowed"
                                    />
                                    <label className="block text-sm font-bold mb-1">Your Location (Dropoff)</label>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="e.g. Ruring'u, Nyeri"
                                            value={newLocation}
                                            onChange={(e) => setNewLocation(e.target.value)}
                                            className="w-full border p-2 rounded"
                                        />
                                        <button
                                            onClick={handleCalculate}
                                            disabled={processing}
                                            className="bg-gray-800 text-white px-4 rounded"
                                        >
                                            {processing ? '...' : 'Calc'}
                                        </button>
                                    </div>
                                    {distanceText && (
                                        <p className="text-green-600 text-sm mt-2 font-bold">
                                            ✅ Route Found: {distanceText}
                                        </p>
                                    )}
                                </div>
                            )}
                            {/* MEETUP INFO BOX */}
                            {deliveryMode === 'meetup' && (
                                <div className="bg-green-50 p-4 rounded mb-4 border border-green-200">
                                    <h4 className="font-bold text-green-800">🤝 Meetup Selected</h4>
                                    <p className="text-sm text-green-700 mb-2">
                                        You will meet <strong>{delivery.seller_name}</strong> directly.
                                    </p>
                                    <div className="font-mono text-lg bg-white p-2 rounded border text-center select-all">
                                        {delivery.seller_phone ? (
                                            <>📞 {delivery.seller_phone}</>
                                        ) : (
                                            <span classname="text-red-500 text-sm">
                                                User hasn't added a phone number.
                                                <br />
                                                <button
                                                    onClick={() => navigate('/chat')}
                                                    className="text-blue-600 underline mt-1 font-bold"
                                                >
                                                    Use In-App Chat
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        *Call to agree on a time and place.
                                    </p>
                                </div>
                            )}

                            {/* COST SUMMARY */}
                            <div className="border-t pt-4">
                                <div className="flex justify-between text-xl font-bold mb-4">
                                    <span>Total to Pay:</span>
                                    <span>KSh {calculatedCost}</span>
                                </div>

                                {/* PAYMENT / CONFIRM FORM */}
                                <form onSubmit={handleProcessOrder}>
                                    {calculatedCost > 0 && (
                                        <div className="mb-3">
                                            <label className="block text-sm mb-1">M-Pesa Number</label>
                                            <input
                                                type="text"
                                                placeholder="07XX XXX XXX"
                                                value={paymentPhone}
                                                onChange={(e) => setPaymentPhone(e.target.value)}
                                                className="w-full border p-2 rounded"
                                                required={calculatedCost > 0}
                                            />
                                        </div>
                                    )}
                                    <button
                                        disabled={processing}
                                        className={`w-full py-3 rounded text-white font-bold ${calculatedCost > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {processing ? 'Processing...' : (calculatedCost > 0 ? `Pay KSh ${calculatedCost}` : 'Confirm Meetup')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: MAP */}
                <div className="bg-white p-2 rounded shadow h-96">
                    <MapContainer center={NYERI_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {/* 1. Show Default Center if no calculation yet */}
                        {!pickupCoords && (
                            <Marker position={NYERI_CENTER}>
                                <Popup>Nyeri Central</Popup>
                            </Marker>
                        )}

                        {/* 2. Show Seller's Location (If found) */}
                        {pickupCoords && (
                            <Marker position={pickupCoords}>
                                <Popup>📦 Seller: {delivery.pickup_location}</Popup>
                            </Marker>
                        )}

                        {/* 3. Show Buyer's Location (If found) */}
                        {dropoffCoords && (
                            <Marker position={dropoffCoords}>
                                <Popup>📍 You: {newLocation}</Popup>
                            </Marker>
                        )}

                        {/* 4. Draw a Line between them */}
                        {pickupCoords && dropoffCoords && (
                            <Polyline positions={[pickupCoords, dropoffCoords]} color="blue" />
                        )}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default TrackingPage;