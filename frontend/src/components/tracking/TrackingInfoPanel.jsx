import React, { useState } from 'react';

const TrackingInfoPanel = ({
    status,
    riderPhone,
    locations, // { pickup, dropoff }
    permissions, // { canEditPickup, canEditDropoff, labelPickup, labelDropoff, isPayer, roleName }
    costs, // { deliveryFee, booksTotal }
    onUpdateLocation, // async (type, value) => {}
    onPay, // async (phone) => {}
    onCancel,
    isSwap,
    processing
}) => {
    const [isEditing, setIsEditing] = useState(null); // 'pickup' | 'dropoff' | null
    const [tempLocation, setTempLocation] = useState('');
    const [paymentPhone, setPaymentPhone] = useState('');

    const startEditing = (field, value) => {
        setIsEditing(field);
        setTempLocation(value);
    };

    const handleSave = async () => {
        if (!tempLocation.trim()) return;
        await onUpdateLocation(isEditing, tempLocation);
        setIsEditing(null);
    };

    // Helper to render an input field
    const renderLocationField = (type, label, value, canEdit) => {
        const isLocked = ['shipped', 'delivered', 'cancelled'].includes(status);
        const editingThis = isEditing === type;

        return (
            <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{label}</label>

                {editingThis ? (
                    <div className="flex gap-2">
                        <input
                            className="border rounded p-1 text-sm w-full focus:ring-2 focus:ring-blue-200 outline-none"
                            value={tempLocation}
                            onChange={e => setTempLocation(e.target.value)}
                            placeholder="Enter location..."
                            autoFocus
                        />
                        <button onClick={handleSave} disabled={processing} className="bg-green-600 text-white px-2 rounded text-xs font-bold hover:bg-green-700">✓</button>
                        <button onClick={() => setIsEditing(null)} className="bg-gray-300 text-gray-700 px-2 rounded text-xs hover:bg-gray-400">✕</button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="text-sm text-gray-800 truncate select-all">{value}</span>
                        {canEdit && !isLocked && (
                            <button
                                onClick={() => startEditing(type, value)}
                                className="text-xs text-blue-600 font-bold hover:underline"
                            >
                                Edit
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const totalCost = (costs.booksTotal || 0) + (costs.deliveryFee || 0);

    return (
        <div className="space-y-6">
            {/* 1. LOCATIONS CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${isSwap ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                <h3 className="font-bold text-gray-800 mb-6">Route Details</h3>

                {isSwap && (
                    <div className="mb-4 text-xs bg-purple-50 text-purple-700 p-2 rounded border border-purple-100">
                        ℹ️ <b>Swap Rule:</b> Proposer pays delivery. Each party sets their own location.
                    </div>
                )}

                <div className="pl-2">
                    {renderLocationField('pickup', permissions.labelPickup, locations.pickup, permissions.canEditPickup)}
                    {renderLocationField('dropoff', permissions.labelDropoff, locations.dropoff, permissions.canEditDropoff)}
                </div>

                <div className="flex justify-between items-center pt-4 border-t mt-4">
                    <span className="text-sm text-gray-600">Logistics Cost:</span>
                    <span className="text-lg font-bold text-gray-900">KSh {Number(costs.deliveryFee).toFixed(0)}</span>
                </div>
            </div>
            {/* A. Searching for Rider */}
            {status === 'paid' && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <h3 className="font-bold text-blue-800">Searching for Rider...</h3>
                    <p className="text-sm text-blue-600 mt-1">Payment received. Matching you with a nearby rider.</p>
                </div>
            )}

            {/* B. Rider Found (Shipped) */}
            {status === 'shipped' && (
                <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                    <h3 className="font-bold text-green-800 flex items-center gap-2 mb-2">
                        <span>🏍️</span> Rider Assigned!
                    </h3>
                    <p className="text-sm text-green-700 mb-4">Your delivery is in progress.</p>

                    {riderPhone ? (
                        <a href={`tel:${riderPhone}`} className="block w-full bg-white text-green-700 border border-green-300 py-3 rounded-lg text-center font-bold shadow-sm hover:bg-green-50 transition">
                            📞 Call Rider: {riderPhone}
                        </a>
                    ) : (
                        <div className="text-sm text-gray-500 italic">Rider contact hidden</div>
                    )}
                </div>
            )}

            {/* 2. PAYMENT CARD */}
            {status === 'pending' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-800 mb-4">Payment Breakdown</h3>
                    <div className="space-y-2 mb-4 text-sm">
                        {costs.booksTotal > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Books Cost:</span>
                                <span>KSh {costs.booksTotal}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-600">
                            <span>Delivery Fee:</span>
                            <span>KSh {costs.deliveryFee}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-900">
                            <span>Total Payable:</span>
                            <span className="text-green-600">KSh {totalCost}</span>
                        </div>
                    </div>

                    {permissions.isPayer ? (
                        <form onSubmit={(e) => { e.preventDefault(); onPay(paymentPhone); }}>
                            <input
                                type="text"
                                placeholder="M-Pesa Phone (07...)"
                                value={paymentPhone}
                                onChange={e => setPaymentPhone(e.target.value)}
                                className="w-full border p-3 rounded-lg text-sm outline-none focus:border-green-500 mb-3"
                                required
                            />
                            <button disabled={processing || totalCost <= 0} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition">
                                {processing ? "Processing..." : `Pay KSh ${totalCost}`}
                            </button>
                        </form>
                    ) : (
                        <div className="bg-gray-100 p-4 rounded text-center text-gray-500 text-sm">
                            ⏳ Waiting for partner to complete payment.
                        </div>
                    )}

                    {permissions.isPayer && (
                        <button onClick={onCancel} className="mt-4 w-full text-center text-red-500 text-xs font-bold hover:underline">
                            Cancel Order
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrackingInfoPanel;