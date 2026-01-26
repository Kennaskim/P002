import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SchoolBookListsPage = () => {
    const { schoolId } = useParams();
    const navigate = useNavigate();
    const [bookLists, setBookLists] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch lists for this specific school
        api.get(`schools/${schoolId}/booklists/`)
            .then(res => setBookLists(res.data.results || res.data)) // Handle pagination or list
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [schoolId]);

    const findSellers = (bookTitle) => {
        navigate(`/?q=${encodeURIComponent(bookTitle)}`);
    };
    const checkAvailability = async (listId) => {
        const res = await api.get(`booklists/${listId}/check_availability/`);
        const availableCount = res.data.filter(b => b.is_available).length;
        alert(`We found ${availableCount} out of ${res.data.length} books available for purchase!`);
        // Advanced: You could offer to "Add all available to cart" here
    };

    if (loading) return <div className="p-8 text-center">Loading lists...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <Link to="/schools" className="text-gray-500 hover:text-green-600 mb-4 inline-block">← Back to Schools</Link>
            <h1 className="text-3xl font-bold mb-6">Required Textbooks</h1>

            {bookLists.length === 0 ? (
                <div className="p-8 bg-white rounded shadow text-center text-gray-500">
                    No book lists uploaded for this school yet.
                </div>
            ) : (
                <div className="space-y-6">
                    {bookLists.map(list => (
                        <div key={list.id} className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-green-600">
                            <div className="bg-green-50 px-6 py-4 border-b">
                                <h2 className="text-xl font-bold text-green-800">
                                    Grade {list.grade} ({list.academic_year})
                                </h2>
                                <button onClick={() => checkAvailability(list.id)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm">
                                    Check Availability
                                </button>
                            </div>
                            <div className="divide-y">
                                {list.textbooks && list.textbooks.length > 0 ? (
                                    list.textbooks.map(book => (
                                        <div key={book.id} className="p-4 flex flex-col sm:flex-row justify-between items-center hover:bg-gray-50 transition gap-4">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-800">{book.title}</h4>
                                                <div className="flex gap-2 mt-1 text-sm text-gray-600">
                                                    <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">{book.subject}</span>
                                                    <span>{book.author}</span>
                                                </div>
                                            </div>

                                            {/* 4. THE ACTION BUTTON */}
                                            <button
                                                onClick={() => findSellers(book.title)}
                                                className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow hover:bg-green-700 hover:shadow-md transition transform active:scale-95 flex items-center gap-2 whitespace-nowrap"
                                            >
                                                🔍 Find Sellers
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-gray-500 italic text-center">
                                        No books added to this list yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SchoolBookListsPage;