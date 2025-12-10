import React from 'react';
import { Link } from 'react-router-dom';

const ListingCard = ({ listing }) => {
    // Safe access to nested data (in case textbook is null for some reason)
    const book = listing.textbook || {};
    const seller = listing.listed_by || {};

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
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

                    {/* Badge for Type (Sale/Exchange) */}
                    <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white ${listing.listing_type === 'sell' ? 'bg-green-500' : 'bg-purple-500'
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
                        <div className="text-xs text-gray-500">
                            {listing.condition}
                        </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <span>{seller.username}</span>
                        <span>{listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ''}</span>
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default ListingCard;