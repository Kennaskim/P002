import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getMyListings, getConversations, getMyDeliveries } from '../../utils/api';
import DeliveryCard from './DeliveryCard';

const BookshopDashboard = ({ user }) => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [showBulkUpload, setShowBulkUpload] = useState(false);

    // OPTIMIZATION: Fetch data in parallel
    useEffect(() => {
        const loadData = async () => {
            try {
                const [inventoryRes, conversationsRes, deliveriesRes] = await Promise.all([
                    getMyListings(),
                    getConversations(),
                    getMyDeliveries()
                ]);
                setInventory(inventoryRes.data.results || inventoryRes.data);
                setConversations(conversationsRes.data);
                setDeliveries(deliveriesRes.data);
            } catch (err) {
                console.error("Bookshop dashboard fetch error", err);
            }
        };
        loadData();
    }, []);

    const mySales = deliveries.filter(d => !d.swap && d.orders?.some(o => o.listing.listed_by.id === user.id));

    const handleDelete = async (id) => {
        if (confirm("Remove this book from inventory?")) {
            try {
                await api.delete(`listings/${id}/`);
                setInventory(prev => prev.filter(item => item.id !== id));
            } catch (err) {
                alert("Failed to remove item");
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            alert("Uploading inventory... Please wait.");
            await api.post('listings/bulk_upload/', formData);
            alert("✅ Inventory Imported Successfully! Reloading...");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Upload Failed.");
        }
    };

    return (
        <div>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6">
                <p className="text-purple-700">Welcome, <strong>{user.username}</strong> (Bookshop Owner). Manage your shop inventory.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded shadow text-center border-t-4 border-purple-500">
                    <div className="text-2xl font-bold">{inventory.length}</div>
                    <div className="text-gray-500">Books in Stock</div>
                </div>
                <div className="bg-white p-6 rounded shadow text-center border-t-4 border-green-500">
                    <div className="text-2xl font-bold">KSh {inventory.reduce((sum, i) => sum + Number(i.price), 0)}</div>
                    <div className="text-gray-500">Total Inventory Value</div>
                </div>
                <div className="bg-white p-6 rounded shadow text-center border-t-4 border-blue-500">
                    <div className="text-2xl font-bold">{mySales.length}</div>
                    <div className="text-gray-500">Total Sales Orders</div>
                </div>
            </div>

            {/* Outgoing Sales */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📦 Outgoing Sales (To Ship)</h3>
                {mySales.length === 0 ? (
                    <div className="bg-white p-4 rounded shadow text-gray-500 text-sm">No active orders to ship.</div>
                ) : (
                    mySales.map(d => <DeliveryCard key={d.id} delivery={d} type="sale" userId={user.id} navigate={navigate} />)
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded shadow p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="font-bold text-lg">Current Inventory</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setShowBulkUpload(!showBulkUpload)} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition font-bold flex items-center gap-2">📂 Bulk Import</button>
                            <Link to="/listings/create" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-bold">+ Add Book</Link>
                        </div>
                    </div>

                    {showBulkUpload && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                            <h4 className="font-bold text-yellow-800 mb-2">Upload Inventory File</h4>
                            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="block w-full text-sm text-gray-500" />
                        </div>
                    )}

                    <div className="space-y-2">
                        {inventory.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Your inventory is empty. Add books to start selling!</p>
                        ) : (
                            inventory.map(item => (
                                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-12 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                                            {item.textbook.cover_image ? (<img src={item.textbook.cover_image} alt="" className="w-full h-full object-cover" />) : <span>📚</span>}
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.textbook.title}</p>
                                            <p className="text-xs text-gray-500">Listed: {new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-green-600">KSh {item.price}</span>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Remove</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded shadow p-6 h-fit">
                    <h3 className="font-bold text-lg mb-4">Messages</h3>
                    <div className="space-y-3">
                        {conversations.map(c => (
                            <Link key={c.id} to={`/chat/${c.id}`} className="block border-b pb-2 hover:bg-gray-50 p-2 rounded transition">
                                <div className="flex justify-between">
                                    <span className="font-bold text-sm text-gray-900">{c.other_user?.username}</span>
                                    <span className="text-xs text-gray-400">{new Date(c.updated_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-500 text-xs truncate mt-1">{c.last_message}</p>
                            </Link>
                        ))}
                    </div>
                    <Link to="/chat" className="text-green-600 text-sm mt-4 block font-bold text-center border-t pt-2">View All Messages →</Link>
                </div>
            </div>
        </div>
    );
};

export default BookshopDashboard;