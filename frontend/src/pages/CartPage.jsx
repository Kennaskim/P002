import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Button from '../components/Button';
import api from '../utils/api';

const CartPage = () => {
    const { cart, loading, setCart } = useCart(); // Destructure setCart to manually clear local state if needed
    const [processing, setProcessing] = useState(false);
    const navigate = useNavigate();

    if (loading && !cart) return <div className="p-8 text-center">Loading cart...</div>;

    const items = cart?.items || [];
    const total = items.reduce((sum, item) => sum + Number(item.listing.price), 0);


    const handleCheckout = async () => {
        if (items.length === 0) return;

        if (!window.confirm(`Confirm purchase of ${items.length} books for KSh ${total.toFixed(2)}?`)) return;

        setProcessing(true);

        try {
            // 1. Send ONE "Batch Request"
            const listingIds = items.map(item => item.listing.id);
            await api.post('orders/', { listing_ids: listingIds });

            // 2. Backend now handles the deletion!
            // We just update the local UI to look empty immediately
            if (setCart) setCart({ items: [] });

            // 3. Success & Redirect
            alert("✅ Orders Placed! \n\nItems have been grouped by seller.\nNext Step: Go to Dashboard -> 'Track Order' to pay.");
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            alert("Checkout Failed. One or more books might already be sold. Please refresh.");
            window.location.reload(); // Reload to sync with real database state
        } finally {
            setProcessing(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
                <p className="text-gray-600 mb-8">Looks like you haven't added any books yet.</p>
                <Link to="/" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
                    Browse Textbooks
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-8">Shopping Cart ({items.length} items)</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Cart Items List */}
                <div className="flex-1 space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="flex bg-white p-4 rounded-lg shadow border border-gray-200">
                            {/* Image */}
                            <div className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                {item.listing.textbook?.cover_image ? (
                                    <img
                                        src={item.listing.textbook.cover_image}
                                        alt={item.listing.textbook.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-2xl">📚</div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="ml-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{item.listing.textbook?.title}</h3>
                                    <p className="text-sm text-gray-600">{item.listing.textbook?.author}</p>
                                    <p className="text-xs text-gray-500 mt-1">Condition: {item.listing.condition}</p>
                                </div>

                                <div className="flex justify-between items-center mt-4">
                                    <span className="font-bold text-green-600">KSh {item.listing.price}</span>
                                    {/* Only remove capability, not processing logic needed here */}
                                    <span className="text-xs text-gray-400">In Cart</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Checkout Summary */}
                <div className="lg:w-80">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 sticky top-24">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">KSh {total.toFixed(2)}</span>
                        </div>
                        {/*<div className="flex justify-between mb-4">
                            <span className="text-gray-600">Delivery</span>
                            <span className="text-green-600 font-medium">Free</span>
                        </div>*/}

                        <div className="border-t pt-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold">Total</span>
                                <span className="text-xl font-bold text-green-600">KSh {total.toFixed(2)}</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleCheckout}
                            disabled={processing}
                            className={`w-full ${processing ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition'}`}
                        >
                            {processing ? 'Processing...' : 'Checkout'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;