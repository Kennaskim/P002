import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className="w-full max-w-lg">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search textbooks..."
                    className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-green-500 focus:border-green-500"
                />
                <button
                    type="submit"
                    className="absolute right-2.5 top-1.5 text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-xs px-4 py-1.5"
                >
                    Search
                </button>
            </div>
        </form>
    );
};

export default SearchBar;