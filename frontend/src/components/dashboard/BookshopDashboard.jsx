import React, { useState, useEffect } from 'react';
import {
    getMyListings,
    createListing,
    deleteListing,
    uploadListingCsv,
    createTextbook,
    getMyDeliveries
} from '../../utils/api';
import { Link, useNavigate } from 'react-router-dom';

const BookshopDashboard = ({ user }) => {
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    // TABS: 'inventory', 'orders', 'add'
    const [activeTab, setActiveTab] = useState('inventory');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stockRes, orderRes] = await Promise.all([
                getMyListings(),
                getMyDeliveries()
            ]);
            setListings(stockRes.data.results || stockRes.data);
            setDeliveries(orderRes.data.results || orderRes.data);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---
    const handleDelete = async (id) => {
        if (confirm("Remove this book from inventory?")) {
            await deleteListing(id);
            setListings(listings.filter(l => l.id !== id));
        }
    };

    const handleAddSingleBook = async (e) => {
        e.preventDefault();
        const title = e.target.title.value;
        const author = e.target.author.value;
        const price = e.target.price.value;
        const subject = e.target.subject.value;

        try {
            const textbookRes = await createTextbook({ title, author, subject, grade: 'General' });
            const listingRes = await createListing({
                textbook_id: textbookRes.data.id,
                listing_type: 'sell',
                condition: 'new',
                price: price,
                description: 'In Stock'
            });
            setListings([listingRes.data, ...listings]);
            alert("Book added to inventory!");
            e.target.reset();
        } catch (err) {
            alert("Failed to add book.");
        }
    };

    const handleCsvUpload = async (e) => {
        e.preventDefault();
        const file = e.target.file.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);

        try {
            const res = await uploadListingCsv(formData);
            alert(res.data.status || "Upload successful!");
            fetchData();
            setActiveTab('inventory');
        } catch (err) {
            alert("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    // --- Helper to get status badge ---
    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-blue-100 text-blue-800',
            shipped: 'bg-purple-100 text-purple-800', // Rider has it
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Bookshop Portal</h1>
                    <p className="text-gray-500">Manage Inventory & Track Sales</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 shadow-sm border">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-6 py-2 rounded-md font-medium transition ${activeTab === 'inventory' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        📦 Inventory
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-2 rounded-md font-medium transition ${activeTab === 'orders' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        🚚 Orders & Tracking
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`px-6 py-2 rounded-md font-medium transition ${activeTab === 'add' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        ➕ Add Stock
                    </button>
                </div>
            </div>

            {/* TAB 1: INVENTORY */}
            {activeTab === 'inventory' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Views</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {listings.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-400">No books listed. Go to "Add Stock".</td></tr>
                            ) : (
                                listings.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{item.textbook.title}</p>
                                            <p className="text-xs text-gray-500">{item.textbook.author}</p>
                                        </td>
                                        <td className="px-6 py-4 text-green-600 font-bold">KSh {item.price}</td>
                                        <td className="px-6 py-4 text-gray-500">{item.views}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Remove</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB 2: ORDERS & TRACKING */}
            {activeTab === 'orders' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="text-blue-800 font-bold text-lg">{deliveries.length}</h3>
                            <p className="text-blue-600 text-sm">Total Orders</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <h3 className="text-green-800 font-bold text-lg">{deliveries.filter(d => d.status === 'delivered').length}</h3>
                            <p className="text-green-600 text-sm">Completed Sales</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <h3 className="text-purple-800 font-bold text-lg">{deliveries.filter(d => d.status === 'shipped').length}</h3>
                            <p className="text-purple-600 text-sm">Active Shipments</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {deliveries.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">No orders received yet.</div>
                        ) : (
                            deliveries.map((delivery) => (
                                <div key={delivery.id} className="p-6 border-b last:border-0 hover:bg-gray-50 transition">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-bold text-gray-900">Order #{delivery.tracking_code || delivery.id}</span>
                                                {getStatusBadge(delivery.status)}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {new Date(delivery.created_at).toLocaleDateString()} at {new Date(delivery.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>

                                        <div className="flex gap-3 mt-3 md:mt-0">
                                            {/* Messaging Button */}
                                            <button
                                                onClick={() => navigate('/chat')}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                                            >
                                                💬 Chat with Buyer/Rider
                                            </button>

                                            {/* Tracking Button (Only if active) */}
                                            {(delivery.status === 'shipped' || delivery.status === 'delivered') && (
                                                <button
                                                    onClick={() => navigate(`/tracking/${delivery.id}`)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium text-sm"
                                                >
                                                    📍 Track Rider
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Items in Order</h4>
                                        <ul className="space-y-2">
                                            {delivery.orders.map(order => (
                                                <li key={order.id} className="flex justify-between text-sm">
                                                    <span>{order.listing.textbook.title}</span>
                                                    <span className="font-mono text-gray-600">KSh {order.amount_paid}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                                            <span>Total Earnings</span>
                                            <span>KSh {delivery.orders.reduce((sum, o) => sum + parseFloat(o.amount_paid), 0)}</span>
                                        </div>
                                    </div>

                                    {/* Rider Info */}
                                    {delivery.rider && (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-100 inline-block">
                                            <span>🏍️ Rider: <strong>{delivery.rider.username}</strong> ({delivery.rider_phone})</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: ADD STOCK */}
            {activeTab === 'add' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4">Add Single Book</h3>
                        <form onSubmit={handleAddSingleBook} className="space-y-4">
                            <input name="title" placeholder="Book Title *" className="w-full border p-2 rounded" required />
                            <input name="author" placeholder="Author" className="w-full border p-2 rounded" />
                            <input name="subject" placeholder="Subject" className="w-full border p-2 rounded" />
                            <input name="price" type="number" placeholder="Price (KSh) *" className="w-full border p-2 rounded" required />
                            <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 font-bold">Add Book</button>
                        </form>
                    </div>

                    <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                        <h3 className="font-bold text-green-900 mb-4">Bulk Upload (CSV/Excel)</h3>
                        <p className="text-sm text-green-700 mb-4">Headers: title, author, subject, price</p>
                        <form onSubmit={handleCsvUpload} className="space-y-4">
                            <input type="file" name="file" accept=".csv, .xlsx" className="w-full bg-white p-2 rounded border" required />
                            <button disabled={uploading} type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold">
                                {uploading ? 'Uploading...' : 'Upload Inventory'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookshopDashboard;