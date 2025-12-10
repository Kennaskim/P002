import React, { useState, useEffect } from 'react';
import api, { getBookshops } from '../utils/api';

const BookshopsPage = () => {
    const [bookshops, setBookshops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inventories, setInventories] = useState({}); // Stores lists of books
    const [expandedShop, setExpandedShop] = useState(null);

    useEffect(() => {
        // Load the list of shops
        getBookshops()
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setBookshops(data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleToggleInventory = async (shopId) => {
        if (expandedShop === shopId) {
            setExpandedShop(null); // Close if already open
            return;
        }

        setExpandedShop(shopId); // Open this shop

        // Only fetch from API if we haven't loaded this shop's books yet
        if (!inventories[shopId]) {
            try {
                const res = await api.get(`bookshops/${shopId}/inventory/`);
                const books = Array.isArray(res.data) ? res.data : [];
                setInventories(prev => ({ ...prev, [shopId]: books }));
            } catch (err) {
                console.error("Failed to load inventory");
                // Save an empty list so it doesn't crash or keep trying
                setInventories(prev => ({ ...prev, [shopId]: [] }));
            }
        }
    };

    if (loading) return <div className="p-8 text-center">Loading shops...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Local Bookshops</h1>

            {bookshops.length === 0 ? (
                <p className="text-gray-500">No bookshops registered.</p>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {bookshops.map(shop => (
                        <div key={shop.id} className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{shop.shop_name}</h2>
                                    <p className="text-gray-600 mt-1">📍 {shop.address}</p>
                                    <p className="text-gray-600">📞 {shop.phone_number}</p>
                                    <p className="text-sm text-gray-500 mt-2">🕒 {shop.opening_hours}</p>
                                </div>
                                <button
                                    onClick={() => handleToggleInventory(shop.id)}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    {expandedShop === shop.id ? 'Hide Books' : 'View Books'}
                                </button>
                            </div>

                            {/* Inventory Dropdown - ONLY SHOW IF EXPANDED */}
                            {expandedShop === shop.id && (
                                <div className="mt-6 border-t pt-4">
                                    <h3 className="font-bold text-lg mb-3">Available Books</h3>

                                    {/* SAFE CHECK: Does the inventory array exist? */}
                                    {inventories[shop.id] ? (
                                        inventories[shop.id].length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {inventories[shop.id].map(item => (
                                                    <div key={item.id} className="border rounded p-3 flex justify-between items-center bg-gray-50">
                                                        <div>
                                                            <p className="font-bold text-sm">{item.textbook?.title || "Unknown Title"}</p>
                                                            <p className="text-xs text-gray-500">{item.condition}</p>
                                                        </div>
                                                        <span className="text-green-600 font-bold">KSh {item.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No books listed in this shop.</p>
                                        )
                                    ) : (
                                        <p className="text-gray-500">Loading books...</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BookshopsPage;