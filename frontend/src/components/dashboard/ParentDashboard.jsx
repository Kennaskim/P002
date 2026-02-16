import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyListings, getConversations, getMySwaps, acceptSwap, rejectSwap, getMyDeliveries } from '../../utils/api';
import DeliveryCard from './DeliveryCard';

const ParentDashboard = ({ user }) => {
    const [listings, setListings] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [swaps, setSwaps] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [listingsRes, conversationsRes, swapsRes, deliveriesRes] = await Promise.all([
                    getMyListings(),
                    getConversations(),
                    getMySwaps(),
                    getMyDeliveries()
                ]);

                setListings(listingsRes.data.results || listingsRes.data);
                setConversations(conversationsRes.data);
                setSwaps(swapsRes.data);
                setDeliveries(deliveriesRes.data);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            }
        };
        loadData();
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

    const activeSwaps = deliveries.filter(d => !!d.swap);
    const mySales = deliveries.filter(d => !d.swap && d.orders && d.orders.some(o => o.listing.listed_by.id === user.id));
    const myPurchases = deliveries.filter(d => !d.swap && d.orders && d.orders.some(o => o.buyer?.id === user.id));
    const receivedSwaps = swaps.filter(s => s.receiver.id === user.id && s.status === 'pending');
    const mySentSwaps = swaps.filter(s => s.sender.id === user.id);

    return (
        <div>
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📦 Outgoing Sales (To Ship)</h3>
                {mySales.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded text-gray-500 text-sm italic">No outgoing sales.</div>
                ) : (
                    mySales.map(d => <DeliveryCard key={d.id} delivery={d} type="sale" userId={user.id} navigate={navigate} />)
                )}
            </div>

            {activeSwaps.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">🔄 Active Swaps (Two-Way)</h3>
                    {activeSwaps.map(d => <DeliveryCard key={d.id} delivery={d} type="swap" userId={user.id} navigate={navigate} />)}
                </div>
            )}

            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🛍️ Incoming Orders (To Receive)</h3>
                {myPurchases.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded text-gray-500 text-sm italic">No incoming orders.</div>
                ) : (
                    myPurchases.map(d => <DeliveryCard key={d.id} delivery={d} type="purchase" userId={user.id} navigate={navigate} />)
                )}
            </div>

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

export default ParentDashboard;