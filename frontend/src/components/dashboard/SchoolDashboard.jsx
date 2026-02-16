import React, { useState, useEffect } from 'react';
import {
    getMyBookLists,
    createBookList,
    deleteBookList,
    createAndAddBook,
    removeBookFromList,
    uploadBookListCsv
} from '../../utils/api';

const SchoolDashboard = ({ user }) => {
    const [bookLists, setBookLists] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedList, setSelectedList] = useState(null); // Determines if we are in "Manage Mode"

    // Fetch lists on load
    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = () => {
        getMyBookLists().then(res => setBookLists(res.data.results || res.data));
    };

    const handleDeleteList = async (id) => {
        if (confirm("Are you sure you want to delete this entire list?")) {
            await deleteBookList(id);
            setBookLists(prev => prev.filter(b => b.id !== id));
            if (selectedList?.id === id) setSelectedList(null);
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        const grade = e.target.grade.value;
        const year = e.target.year.value;
        try {
            const res = await createBookList({ grade, academic_year: year });
            setBookLists([...bookLists, res.data]);
            setShowCreateForm(false);
            // SMART LOGIC: Immediately open the manager for the new list
            setSelectedList(res.data);
        } catch (err) {
            alert("Error creating list.");
        }
    };

    // --- Sub-Component for Managing a Specific List ---
    const ListManager = ({ list, onBack, onUpdate }) => {
        const [books, setBooks] = useState(list.textbooks || []);
        const [uploading, setUploading] = useState(false);

        const handleAddSingleBook = async (e) => {
            e.preventDefault();
            const title = e.target.title.value;
            const author = e.target.author.value;
            const subject = e.target.subject.value;

            try {
                const res = await createAndAddBook(list.id, { title, author, subject });
                setBooks([...books, res.data]); // Update local state immediately
                e.target.reset();
            } catch (err) {
                alert("Failed to add book.");
            }
        };

        const handleCsvUpload = async (e) => {
            e.preventDefault();
            const file = e.target.file.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            setUploading(true);

            try {
                await uploadBookListCsv(list.id, formData);
                alert("Books uploaded successfully!");
                // Refresh the full list to get updated textbooks
                const res = await getMyBookLists();
                const updatedList = (res.data.results || res.data).find(l => l.id === list.id);
                if (updatedList) setBooks(updatedList.textbooks);
            } catch (err) {
                alert("Upload failed. Ensure CSV has headers: title, author, subject");
            } finally {
                setUploading(false);
            }
        };

        const handleRemoveBook = async (textbookId) => {
            if (!confirm("Remove this book from the list?")) return;
            try {
                await removeBookFromList(list.id, textbookId);
                setBooks(books.filter(b => b.id !== textbookId));
            } catch (err) {
                alert("Error removing book");
            }
        };

        return (
            <div className="bg-white p-6 rounded shadow">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Managing: {list.grade} ({list.academic_year})</h2>
                        <p className="text-gray-500 text-sm">Add books to this class list below.</p>
                    </div>
                    <button onClick={onBack} className="text-gray-600 hover:text-gray-900 font-medium">
                        &larr; Back to Dashboard
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Option 1: Add Single Book */}
                    <div className="bg-blue-50 p-4 rounded border border-blue-100">
                        <h3 className="font-semibold text-blue-800 mb-2">Option 1: Add Single Book</h3>
                        <form onSubmit={handleAddSingleBook} className="space-y-3">
                            <input name="title" placeholder="Book Title (Required)" className="w-full border p-2 rounded" required />
                            <input name="subject" placeholder="Subject (e.g. Math)" className="w-full border p-2 rounded" />
                            <input name="author" placeholder="Author" className="w-full border p-2 rounded" />
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add Book</button>
                        </form>
                    </div>

                    {/* Option 2: Upload CSV */}
                    <div className="bg-green-50 p-4 rounded border border-green-100">
                        <h3 className="font-semibold text-green-800 mb-2">Option 2: Bulk Upload</h3>
                        <p className="text-xs text-green-700 mb-3">Upload a CSV or Excel file with headers: <b>title, author, subject</b>.</p>
                        <form onSubmit={handleCsvUpload} className="space-y-3">
                            <input type="file" name="file" accept=".csv, .xlsx" className="w-full bg-white border p-2 rounded" required />
                            <button disabled={uploading} type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                                {uploading ? 'Uploading...' : 'Upload File'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Books List Table */}
                <h3 className="font-bold text-gray-700 mb-3">Current Books in List ({books.length})</h3>
                <div className="overflow-x-auto border rounded">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {books.length === 0 ? (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">No books added yet.</td></tr>
                            ) : (
                                books.map(book => (
                                    <tr key={book.id}>
                                        <td className="px-4 py-2">{book.title}</td>
                                        <td className="px-4 py-2 text-gray-500">{book.subject}</td>
                                        <td className="px-4 py-2 text-gray-500">{book.author}</td>
                                        <td className="px-4 py-2">
                                            <button onClick={() => handleRemoveBook(book.id)} className="text-red-600 hover:text-red-900 text-sm">Remove</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- Main Render ---

    // If a list is selected, show the Manager instead of the Dashboard
    if (selectedList) {
        return <ListManager list={selectedList} onBack={() => { setSelectedList(null); loadLists(); }} />;
    }

    return (
        <div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-700">Welcome, <strong>{user.username}</strong>.</p>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">School Book Lists</h2>
                <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    {showCreateForm ? 'Cancel' : '+ Create New List'}
                </button>
            </div>

            {showCreateForm && (
                <form onSubmit={handleCreateList} className="bg-gray-100 p-4 rounded mb-6 border">
                    <h3 className="font-bold mb-3 text-gray-700">Create New Class List</h3>
                    <div className="flex gap-4 mb-4">
                        <input name="grade" placeholder="Grade (e.g. Grade 4)" className="border p-2 rounded flex-1" required />
                        <input name="year" placeholder="Year (e.g. 2026)" className="border p-2 rounded flex-1" required />
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700">Save & Add Books</button>
                </form>
            )}

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Grade</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Year</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Books</th>
                            <th className="py-3 px-4 text-left font-semibold text-gray-600">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {bookLists.map(list => (
                            <tr key={list.id} className="hover:bg-gray-50">
                                <td className="py-3 px-4">{list.grade}</td>
                                <td className="py-3 px-4">{list.academic_year}</td>
                                <td className="py-3 px-4 text-gray-500">{list.textbooks?.length || 0} items</td>
                                <td className="py-3 px-4 flex gap-3">
                                    <button onClick={() => setSelectedList(list)} className="text-blue-600 hover:text-blue-800 font-medium">Manage Books</button>
                                    <button onClick={() => handleDeleteList(list.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {bookLists.length === 0 && <div className="p-6 text-center text-gray-500">No book lists found. Create one above.</div>}
            </div>
        </div>
    );
};

export default SchoolDashboard;