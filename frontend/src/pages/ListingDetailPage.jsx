import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { addToCart, findOrCreateConversation, createReview, getUserReviews } from '../utils/api';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ListingDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToCart } = useCart();

    const [listing, setListing] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    // Review Form State
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Get Listing Details
                const listingRes = await api.get(`listings/${id}/`);
                setListing(listingRes.data);

                // 2. Get Seller Reviews
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
            alert("Review submitted!");
            setShowReviewForm(false);
            setComment('');
            // Refresh reviews
            const res = await getUserReviews(listing.listed_by.id);
            setReviews(res.data);
        } catch (error) {
            alert("Failed to submit review.");
        }
    };

    // ... existing handleAddToCart and handleMessageSeller ...
    const handleAddToCart = async () => {
        if (!user) { navigate('/login'); return; }
        setIsAddingToCart(true);
        try { await addToCart(listing.id); }
        finally { setIsAddingToCart(false); }
    };

    const handleMessageSeller = async () => {
        if (!user) { navigate('/login'); return; }
        if (listing.listed_by.id === user.id) { alert("Cannot message self"); return; }
        try {
            const response = await findOrCreateConversation(listing.listed_by.id);
            navigate(`/chat/${response.data.id}`);
        } catch (error) { alert("Could not start chat"); }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!listing) return <div className="p-8 text-center text-red-500">Book not found.</div>;

    const { textbook, listed_by } = listing;

    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/" className="text-gray-500 hover:text-green-600 mb-4 inline-block">← Back</Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Left Column: Book Details --- */}
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

                    {/* --- Reviews Section --- */}
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

                {/* --- Right Column: Seller Actions --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow sticky top-24">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                            KSh {listing.price}
                        </div>
                        <div className="text-gray-600 mb-6">
                            Sold by <span className="font-bold text-gray-900">{listed_by.username}</span>
                            <div className="text-sm text-yellow-600 mt-1">
                                ★ {listed_by.rating.toFixed(1)} ({listed_by.review_count} reviews)
                            </div>
                        </div>

                        <div className="space-y-3">
                            {user?.id !== listed_by.id && (
                                <Button onClick={handleMessageSeller}>Message Seller</Button>
                            )}
                            {user?.id !== listed_by.id && listing.listing_type === 'sell' && (
                                <Button variant="secondary" onClick={handleAddToCart} disabled={isAddingToCart}>
                                    {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListingDetailPage;