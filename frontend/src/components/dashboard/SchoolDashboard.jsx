import React, { useState, useEffect } from 'react';
import {
    getMyBookLists,
    createBookList,
    deleteBookList,
    createAndAddBook,
    removeBookFromList,
    uploadBookListCsv
} from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext'; // [NEW]
import ConfirmModal from '../ConfirmModal'; // [NEW]

const SchoolDashboard = ({ user }) => {
    const { notify } = useNotification(); // [HOOK]
    const [bookLists, setBookLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('dashboard');
    const [selectedList, setSelectedList] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        try {
            const res = await getMyBookLists();
            setBookLists(res.data.results || res.data);
        } catch (error) {
            notify("Failed to fetch lists", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        const grade = e.target.grade.value;
        const year = e.target.year.value;
        try {
            const res = await createBookList({ grade, academic_year: year });
            setBookLists([res.data, ...bookLists]);
            setShowCreateModal(false);
            notify("Class list created successfully!", "success"); // [NOTIFY]
            handleManageList(res.data);
        } catch (err) {
            notify("Error creating list. Try again.", "error");
        }
    };

    // --- DELETE LOGIC ---
    const requestDelete = (id) => {
        setItemToDelete(id);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteBookList(itemToDelete);
            setBookLists(bookLists.filter(b => b.id !== itemToDelete));
            notify("List deleted successfully", "success");
        } catch (err) {
            notify("Failed to delete list", "error");
        } finally {
            setConfirmOpen(false);
            setItemToDelete(null);
        }
    };
    // --------------------

    const handleManageList = (list) => {
        setSelectedList(list);
        setView('manage');
        window.scrollTo(0, 0);
    };

    const handleBackToDashboard = () => {
        setSelectedList(null);
        setView('dashboard');
        fetchLists();
    };

    if (loading && !bookLists.length) return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4">
            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmOpen}
                title="Delete Class List?"
                message="This will delete the entire list and all books inside it. This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
                isDangerous={true}
                confirmText="Yes, Delete"
            />

            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        {view === 'dashboard' ? 'School Dashboard' : `Manage: ${selectedList?.grade}`}
                    </h1>
                    <p className="text-gray-500">
                        {view === 'dashboard' ? `Welcome back, ${user.username}` : `Academic Year: ${selectedList?.academic_year}`}
                    </p>
                </div>

                {view === 'dashboard' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow transition"
                    >
                        + Create New List
                    </button>
                )}

                {view === 'manage' && (
                    <button onClick={handleBackToDashboard} className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2">
                        &larr; Back to Lists
                    </button>
                )}
            </div>

            {/* DASHBOARD VIEW */}
            {view === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookLists.length === 0 ? (
                        <p className="text-gray-500 col-span-3 text-center py-10">No lists found. Create one to get started.</p>
                    ) : (
                        bookLists.map(list => (
                            <div key={list.id} onClick={() => handleManageList(list)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded text-sm uppercase">{list.grade}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); requestDelete(list.id); }} // [Use Request Delete]
                                        className="text-gray-300 hover:text-red-500 transition"
                                    >
                                        &#x2715;
                                    </button>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-1">{list.academic_year}</h3>
                                <p className="text-gray-500 text-sm mb-4">{list.textbooks?.length || 0} Books Listed</p>
                                <div className="text-blue-600 font-medium text-sm group-hover:underline">Manage Books &rarr;</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* MANAGE VIEW */}
            {view === 'manage' && selectedList && (
                <ListManager list={selectedList} notify={notify} />
            )}

            {/* Create Modal (Custom, keeping inline for simplicity or extract to component) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md animate-scale-in">
                        <h2 className="text-xl font-bold mb-4">Create New Class List</h2>
                        <form onSubmit={handleCreateList} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Class</label>
                                <input name="grade" placeholder="e.g. Grade 4" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                                <input name="year" placeholder="e.g. 2026" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" required />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-component for managing the list logic
const ListManager = ({ list, notify }) => {
    const [books, setBooks] = useState(list.textbooks || []);
    const [activeTab, setActiveTab] = useState('list');
    const [uploading, setUploading] = useState(false);

    // Delete State for Books
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);

    const handleAddSingleBook = async (e) => {
        e.preventDefault();
        const title = e.target.title.value;
        const author = e.target.author.value;
        const subject = e.target.subject.value;

        try {
            const res = await createAndAddBook(list.id, { title, author, subject });
            setBooks([...books, res.data]);
            notify("Book added successfully!", "success");
            e.target.reset();
        } catch (err) {
            notify("Failed to add book.", "error");
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
            notify("Bulk upload successful!", "success");
            window.location.reload(); // Simple reload to sync data fully
        } catch (err) {
            notify("Upload failed. Check file format.", "error");
        } finally {
            setUploading(false);
        }
    };

    const requestRemoveBook = (id) => {
        setBookToDelete(id);
        setConfirmOpen(true);
    };

    const confirmRemoveBook = async () => {
        if (!bookToDelete) return;
        try {
            await removeBookFromList(list.id, bookToDelete);
            setBooks(books.filter(b => b.id !== bookToDelete));
            notify("Book removed from list", "info");
        } catch (err) {
            notify("Error removing book", "error");
        } finally {
            setConfirmOpen(false);
            setBookToDelete(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <ConfirmModal
                isOpen={confirmOpen}
                title="Remove Book?"
                message="Are you sure you want to remove this book from the list?"
                onConfirm={confirmRemoveBook}
                onCancel={() => setConfirmOpen(false)}
                isDangerous={true}
                confirmText="Remove"
            />

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex-1 py-4 text-center font-medium transition ${activeTab === 'list' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    📚 Current Books ({books.length})
                </button>
                <button
                    onClick={() => setActiveTab('add')}
                    className={`flex-1 py-4 text-center font-medium transition ${activeTab === 'add' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    ➕ Add Books
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'list' ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {books.map((book) => (
                                    <tr key={book.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{book.title}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{book.subject}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{book.author}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => requestRemoveBook(book.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Manual Entry */}
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4">Add Single Book</h3>
                            <form onSubmit={handleAddSingleBook} className="space-y-4">
                                <input name="title" placeholder="Book Title *" className="w-full border p-2 rounded" required />
                                <input name="subject" placeholder="Subject" className="w-full border p-2 rounded" />
                                <input name="author" placeholder="Author" className="w-full border p-2 rounded" />
                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add Book</button>
                            </form>
                        </div>
                        {/* CSV Upload */}
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                            <h3 className="font-bold text-green-900 mb-4">Bulk Upload (CSV)</h3>
                            <form onSubmit={handleCsvUpload} className="space-y-4">
                                <input type="file" name="file" accept=".csv, .xlsx" className="w-full bg-white border p-2 rounded" required />
                                <button disabled={uploading} type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                                    {uploading ? 'Uploading...' : 'Upload File'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchoolDashboard;