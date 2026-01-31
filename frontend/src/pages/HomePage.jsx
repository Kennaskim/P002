import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';

const HomePage = () => {
    const { user } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const location = useLocation();

    useEffect(() => {
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
    }, [location.search]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="animate-spin h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500">Loading library...</p>
        </div>
    );

    if (error) return <div className="text-center py-10 text-red-500 font-bold">{error}</div>;

    const canSell = !user || user.user_type !== 'school';

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {new URLSearchParams(location.search).get('q')
                            ? `Search Results for "${new URLSearchParams(location.search).get('q')}"`
                            : "Latest Textbooks"
                        }
                    </h1>
                    {/* NEW: Helper Text */}
                    <p className="text-gray-500 mt-1">
                        Click on any book below to view details, buy, or swap.
                    </p>
                </div>

                {canSell && (
                    <Link
                        to="/listings/create"
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-bold shadow-lg flex items-center gap-2"
                    >
                        <span>+</span> Sell a Book
                    </Link>
                )}
            </div>

            {listings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-500 text-xl font-medium">No books found matching your criteria.</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your search terms.</p>
                    <Link to="/" className="text-green-600 font-bold hover:underline mt-6 inline-block bg-green-50 px-6 py-2 rounded-full">
                        View All Books
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
    );
};

export default HomePage;