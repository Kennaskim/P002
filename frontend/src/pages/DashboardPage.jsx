import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getMyListings, getConversations, getMyBookLists, deleteBookList, createAndAddBook, removeBookFromList, getMySwaps, acceptSwap, rejectSwap, createBookList, getMyDeliveries } from '../utils/api';

// --- HELPER COMPONENT: Delivery Card ---
const DeliveryCard = ({ delivery, type, userId, navigate }) => {
    const isSwap = type === 'swap';
    const isSale = type === 'sale';

    let title, subtitle, badgeColor, badgeText;

    if (isSwap) {
        // Determine who the partner is
        const partnerName = delivery.swap.sender === userId ? delivery.swap.receiver.username : delivery.swap.sender.username;
        title = `Swap with ${partnerName}`;
        subtitle = "🔄 Round Trip Logistics";
        badgeColor = "bg-purple-100 text-purple-700";
        badgeText = "Active Swap";
    } else if (isSale) {
        // Safely access buyer name
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

// --- PARENT DASHBOARD ---
const ParentDashboard = ({ user }) => {
    const { logout } = useAuth();
    const [listings, setListings] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [swaps, setSwaps] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const navigate = useNavigate();

    // Riders section
    if (user && user.user_type === 'rider') {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">🏍️ Rider Profile</h1>
                    <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded shadow-md mb-6">
                    <h2 className="text-xl font-bold text-blue-800 mb-2">Ready to work?</h2>
                    <p className="text-gray-700 mb-4">Go to the Rider Job Board to view and accept pending deliveries.</p>
                    <button onClick={() => navigate('/rider')} className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 transition">Go to Job Board →</button>
                </div>
                <div className="bg-white p-6 rounded shadow border">
                    <h3 className="font-bold text-lg mb-4">My Stats</h3>
                    <p><strong>Name:</strong> {user.username}</p>
                    <p><strong>Phone:</strong> {user.phone_number || "Not set"}</p>
                    <p><strong>Vehicle:</strong> Motorbike</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        getMyListings().then(res => setListings(res.data.results || res.data));
        getConversations().then(res => setConversations(res.data));
        getMySwaps().then(res => setSwaps(res.data)).catch(err => console.error("Swap fetch error", err));
        getMyDeliveries().then(res => setDeliveries(res.data)).catch(console.error);
    }, []);

    const handleSwapAction = async (id, action) => {
        try {
            if (action === 'accept') {
                const res = await acceptSwap(id);
                alert("Swap Accepted! Redirecting...");
                if (res.data.conversation_id) navigate(`/chat/${res.data.conversation_id}`);
            } else {
                await rejectSwap(id);
                alert("Swap Rejected.");
                const res = await getMySwaps();
                setSwaps(res.data);
            }
        } catch (err) {
            alert("Action failed.");
        }
    };

    // --- SORTING LOGIC ---
    // 1. Swaps are anything with .swap
    const activeSwaps = deliveries.filter(d => !!d.swap);

    // 2. Sales: Not a swap, AND I am the seller of the first item
    const mySales = deliveries.filter(d => !d.swap && d.orders && d.orders.some(o => o.listing.listed_by.id === user.id));

    // 3. Purchases: Not a swap, AND I am the buyer of the first item
    const myPurchases = deliveries.filter(d => !d.swap && d.orders && d.orders.some(o => o.buyer?.id === user.id));

    const receivedSwaps = swaps.filter(s => s.receiver.id === user.id && s.status === 'pending');
    const mySentSwaps = swaps.filter(s => s.sender.id === user.id);

    return (
        <div>
            {/* --- 1. OUTGOING (SALES) --- */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📦 Outgoing Sales (To Ship)</h3>
                {mySales.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded text-gray-500 text-sm italic">No outgoing sales.</div>
                ) : (
                    mySales.map(d => <DeliveryCard key={d.id} delivery={d} type="sale" userId={user.id} navigate={navigate} />)
                )}
            </div>

            {/* --- 2. ACTIVE SWAPS --- */}
            {activeSwaps.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">🔄 Active Swaps (Two-Way)</h3>
                    {activeSwaps.map(d => <DeliveryCard key={d.id} delivery={d} type="swap" userId={user.id} navigate={navigate} />)}
                </div>
            )}

            {/* --- 3. INCOMING (PURCHASES) --- */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🛍️ Incoming Orders (To Receive)</h3>
                {myPurchases.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded text-gray-500 text-sm italic">No incoming orders.</div>
                ) : (
                    myPurchases.map(d => <DeliveryCard key={d.id} delivery={d} type="purchase" userId={user.id} navigate={navigate} />)
                )}
            </div>

            {/* --- PENDING SWAPS --- */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">⇄ Pending Swap Requests</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-yellow-50 p-6 rounded shadow border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-3">Incoming Offers ({receivedSwaps.length})</h4>
                        {receivedSwaps.length === 0 ? <p className="text-gray-500 text-sm">No pending offers.</p> : (
                            <div className="space-y-4">
                                {receivedSwaps.map(swap => (
                                    <div key={swap.id} className="bg-white p-3 rounded border shadow-sm">
                                        <p className="text-sm text-gray-800">
                                            <span className="font-bold">{swap.sender.username}</span> wants: <span className="font-semibold text-blue-600">{swap.requested_listing?.textbook?.title}</span>
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleSwapAction(swap.id, 'accept')} className="flex-1 bg-green-600 text-white text-xs py-2 rounded">Accept</button>
                                            <button onClick={() => handleSwapAction(swap.id, 'reject')} className="flex-1 bg-red-500 text-white text-xs py-2 rounded">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded shadow">
                        <h4 className="font-bold text-gray-800 mb-3">My Sent Requests</h4>
                        {mySentSwaps.length === 0 ? <p className="text-gray-500 text-sm">No sent offers.</p> : (
                            <div className="space-y-2">
                                {mySentSwaps.map(swap => (
                                    <div key={swap.id} className="border-b pb-2 text-sm">
                                        You offered <span className="font-bold">{swap.offered_listing?.textbook?.title}</span>
                                        <span className={`ml-2 text-xs font-bold ${swap.status === 'accepted' ? 'text-green-600' : 'text-yellow-600'}`}>{swap.status.toUpperCase()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ACTIVITY --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded shadow">
                    <h3 className="font-bold text-lg mb-4">My Listings</h3>
                    {listings.slice(0, 3).map(l => (
                        <div key={l.id} className="border-b py-2 flex justify-between">
                            <span>{l.textbook?.title}</span>
                            <span className={l.is_active ? 'text-green-600' : 'text-red-500'}>{l.is_active ? 'Active' : 'Sold'}</span>
                        </div>
                    ))}
                    <Link to="/listings/create" className="text-green-600 text-sm mt-2 block">View All →</Link>
                </div>
                <div className="bg-white p-6 rounded shadow">
                    <h3 className="font-bold text-lg mb-4">Messages</h3>
                    {conversations.slice(0, 3).map(c => (
                        <Link key={c.id} to={`/chat/${c.id}`} className="block border-b py-2 hover:bg-gray-50">
                            <span className="font-bold">{c.other_user?.username}</span>: <span className="text-gray-500 text-sm">{c.last_message}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- SCHOOL DASHBOARD (UNCHANGED) ---
const SchoolDashboard = ({ user }) => {
    const [bookLists, setBookLists] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedList, setSelectedList] = useState(null);

    useEffect(() => {
        getMyBookLists().then(res => setBookLists(res.data.results || res.data));
    }, []);

    const handleDelete = async (id) => {
        if (confirm("Delete this list?")) {
            await deleteBookList(id);
            setBookLists(prev => prev.filter(b => b.id !== id));
        }
    };
    const handleCreateList = async (e) => {
        e.preventDefault();
        const grade = e.target.grade.value;
        const year = e.target.year.value;

        try {
            const res = await createBookList({ grade, academic_year: year });
            setBookLists([...bookLists, res.data]);
            setShowForm(false);
            alert("List Created!");
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                alert(`Error: ${JSON.stringify(err.response.data)}`);
            } else {
                alert("Error creating list. Check console for details.");
            }
        }
    };

    return (
        <div>
            {/* Header Area */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-700">Welcome, <strong>{user.username}</strong>.</p>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">School Book Lists</h2>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {showForm ? 'Cancel' : '+ Upload New List'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreateList} className="bg-gray-100 p-4 rounded mb-6">
                    <div className="flex gap-4 mb-4">
                        <input name="grade" placeholder="Grade (e.g. 4)" className="border p-2 rounded flex-1" required />
                        <input name="year" placeholder="Year (e.g. 2026-2027)" className="border p-2 rounded flex-1" required />
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">Save</button>
                </form>
            )}

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-4 text-left">Grade</th>
                            <th className="py-3 px-4 text-left">Year</th>
                            <th className="py-3 px-4 text-left">Books</th>
                            <th className="py-3 px-4 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookLists.map(list => (
                            <tr key={list.id} className="border-t">
                                <td className="py-3 px-4">{list.grade}</td>
                                <td className="py-3 px-4">{list.academic_year}</td>
                                <td className="py-3 px-4">{list.textbooks?.length || 0} items</td>
                                <td className="py-3 px-4 flex gap-3">
                                    <button onClick={() => setSelectedList(list)} className="text-blue-600 hover:underline">Manage Books</button>
                                    <button onClick={() => handleDelete(list.id)} className="text-red-600 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedList && (
                <ManageListModal
                    list={selectedList}
                    onClose={() => { setSelectedList(null); window.location.reload(); }}
                />
            )}
        </div>
    );
};

// --- BOOKSHOP DASHBOARD (UPDATED) ---
const BookshopDashboard = ({ user }) => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [deliveries, setDeliveries] = useState([]); // <-- NEW
    const [showBulkUpload, setShowBulkUpload] = useState(false);

    useEffect(() => {
        getMyListings().then(res => setInventory(res.data.results || res.data));
        getConversations().then(res => setConversations(res.data));
        getMyDeliveries().then(res => setDeliveries(res.data)).catch(console.error); // <-- NEW
    }, []);

    // Filter Sales for Bookshop
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
            alert("Upload Failed. Make sure your Excel file has columns: 'Title' and 'Price'.");
        }
    };

    return (
        <div>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6">
                <p className="text-purple-700">Welcome, <strong>{user.username}</strong> (Bookshop Owner). Manage your shop inventory.</p>
            </div>

            {/* --- STATS --- */}
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

            {/* --- NEW: OUTGOING SALES SECTION FOR BOOKSHOPS --- */}
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
                            <p className="text-sm text-gray-600 mb-3">Supported: <strong>.xlsx, .xls, .csv</strong>. Required: <strong>Title, Price</strong>.</p>
                            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200" />
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
                    {conversations.length === 0 ? (
                        <p className="text-gray-500 text-sm">No active messages.</p>
                    ) : (
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
                    )}
                    <Link to="/chat" className="text-green-600 text-sm mt-4 block font-bold text-center border-t pt-2">View All Messages →</Link>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD PAGE (THE SWITCHER) ---
const DashboardPage = () => {
    const { user } = useAuth();

    if (!user) return <div>Loading...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {user.username}</p>
                </div>
                {user.user_type !== 'school' && (
                    <Link to="/listings/create" className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700">
                        + Sell Book
                    </Link>
                )}
            </div>

            {user.user_type === 'school' ? <SchoolDashboard user={user} /> :
                user.user_type === 'bookshop' ? <BookshopDashboard user={user} /> :
                    <ParentDashboard user={user} />}
        </div>
    );
};

export default DashboardPage;