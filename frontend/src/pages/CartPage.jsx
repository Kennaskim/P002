import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import api from '../utils/api';

const CartPage = () => {
    const { cart, loading, setCart, removeFromCart } = useCart();
    const { notify } = useNotification();
    const [processing, setProcessing] = useState(false);
    const navigate = useNavigate();

    const [confirmModal, setConfirmModal] = useState({ show: false, action: null, title: "", message: "" });

    if (loading && !cart) return <div className="p-8 text-center">Loading cart...</div>;

    const items = cart?.items || [];
    const total = items.reduce((sum, item) => sum + Number(item.listing.price), 0);

    const requestRemove = (itemId) => {
        setConfirmModal({
            show: true,
            title: "Remove Item?",
            message: "Are you sure you want to remove this book from your cart?",
            isDangerous: true,
            confirmText: "Remove",
            action: () => {
                removeFromCart(itemId);
                setConfirmModal({ show: false });
            }
        });
    };

    const requestCheckout = () => {
        if (items.length === 0) return;
        setConfirmModal({
            show: true,
            title: "Confirm Order",
            message: `Purchase ${items.length} books for KSh ${total.toFixed(2)}?`,
            isDangerous: false,
            confirmText: `Pay KSh ${total}`,
            action: executeCheckout
        });
    };

    const executeCheckout = async () => {
        setConfirmModal({ show: false });
        setProcessing(true);

        try {
            const listingIds = items.map(item => item.listing.id);
            await api.post('orders/', { listing_ids: listingIds });
            if (setCart) setCart({ items: [] });

            notify("✅ Orders Placed! Go to Dashboard to Track & Pay.", "success");
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            notify("❌ Checkout Failed. Books may be sold.", "error");
            setTimeout(() => window.location.reload(), 2000);
        } finally {
            setProcessing(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
                <Link to="/" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">Browse Textbooks</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-8">Shopping Cart ({items.length} items)</h1>

            <ConfirmModal
                isOpen={confirmModal.show}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.confirmText}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
            />

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="flex bg-white p-4 rounded-lg shadow border border-gray-200">
                            <div className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                {item.listing.textbook?.cover_image ? (
                                    <img src={item.listing.textbook.cover_image} alt="Cover" className="w-full h-full object-cover" />
                                ) : <div className="flex items-center justify-center h-full text-2xl">📚</div>}
                            </div>
                            <div className="ml-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900">{item.listing.textbook?.title}</h3>
                                        <button onClick={() => requestRemove(item.id)} className="text-red-500 hover:text-red-700 text-sm font-bold px-2 py-1">✕ Remove</button>
                                    </div>
                                    <p className="text-sm text-gray-600">{item.listing.textbook?.author}</p>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="font-bold text-green-600">KSh {item.listing.price}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:w-80">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 sticky top-24">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
                        <div className="flex justify-between items-center mb-6 pt-4 border-t">
                            <span className="text-lg font-bold">Total</span>
                            <span className="text-xl font-bold text-green-600">KSh {total.toFixed(2)}</span>
                        </div>
                        <Button onClick={requestCheckout} disabled={processing} className="w-full bg-green-600 hover:bg-green-700">
                            {processing ? 'Processing...' : 'Checkout'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;