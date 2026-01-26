import React from 'react';
import { Link } from 'react-router-dom';

const ListingCard = ({ listing }) => {
    // Safe access to nested data
    const book = listing.textbook || {};
    const seller = listing.listed_by || {};

    // Check if the seller is a bookshop
    const isShop = seller.user_type === 'bookshop';

    return (
        <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border ${isShop ? 'border-blue-200' : 'border-gray-100'}`}>
            <Link to={`/listings/${listing.id}`}>
                {/* 1. Image Area */}
                <div className="aspect-[3/4] bg-gray-200 relative">
                    {book.cover_image ? (
                        <img
                            src={book.cover_image}
                            alt={book.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                            📚
                        </div>
                    )}

                    {/* --- NEW: STORE BADGE (Left side) --- */}
                    {isShop && (
                        <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow z-10 flex items-center gap-1">
                            🏪 Store
                        </span>
                    )}

                    {/* Badge for Type (Right side) */}
                    <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white shadow ${listing.listing_type === 'sell' ? 'bg-green-500' : 'bg-purple-500'
                        }`}>
                        {listing.listing_type === 'sell' ? 'For Sale' : 'Exchange'}
                    </span>
                </div>

                {/* 2. Content Area */}
                <div className="p-4">
                    <h3 className="font-bold text-gray-900 truncate">{book.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{book.author}</p>

                    <div className="mt-3 flex justify-between items-center">
                        <div>
                            {listing.listing_type === 'sell' ? (
                                <span className="text-lg font-bold text-green-600">
                                    KSh {listing.price}
                                </span>
                            ) : (
                                <span className="text-sm font-medium text-purple-600">
                                    Trade
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {listing.condition}
                        </div>
                    </div>

                    {/* Footer: Seller Info */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <div className="flex items-center gap-1 truncate max-w-[70%]">
                            {/* Icon based on user type */}
                            <span>{isShop ? '🏪' : '👤'}</span>

                            {/* Highlight Shop Name */}
                            <span className={isShop ? 'font-bold text-blue-700' : ''}>
                                {seller.username}
                            </span>

                            {seller.location && <span className="text-gray-400">📍{seller.location}</span>}
                        </div>

                        <span>{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ''}</span>
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default ListingCard;