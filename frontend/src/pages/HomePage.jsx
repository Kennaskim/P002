import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import ListingCard from '../components/ListingCard';

const HomePage = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Get the current URL location
    const location = useLocation();

    useEffect(() => {
        const fetchListings = async () => {
            setLoading(true);
            try {
                // Extract 'q' from URL query params 
                const searchParams = new URLSearchParams(location.search);
                const query = searchParams.get('q');

                // Pass the query to the backend as 'search' parameter
                // Django REST Framework SearchFilter uses '?search=' by default
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

    if (loading) return <div className="text-center py-10">Loading books...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {/* Dynamic Title based on search */}
                    {new URLSearchParams(location.search).get('q')
                        ? `Search Results for "${new URLSearchParams(location.search).get('q')}"`
                        : "Latest Textbooks"
                    }
                </h1>
                <Link
                    to="/listings/create"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                    + Sell a Book
                </Link>
            </div>

            {listings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500 text-lg">No books found.</p>
                    <Link to="/" className="text-green-600 font-medium hover:underline mt-2 inline-block">
                        Clear Search / View All
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {listings.map(listing => (
                        <ListingCard key={listing.id} listing={listing} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HomePage;