import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

const SchoolBookListsPage = () => {
    const { schoolId } = useParams();
    const [bookLists, setBookLists] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch lists for this specific school
        api.get(`schools/${schoolId}/booklists/`)
            .then(res => setBookLists(res.data.results || res.data)) // Handle pagination or list
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [schoolId]);

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
                            </div>
                            <div className="p-6">
                                {list.textbooks && list.textbooks.length > 0 ? (
                                    <ul className="space-y-3">
                                        {list.textbooks.map(book => (
                                            <li key={book.id} className="flex justify-between border-b pb-2 last:border-0">
                                                <div>
                                                    <p className="font-bold">{book.title}</p>
                                                    <p className="text-sm text-gray-600">{book.author}</p>
                                                </div>
                                                <span className="text-xs bg-gray-200 px-2 py-1 rounded self-start">{book.subject}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 italic">No books added to this list yet.</p>
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