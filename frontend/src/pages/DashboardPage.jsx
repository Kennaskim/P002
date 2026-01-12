import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getMyListings, getConversations, getMyBookLists, deleteBookList, createAndAddBook, addBookToList, removeBookFromList, getMySwaps, acceptSwap, rejectSwap } from '../utils/api';

// --- PARENT DASHBOARD ---
const ParentDashboard = ({ user }) => {
    const [listings, setListings] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [swaps, setSwaps] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        getMyListings().then(res => setListings(res.data.results || res.data));
        getConversations().then(res => setConversations(res.data));
        getMySwaps().then(res => setSwaps(res.data)).catch(err => console.error("Swap fetch error", err));
    }, []);

    const handleSwapAction = async (id, action) => {
        try {
            if (action === 'accept') {
                const res = await acceptSwap(id);
                alert("Swap Accepted! Books marked as sold. Redirecting to chat...");
                if (res.data.conversation_id) {
                    navigate(`/chat/${res.data.conversation_id}`);
                }
            } else {
                await rejectSwap(id);
                alert("Swap Rejected.");
                const res = await getMySwaps();
                setSwaps(res.data);
            }

        } catch (err) {
            alert("Action failed.");
        }
    };

    const receivedSwaps = swaps.filter(s => s.receiver.id === user.id && s.status === 'pending');
    const mySentSwaps = swaps.filter(s => s.sender.id === user.id);

    return (
        <div>
            {/* --- SWAP SECTION --- */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">⇄ Swap Requests</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* INCOMING REQUESTS */}
                    <div className="bg-yellow-50 p-6 rounded shadow border border-yellow-200">
                        <h4 className="font-bold text-yellow-800 mb-3">Incoming Offers ({receivedSwaps.length})</h4>
                        {receivedSwaps.length === 0 ? <p className="text-gray-500 text-sm">No pending offers.</p> : (
                            <div className="space-y-4">
                                {receivedSwaps.map(swap => (
                                    <div key={swap.id} className="bg-white p-3 rounded border shadow-sm">
                                        <p className="text-sm text-gray-800">
                                            <span className="font-bold">{swap.sender.username}</span> wants to swap their:
                                            <br /><span className="text-green-600 font-semibold">{swap.offered_listing?.textbook?.title}</span>
                                            <br />for your:
                                            <br /><span className="text-blue-600 font-semibold">{swap.requested_listing?.textbook?.title}</span>
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => handleSwapAction(swap.id, 'accept')} className="flex-1 bg-green-600 text-white text-xs py-2 rounded">Accept</button>
                                            <button onClick={() => handleSwapAction(swap.id, 'reject')} className="flex-1 bg-red-500 text-white text-xs py-2 rounded">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SENT REQUESTS */}
                    <div className="bg-white p-6 rounded shadow">
                        <h4 className="font-bold text-gray-800 mb-3">My Sent Requests</h4>
                        {mySentSwaps.length === 0 ? <p className="text-gray-500 text-sm">You haven't sent any offers.</p> : (
                            <div className="space-y-3">
                                {mySentSwaps.map(swap => (
                                    <div key={swap.id} className="border-b pb-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">To: {swap.receiver.username}</span>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${swap.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                                swap.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {swap.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            You offered: {swap.offered_listing?.textbook?.title}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* --- END SWAP SECTION --- */}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Activity</h2>
                <Link to="/listings/create" className="bg-green-600 text-white px-4 py-2 rounded">+ Sell/Swap Book</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded shadow">
                    <h3 className="font-bold text-lg mb-4">My Listings ({listings.length})</h3>
                    {listings.slice(0, 3).map(l => (
                        <div key={l.id} className="border-b py-2 flex justify-between">
                            <span>{l.textbook?.title || "Book"}</span>
                            <span className={l.is_active ? 'text-green-600' : 'text-red-500'}>{l.is_active ? 'Active' : 'Sold'}</span>
                        </div>
                    ))}
                    <Link to="/listings/create" className="text-green-600 text-sm mt-2 block">Manage all listings →</Link>
                </div>
                <div className="bg-white p-6 rounded shadow">
                    <h3 className="font-bold text-lg mb-4">Messages ({conversations.length})</h3>
                    {conversations.slice(0, 3).map(c => (
                        <Link key={c.id} to={`/chat/${c.id}`} className="block border-b py-2 hover:bg-gray-50">
                            <span className="font-bold">{c.other_user?.username}</span>: <span className="text-gray-500 text-sm">{c.last_message}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- School Dashboard ---
const SchoolDashboard = ({ user }) => {
    const [bookLists, setBookLists] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedList, setSelectedList] = useState(null);

    useEffect(() => {
        getMyBookLists().then(res => setBookLists(res.data.results || res.data));
    }, []);

    const handleDelete = async (id) => {
        if (confirm("Delete this list?")) {
            await deleteBookList(id);
            setBookLists(prev => prev.filter(b => b.id !== id));
        }
    };
    const handleCreateList = async (e) => {
        e.preventDefault();
        const grade = e.target.grade.value;
        const year = e.target.year.value;

        try {
            const res = await createBookList({ grade, academic_year: year });
            setBookLists([...bookLists, res.data]);
            setShowForm(false);
            alert("List Created!");
        } catch (err) {
            alert("Error creating list");
        }
    };

    return (
        <div>
            {/* Header Area */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-700">Welcome, <strong>{user.username}</strong>.</p>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">School Book Lists</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    {showForm ? 'Cancel' : '+ Upload New List'}
                </button>
            </div>

            {/* CREATE FORM */}
            {showForm && (
                <form onSubmit={handleCreateList} className="bg-gray-100 p-4 rounded mb-6">
                    <div className="flex gap-4 mb-4">
                        <input name="grade" placeholder="Grade (e.g. 4)" className="border p-2 rounded flex-1" required />
                        <input name="year" placeholder="Year (e.g. 2025)" className="border p-2 rounded flex-1" required />
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">Save</button>
                </form>
            )}

            {/* LIST TABLE */}
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-4 text-left">Grade</th>
                            <th className="py-3 px-4 text-left">Year</th>
                            <th className="py-3 px-4 text-left">Books</th>
                            <th className="py-3 px-4 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookLists.map(list => (
                            <tr key={list.id} className="border-t">
                                <td className="py-3 px-4">{list.grade}</td>
                                <td className="py-3 px-4">{list.academic_year}</td>
                                <td className="py-3 px-4">{list.textbooks?.length || 0} items</td>
                                <td className="py-3 px-4 flex gap-3">
                                    {/*NEW MANAGE BUTTON */}
                                    <button onClick={() => setSelectedList(list)} className="text-blue-600 hover:underline">
                                        Manage Books
                                    </button>
                                    <button onClick={() => handleDelete(list.id)} className="text-red-600 hover:underline">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* RENDER MODAL IF A LIST IS SELECTED */}
            {selectedList && (
                <ManageListModal
                    list={selectedList}
                    onClose={() => { setSelectedList(null); window.location.reload(); }} // Reload to refresh counts
                />
            )}
        </div>
    );
};

//Bookshop Dashboard 
const BookshopDashboard = ({ user }) => {
    const [inventory, setInventory] = useState([]);

    useEffect(() => {
        // Bookshops use 'my-listings' but view it as 'Inventory'
        getMyListings().then(res => setInventory(res.data.results || res.data));
    }, []);

    const handleDelete = async (id) => {
        if (confirm("Remove this book from inventory?")) {
            try {
                // Call the generic delete API we already have for listings
                await api.delete(`listings/${id}/`);
                setInventory(prev => prev.filter(item => item.id !== id));
            } catch (err) {
                alert("Failed to remove item");
            }
        }
    };

    return (
        <div>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6">
                <p className="text-purple-700">Welcome, <strong>{user.username}</strong> (Bookshop Owner). Manage your shop inventory.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded shadow text-center border-t-4 border-purple-500">
                    <div className="text-2xl font-bold">{inventory.length}</div>
                    <div className="text-gray-500">Books in Stock</div>
                </div>
                <div className="bg-white p-6 rounded shadow text-center border-t-4 border-green-500">
                    <div className="text-2xl font-bold">KSh {inventory.reduce((sum, i) => sum + Number(i.price), 0)}</div>
                    <div className="text-gray-500">Total Inventory Value</div>
                </div>
            </div>

            <div className="bg-white rounded shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Current Inventory</h3>
                    <Link to="/listings/create" className="bg-purple-600 text-white px-4 py-2 rounded">+ Add Stock</Link>
                </div>
                <div className="space-y-2">
                    {inventory.map(item => (
                        <div key={item.id} className="flex justify-between items-center border-b pb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">📕</span>
                                <div>
                                    <p className="font-medium">{item.textbook.title}</p>
                                    <p className="text-xs text-gray-500">Listed: {new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-green-600">KSh {item.price}</span>
                                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-500 hover:text-red-700 text-sm">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD PAGE (THE SWITCHER) ---
const DashboardPage = () => {
    const { user } = useAuth();

    if (!user) return <div>Loading...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Common Header for Everyone */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Manage your account and activities</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow mb-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-3xl font-bold text-green-600">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-2xl font-bold">{user.username}</h1>
                    <p className="text-gray-500">{user.email}</p>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm mt-2 inline-block">
                        {user.user_type === 'school' ? '🏫 School Admin' :
                            user.user_type === 'bookshop' ? '🏪 Bookshop Owner' :
                                `⭐ ${user.rating.toFixed(1)} Rating`}
                    </span>
                </div>

                {/*HIDE "Create Listing" button for Schools */}
                {user.user_type !== 'school' && (
                    <Link to="/listings/create" className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700">
                        {user.user_type === 'bookshop' ? '+ Add Stock' : '+ Sell/Swap Book'}
                    </Link>
                )}
            </div>

            {/* SWITCHER LOGIC */}
            {user.user_type === 'school' ? (
                <SchoolDashboard user={user} />
            ) : user.user_type === 'bookshop' ? (
                <BookshopDashboard user={user} />
            ) : (
                <ParentDashboard user={user} />
            )}
        </div>
    );
};
// Manage List Modal
const GENERIC_SUBJECTS = ['Dictionary', 'Kamusi', 'Bible', 'Atlas', 'Encyclopedia', 'Storybook', 'Reference'];
const ACADEMIC_SUBJECTS = ['Mathematics', 'English', 'Kiswahili', 'Science & Technology', 'Social Studies', 'Agriculture', 'Home Science', 'Creative Arts', 'Computer Science', 'Religious Education', 'Music'];
const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const ManageListModal = ({ list, onClose }) => {
    const [currentBooks, setCurrentBooks] = useState(list.textbooks || []);
    // Default subject to Math, Grade to list's grade
    const [newBook, setNewBook] = useState({ title: '', author: '', subject: 'Mathematics', grade: list.grade });

    const handleSubjectChange = (e) => {
        const subject = e.target.value;
        let grade = newBook.grade;
        // Auto-set General grade for generic books
        if (GENERIC_SUBJECTS.includes(subject)) {
            grade = 'General';
        } else if (grade === 'General') {
            // Revert to the list's grade if switching back to academic subject
            grade = list.grade;
        }
        setNewBook({ ...newBook, subject, grade });
    };

    const handleManualAdd = async (e) => {
        e.preventDefault();
        try {
            const res = await createAndAddBook(list.id, newBook);
            setCurrentBooks([...currentBooks, res.data.book]);
            // Reset form but keep list grade
            setNewBook({ title: '', author: '', subject: 'Mathematics', grade: list.grade });
            alert("Book added successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to add book. Ensure Title and Subject are filled.");
        }
    };

    const handleRemove = async (bookId) => {
        try {
            await removeBookFromList(list.id, bookId);
            setCurrentBooks(currentBooks.filter(b => b.id !== bookId));
        } catch (err) { alert("Failed to remove book"); }
    };

    const isGeneric = GENERIC_SUBJECTS.includes(newBook.subject);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between mb-4">
                    <h2 className="text-xl font-bold">Manage: Grade {list.grade} ({list.academic_year})</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">✕ Close</button>
                </div>

                <div className="mb-6 bg-gray-50 p-4 rounded">
                    <h3 className="font-bold text-gray-700 mb-2">Current Books ({currentBooks.length})</h3>
                    {currentBooks.length === 0 ? <p className="text-sm text-gray-500">No books in this list yet.</p> : (
                        <ul className="space-y-2">
                            {currentBooks.map(book => (
                                <li key={book.id} className="flex justify-between items-center bg-white p-2 border rounded">
                                    <span>{book.title} <span className="text-gray-500 text-xs">({book.subject})</span></span>
                                    <button onClick={() => handleRemove(book.id)} className="text-red-500 text-sm">Remove</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-2">Add New Book</h3>
                    <form onSubmit={handleManualAdd} className="bg-blue-50 p-4 rounded border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="md:col-span-2">
                                <input
                                    placeholder="Book Title"
                                    className="w-full border p-2 rounded"
                                    value={newBook.title}
                                    onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <input
                                    placeholder="Author"
                                    className="w-full border p-2 rounded"
                                    value={newBook.author}
                                    onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Category / Subject</label>
                                <select
                                    className="w-full border p-2 rounded"
                                    value={newBook.subject}
                                    onChange={handleSubjectChange}
                                    required
                                >
                                    <optgroup label="General / Reference">
                                        {GENERIC_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </optgroup>
                                    <optgroup label="Academic Subjects">
                                        {ACADEMIC_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </optgroup>
                                </select>
                            </div>

                            {/* Hide Grade input if Generic */}
                            {!isGeneric && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Grade</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        value={newBook.grade}
                                        onChange={e => setNewBook({ ...newBook, grade: e.target.value })}
                                    >
                                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <button className="bg-green-600 text-white px-4 py-2 rounded w-full">Save & Add to List</button>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default DashboardPage;