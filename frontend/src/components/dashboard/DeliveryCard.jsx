import React from 'react';

const DeliveryCard = ({ delivery, type, userId, navigate }) => {
    const isSwap = type === 'swap';
    const isSale = type === 'sale';

    let title, subtitle, badgeColor, badgeText;

    if (isSwap) {
        const partnerName = delivery.swap.sender === userId ? delivery.swap.receiver.username : delivery.swap.sender.username;
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

    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${badgeColor}`}>
                        {badgeText}
                    </span>
                    <span className={`text-xs font-bold uppercase ${delivery.status === 'delivered' ? 'text-green-600' :
                        delivery.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                        • {delivery.status}
                    </span>
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
                                    <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">Grade {order.listing?.textbook?.grade}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
                <p className="text-xs text-gray-400 mt-2">Ordered on: {new Date(delivery.created_at).toLocaleDateString()}</p>
            </div>

            <div className="flex flex-col justify-center min-w-[140px]">
                {delivery.status !== 'cancelled' ? (
                    <button
                        onClick={() => navigate(`/tracking/${delivery.id}`)}
                        className="bg-gray-900 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        {isSale ? 'Manage Logistics' : 'Track Package'} →
                    </button>
                ) : (
                    <button disabled className="bg-gray-100 text-gray-400 px-4 py-2 rounded text-sm cursor-not-allowed">Cancelled</button>
                )}
            </div>
        </div>
    );
};

export default DeliveryCard;