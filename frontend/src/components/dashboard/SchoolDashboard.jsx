import React, { useState, useEffect } from 'react';
import { getMyBookLists, createBookList, deleteBookList } from '../../utils/api';

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
            alert("Error creating list.");
        }
    };

    return (
        <div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-700">Welcome, <strong>{user.username}</strong>.</p>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">School Book Lists</h2>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {showForm ? 'Cancel' : '+ Upload New List'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreateList} className="bg-gray-100 p-4 rounded mb-6">
                    <div className="flex gap-4 mb-4">
                        <input name="grade" placeholder="Grade (e.g. 4)" className="border p-2 rounded flex-1" required />
                        <input name="year" placeholder="Year (e.g. 2026-2027)" className="border p-2 rounded flex-1" required />
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">Save</button>
                </form>
            )}

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
                                    <button onClick={() => setSelectedList(list)} className="text-blue-600 hover:underline">Manage Books</button>
                                    <button onClick={() => handleDelete(list.id)} className="text-red-600 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SchoolDashboard;