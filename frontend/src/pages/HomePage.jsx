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
        <div className="pb-12 bg-gray-50 min-h-screen">
            <Hero />

            {/* --- RIDER VIEW --- */}
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

            {/* --- SCHOOL ADMIN VIEW (FIXED) --- */}
            {isSchool && (
                <div className="container mx-auto px-4 py-10">
                    <div className="max-w-4xl mx-auto text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800">School Administration</h2>
                        <p className="text-gray-500">Manage your school's book lists and profile settings.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

                        {/* Card 1: Manage Book Lists (Fixed Link to Dashboard) */}
                        <Link to="/dashboard" className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Book Lists</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Create and update required textbook lists for the academic year.
                            </p>
                            <span className="text-blue-600 font-bold group-hover:underline">Go to Dashboard &rarr;</span>
                        </Link>

                        {/* Card 2: Edit Profile */}
                        <Link to="/profile" className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition flex flex-col items-center text-center">

                            <h3 className="text-xl font-bold text-gray-900 mb-2">School Profile</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Update your school's location, contact details, and visibility.
                            </p>
                            <span className="text-green-600 font-bold group-hover:underline">Edit Profile &rarr;</span>
                        </Link>

                    </div>
                </div>
            )}

            {/* --- BOOKSHOP VIEW --- */}
            {isBookshop && (
                <div className="container mx-auto px-4 py-10">
                    <div className="max-w-4xl mx-auto text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800">Bookshop Portal</h2>
                        <p className="text-gray-500">Manage your inventory and shop settings.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

                        {/* Card 1: Manage Inventory */}
                        <Link to="/dashboard" className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Inventory</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Add new books, update prices, and manage your current stock levels.
                            </p>
                            <span className="text-purple-600 font-bold group-hover:underline">Go to Dashboard &rarr;</span>
                        </Link>

                        {/* Card 2: Shop Profile */}
                        <Link to="/profile" className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Shop Profile</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Update your shop name, location, and contact information.
                            </p>
                            <span className="text-blue-600 font-bold group-hover:underline">Edit Profile &rarr;</span>
                        </Link>

                    </div>
                </div>
            )}

            {/* --- MARKET USER VIEW (PARENTS/GUESTS) --- */}
            {isMarketUser && (
                <div className="container mx-auto px-4 mt-8">
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