import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { addToCart, findOrCreateConversation, createReview, getUserReviews, createSwapRequest, getMyListings } from '../utils/api';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

const ListingDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToCart } = useCart();
    const { notify } = useNotification();

    const [listing, setListing] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const [showSwapModal, setShowSwapModal] = useState(false);
    const [myListings, setMyListings] = useState([]);
    const [selectedOfferId, setSelectedOfferId] = useState(null);

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const listingRes = await api.get(`listings/${id}/`);
                setListing(listingRes.data);

                const reviewRes = await getUserReviews(listingRes.data.listed_by.id);
                setReviews(reviewRes.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user) return navigate('/login');

        try {
            await createReview({
                listing: listing.id,
                rating,
                comment
            });
            notify("Review submitted!");
            setShowReviewForm(false);
            setComment('');
            const res = await getUserReviews(listing.listed_by.id);
            setReviews(res.data);
        } catch (error) {
            notify("Failed to submit review.");
        }
    };

    const handleAddToCart = async () => {
        if (!user) { navigate('/login'); return; }
        setIsAddingToCart(true);
        try { await addToCart(listing.id); }
        finally { setIsAddingToCart(false); }
    };

    const handleMessageSeller = async () => {
        if (!user) { navigate('/login'); return; }
        if (listing.listed_by.id === user.id) { notify("Cannot message self", "info"); return; }
        try {
            const response = await findOrCreateConversation(listing.listed_by.id, listing.id);
            navigate(`/chat/${response.data.id}`);
        } catch (error) { notify("Could not start chat", "error"); }
    };
    const handleOpenSwapModal = async () => {
        if (!user) {
            notify("Please login to swap.", "info");
            return;
        }
        try {
            const res = await getMyListings();
            const available = (res.data.results || res.data).filter(l => l.is_active);
            setMyListings(available);
            setShowSwapModal(true);
        } catch (err) {
            notify("Failed to load your inventory.", "error");
        }
    };

    const handleSubmitSwap = async () => {
        if (!selectedOfferId) return notify("Select a book to offer!", "error");
        try {
            await createSwapRequest({
                requested_listing_id: listing.id,
                offered_listing_id: selectedOfferId
            });
            notify("Swap Request Sent! Wait for the seller to accept.", "success");
            setShowSwapModal(false);
        } catch (err) {
            notify("Failed to send request. You may have already requested this.", "error");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!listing) return <div className="p-8 text-center text-red-500">Book not found.</div>;

    const { textbook, listed_by } = listing;
    const isSchool = user && user.user_type === 'school';
    const canSell = !user || user.user_type !== 'school';

    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/" className="text-gray-500 hover:text-green-600 mb-4 inline-block">← Back</Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                        <div className="bg-gray-100 p-8 flex justify-center">
                            {textbook.cover_image ? (
                                <img src={textbook.cover_image} alt={textbook.title} className="max-h-80 shadow-md" />
                            ) : <span className="text-6xl">📚</span>}
                        </div>
                        <div className="p-6">
                            <h1 className="text-3xl font-bold mb-2">{textbook.title}</h1>
                            <p className="text-xl text-gray-600 mb-4">{textbook.author}</p>
                            <div className="flex gap-2 mb-4">
                                <span className="badge bg-green-100 text-green-800 px-2 py-1 rounded">{textbook.grade}</span>
                                <span className="badge bg-blue-100 text-blue-800 px-2 py-1 rounded">{textbook.subject}</span>
                            </div>
                            <p className="text-gray-700">{listing.description}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Seller Reviews ({reviews.length})</h3>
                            {user && user.id !== listed_by.id && (
                                <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-green-600 text-sm hover:underline">
                                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                                </button>
                            )}
                        </div>

                        {showReviewForm && (
                            <form onSubmit={handleSubmitReview} className="mb-6 bg-gray-50 p-4 rounded">
                                <div className="mb-2">
                                    <label className="block text-sm font-bold mb-1">Rating</label>
                                    <select value={rating} onChange={e => setRating(e.target.value)} className="border p-1 rounded w-full">
                                        {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                                    </select>
                                </div>
                                <div className="mb-2">
                                    <label className="block text-sm font-bold mb-1">Comment</label>
                                    <textarea
                                        className="border p-2 w-full rounded"
                                        rows="2"
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit">Submit Review</Button>
                            </form>
                        )}

                        <div className="space-y-4">
                            {reviews.length === 0 ? <p className="text-gray-500">No reviews yet.</p> :
                                reviews.map(review => (
                                    <div key={review.id} className="border-b pb-2">
                                        <div className="flex justify-between">
                                            <span className="font-bold">{review.reviewer.username}</span>
                                            <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                                        </div>
                                        <p className="text-gray-600 text-sm">{review.comment}</p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow sticky top-24">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                            {listing.price > 0 ? `KSh ${listing.price}` : 'Exchange'}
                        </div>
                        <div className="text-gray-600 mb-6">
                            <p>Sold by <span className="font-bold text-gray-900">{listed_by.username}</span></p>

                            <div className="flex flex-wrap gap-2 mt-2">
                                {listed_by.location && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border flex items-center gap-1">
                                        📍 {listed_by.location}
                                    </span>
                                )}
                                {user && listed_by.phone_number && (
                                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200 flex items-center gap-1">
                                        📞 {listed_by.phone_number}
                                    </span>
                                )}
                            </div>

                            <div className="text-sm text-yellow-600 mt-2">
                                ★ {listed_by.rating ? listed_by.rating.toFixed(1) : "0.0"} ({listed_by.review_count} reviews)
                            </div>
                        </div>

                        <div className="space-y-3">
                            {listing.listing_type === 'exchange' && user?.id !== listed_by.id && !isSchool && (
                                <Button onClick={handleOpenSwapModal} className="bg-purple-600 hover:bg-purple-700 text-white w-full mb-2 rounded-2xl">
                                    ⇄ Request Swap
                                </Button>
                            )}

                            {user?.id !== listed_by.id && !isSchool && (
                                <Button onClick={handleMessageSeller} variant="secondary" className="w-full bg-green-600 hover:bg-green-700 rounded-2xl">
                                    Message Seller
                                </Button>
                            )}

                            {user?.id !== listed_by.id && listing.listing_type === 'sell' && !isSchool && (
                                <Button variant="secondary" onClick={handleAddToCart} disabled={isAddingToCart} className="w-full bg-gray-400 hover:bg-gray-500 rounded-2xl">
                                    {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showSwapModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Select a book to offer</h3>

                        {myListings.length === 0 ? (
                            <p className="text-gray-500 mb-4">You have no active listings to swap. List a book first!</p>
                        ) : (
                            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                                {myListings.map(myBook => (
                                    <div
                                        key={myBook.id}
                                        onClick={() => setSelectedOfferId(myBook.id)}
                                        className={`p-3 border rounded cursor-pointer ${selectedOfferId === myBook.id ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <p className="font-bold">{myBook.textbook.title}</p>
                                        <p className="text-xs text-gray-500">{myBook.condition}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button onClick={() => setShowSwapModal(false)} variant="secondary" className="flex-1 bg-gray-600 hover:bg-gray-700">Cancel</Button>
                            {myListings.length > 0 && (
                                <Button onClick={handleSubmitSwap} className="flex-1 bg-green-600 hover:bg-green-700">Send Offer</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListingDetailPage;