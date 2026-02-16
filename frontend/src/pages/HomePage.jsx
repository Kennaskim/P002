import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import Hero from '../components/Hero';

const HomePage = () => {
    const { user } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const location = useLocation();

    const isRider = user && user.user_type === 'rider';
    const isSchool = user && user.user_type === 'school';
    const isBookshop = user && user.user_type === 'bookshop';
    const isMarketUser = !user || user.user_type === 'parent';

    useEffect(() => {
        if (!isMarketUser) {
            setLoading(false);
            return;
        }

        const fetchListings = async () => {
            setLoading(true);
            try {
                const searchParams = new URLSearchParams(location.search);
                const query = searchParams.get('q');

                const endpoint = query
                    ? `listings/?search=${encodeURIComponent(query)}`
                    : 'listings/';

                const response = await api.get(endpoint);
                setListings(response.data.results || response.data);
            } catch (err) {
                console.error("Failed to fetch listings:", err);
                setError('Could not load textbooks. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [location.search, isMarketUser]);

    return (
        <div className="pb-12">
            <Hero />

            {isRider && (
                <div className="container mx-auto px-4 text-center py-8">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6">
                        <div className="bg-yellow-100 p-4 rounded-full">
                            <span className="text-4xl">🏍️</span>
                        </div>
                        <div className="text-left flex-1">
                            <h2 className="text-xl font-bold text-gray-800">Rider Dashboard</h2>
                            <p className="text-gray-500 text-sm">
                                You are in active service. Go to the portal to view map and accept jobs.
                            </p>
                        </div>
                        <Link to="/rider" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition shadow-lg whitespace-nowrap">
                            Open Portal →
                        </Link>
                    </div>
                </div>
            )}

            {isSchool && (
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800">📚 Book Lists</h3>
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Required</span>
                            </div>
                            <p className="text-gray-500 mb-6">
                                Upload and manage the required textbooks for each grade. Parents will see these lists automatically.
                            </p>
                            <Link to="/schools/1/booklists" className="text-blue-600 font-bold hover:underline flex items-center gap-2">
                                Manage Lists <span>→</span>
                            </Link>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800">🏫 School Profile</h3>
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Public</span>
                            </div>
                            <p className="text-gray-500 mb-6">
                                Update your school details, location, and contact info so parents can find you.
                            </p>
                            <Link to="/profile" className="text-blue-600 font-bold hover:underline flex items-center gap-2">
                                Edit Profile <span>→</span>
                            </Link>
                        </div>
                    </div>

                    <div className="text-center mt-12 text-gray-400 text-sm">
                        <p>School Admins do not participate in direct peer-to-peer sales.</p>
                    </div>
                </div>
            )}

            {isBookshop && (
                <div className="container mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-purple-900 mb-2">My Bookshop Inventory</h2>
                                <p className="text-gray-500">
                                    You have active listings visible to parents. Keep your stock updated.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Link to="/dashboard" className="px-6 py-3 bg-purple-100 text-purple-700 font-bold rounded-lg hover:bg-purple-200 transition">
                                    View Dashboard
                                </Link>
                                <Link to="/listings/create" className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition shadow-lg">
                                    + Add New Stock
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isMarketUser && (
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {new URLSearchParams(location.search).get('q')
                                    ? `Search Results for "${new URLSearchParams(location.search).get('q')}"`
                                    : "Recent Listings"
                                }
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">
                                Browse available textbooks from schools and parents in Nyeri.
                            </p>
                        </div>
                        <Link
                            to="/listings/create"
                            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-bold shadow-lg flex items-center gap-2"
                        >
                            <span>+</span> Sell a Book
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[30vh]">
                            <div className="animate-spin h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
                            <p className="text-gray-500">Loading library...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500 font-bold">{error}</div>
                    ) : listings.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="text-6xl mb-4">🔍</div>
                            <p className="text-gray-500 text-xl font-medium">No books found matching your criteria.</p>
                            <Link to="/" className="text-green-600 font-bold hover:underline mt-6 inline-block">
                                Clear Search
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {listings.map(listing => (
                                <ListingCard key={listing.id} listing={listing} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HomePage;