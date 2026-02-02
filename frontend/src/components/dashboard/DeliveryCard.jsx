import React, { useState } from 'react';
import api, { initiatePaystackPayment } from '../../utils/api';

const DeliveryCard = ({ delivery, type, userId, navigate, user }) => {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Modal State
    const [location, setLocation] = useState(delivery.dropoff_location || '');
    const [deliveryFee, setDeliveryFee] = useState(delivery.transport_cost || 0);
    const [isCalculating, setIsCalculating] = useState(false);

    // Derived Data
    const isSwap = type === 'swap';
    const isSale = type === 'sale';
    const booksTotal = delivery.orders ? delivery.orders.reduce((sum, order) => sum + Number(order.amount_paid), 0) : 0;
    const totalAmount = booksTotal + Number(deliveryFee);

    // --- LOGIC: Determine Title & Subtitle ---
    let title, subtitle, badgeColor, badgeText;
    if (isSwap) {
        const senderId = delivery.swap.sender.id || delivery.swap.sender;
        const partnerName = senderId === userId
            ? delivery.swap.receiver.username
            : delivery.swap.sender.username;
        title = `Swap with ${partnerName}`;
        subtitle = "🔄 Round Trip Logistics";
        badgeColor = "bg-purple-100 text-purple-700";
        badgeText = "Active Swap";
    } else if (isSale) {
        const buyerName = delivery.orders?.[0]?.buyer?.username || "Buyer";
        title = `Sale to ${buyerName}`;
        subtitle = "📦 Please pack this for the rider";
        badgeColor = "bg-orange-100 text-orange-700";
        badgeText = "Outgoing Sale";
    } else {
        const sellerName = delivery.seller_name || "Seller";
        title = `Order from ${sellerName}`;
        subtitle = "🛍️ Arriving Soon";
        badgeColor = "bg-blue-100 text-blue-700";
        badgeText = "Incoming Order";
    }

    // --- FUNCTION: Update Location Only ---
    const handleUpdateLocation = async () => {
        setIsCalculating(true);
        try {
            await api.patch(`deliveries/${delivery.id}/`, { dropoff_location: location });
            const res = await api.post('deliveries/calculate_delivery_fee/', { delivery_id: delivery.id });
            setDeliveryFee(res.data.fee);
            alert("Location updated and fee recalculated!");
        } catch (error) {
            console.error(error);
            alert("Failed to update location.");
        } finally {
            setIsCalculating(false);
        }
    };

    // --- FUNCTION: Single Payment Flow (Paystack) ---
    const handlePayment = async () => {
        setLoading(true);
        try {
            // We initiate Paystack. 
            // Paystack will offer "Card" AND "M-Pesa" options on their secure page.
            const data = await initiatePaystackPayment(delivery.id);
            if (data.authorization_url) {
                window.location.href = data.authorization_url;
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to payment server.");
        } finally {
            setLoading(false);
        }
    };

    const showPayButton = delivery.status === 'pending' && !isSale;

    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between gap-4 mb-4 relative">

            {/* ... Main Card Content ... */}
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${badgeColor}`}>{badgeText}</span>
                    <span className={`text-xs font-bold uppercase ${delivery.status === 'delivered' ? 'text-green-600' :
                            delivery.status === 'paid' ? 'text-blue-600' :
                                delivery.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                        }`}>• {delivery.status}</span>
                    <span className="text-xs text-gray-400">#{delivery.tracking_code || "PENDING"}</span>
                </div>
                <div className="mb-2">
                    <h4 className="font-bold text-gray-800">{title}</h4>
                    <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
                    <ul className="mt-1 space-y-1 bg-gray-50 p-2 rounded text-sm text-gray-600">
                        {isSwap ? (
                            <li>📖 <b>{delivery.swap?.offered_listing?.textbook?.title}</b> ⇄ {delivery.swap?.requested_listing?.textbook?.title}</li>
                        ) : (
                            delivery.orders?.map(order => (
                                <li key={order.id} className="flex items-center gap-2">
                                    <span>📕 {order.listing?.textbook?.title}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col justify-center min-w-[140px]">
                {delivery.status === 'cancelled' ? (
                    <button disabled className="bg-gray-100 text-gray-400 px-4 py-2 rounded text-sm cursor-not-allowed">Cancelled</button>
                ) : showPayButton ? (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        Review & Pay
                    </button>
                ) : (
                    <button
                        onClick={() => navigate(`/tracking/${delivery.id}`)}
                        className="bg-gray-900 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        {isSale ? 'Manage Logistics' : 'Track Package'} →
                    </button>
                )}
            </div>

            {/* --- SIMPLIFIED MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Review Details</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        {/* 1. Location Edit (Kept this because it affects price) */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Delivery Location</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                                />
                                <button
                                    onClick={handleUpdateLocation}
                                    disabled={isCalculating}
                                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 border border-gray-300"
                                >
                                    {isCalculating ? '...' : 'Update'}
                                </button>
                            </div>
                        </div>

                        {/* 2. Cost Breakdown */}
                        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600"><span>Books:</span><span>KES {booksTotal}</span></div>
                            <div className="flex justify-between text-sm text-gray-600"><span>Delivery:</span><span>KES {Number(deliveryFee).toFixed(2)}</span></div>
                            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 mt-2">
                                <span>Total:</span><span>KES {totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* 3. Single Payment Button */}
                        <button
                            onClick={handlePayment}
                            disabled={loading || isCalculating}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2"
                        >
                            {loading ? 'Processing...' : `Proceed to Payment (Card or M-Pesa)`}
                        </button>
                        <p className="text-xs text-center text-gray-400 mt-2">
                            You can choose M-Pesa or Card on the next screen.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryCard;