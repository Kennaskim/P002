import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Input from '../components/Input';
import Button from '../components/Button';

const CreateListingPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [textbooks, setTextbooks] = useState([]);
    const [isNewBook, setIsNewBook] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        textbook_id: '',
        price: '',
        condition: 'good',
        listing_type: 'sell',
        description: '',
        title: '',
        author: '',
        grade: 'Grade 1',
        subject: 'Mathematics'
    });

    // Load existing textbooks on mount
    useEffect(() => {
        api.get('textbooks/').then(res => {
            const data = res.data.results || res.data;
            setTextbooks(data);
        }).catch(console.error);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalTextbookId = formData.textbook_id;

            // 1. If creating a NEW textbook, save it first
            if (isNewBook) {
                const textbookRes = await api.post('textbooks/', {
                    title: formData.title,
                    author: formData.author,
                    grade: formData.grade,
                    subject: formData.subject
                });
                finalTextbookId = textbookRes.data.id;
            }

            // 2. Create the Listing linked to that Textbook ID
            await api.post('listings/', {
                textbook_id: finalTextbookId,
                price: formData.price,
                condition: formData.condition,
                listing_type: formData.listing_type,
                description: formData.description
            });

            navigate('/'); // Success! Go home.
        } catch (error) {
            console.error(error);
            // Check if the backend sent a specific error for "listing_type"
            const errorMsg = error.response?.data?.listing_type
                ? error.response.data.listing_type[0]
                : "Failed to create listing. Please check your inputs.";

            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">List a Book</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">

                {/* Toggle: Select Existing vs Create New */}
                <div className="flex gap-4 mb-4">
                    <button
                        type="button"
                        className={`flex-1 py-2 rounded border ${!isNewBook ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200'}`}
                        onClick={() => setIsNewBook(false)}
                    >
                        Select Existing Book
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-2 rounded border ${isNewBook ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200'}`}
                        onClick={() => setIsNewBook(true)}
                    >
                        Add New Book
                    </button>
                </div>

                {/* Dynamic Section: Choose Book OR Enter Book Details */}
                {!isNewBook ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Choose Textbook</label>
                        <select
                            name="textbook_id"
                            value={formData.textbook_id}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md"
                            required={!isNewBook}
                        >
                            <option value="">-- Select a Book --</option>
                            {textbooks.map(book => (
                                <option key={book.id} value={book.id}>
                                    {book.title} ({book.grade} - {book.subject})
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                        <Input label="Book Title" name="title" value={formData.title} onChange={handleChange} required={isNewBook} />
                        <Input label="Author" name="author" value={formData.author} onChange={handleChange} />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                            <select name="grade" value={formData.grade} onChange={handleChange} className="w-full border rounded p-2">
                                {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <select name="subject" value={formData.subject} onChange={handleChange} className="w-full border rounded p-2">
                                {['Mathematics', 'English', 'Science', 'Social Studies'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* Sales Details (Always Visible) */}
                <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-4">Sales Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
                            <select name="listing_type" value={formData.listing_type} onChange={handleChange} className="w-full border rounded p-2">
                                <option value="sell">For Sale</option>
                                <option value="exchange">Exchange Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                            <select name="condition" value={formData.condition} onChange={handleChange} className="w-full border rounded p-2">
                                <option value="new">New</option>
                                <option value="good">Good</option>
                                <option value="fair">Fair</option>
                            </select>
                        </div>
                    </div>

                    {formData.listing_type === 'sell' && (
                        <div className="mt-4">
                            <Input label="Price (KSh)" type="number" name="price" value={formData.price} onChange={handleChange} required />
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <textarea
                            name="description"
                            rows="3"
                            className="w-full border rounded p-2"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="E.g. Slightly used, name written on inside cover..."
                        />
                    </div>
                </div>

                <Button type="submit" loading={loading}>
                    {isNewBook ? 'Create Book & List It' : 'List Book'}
                </Button>
            </form>
        </div>
    );
};

export default CreateListingPage;