import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParentDashboard from '../components/dashboard/ParentDashboard';
import SchoolDashboard from '../components/dashboard/SchoolDashboard';
import BookshopDashboard from '../components/dashboard/BookshopDashboard';
import RiderDashboard from '../components/dashboard/RiderDashboard';

const DashboardPage = () => {
    const { user, logout } = useAuth();

    if (!user) return <div className="text-center py-10">Loading Dashboard...</div>;

    if (user.user_type === 'rider') {
        return <RiderDashboard user={user} logout={logout} />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {user.username}</p>
                </div>
                {user.user_type !== 'school' && user.user_type !== 'bookshop' && (
                    <Link to="/listings/create" className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 shadow transition">
                        + Sell Book
                    </Link>
                )}
            </div>

            {user.user_type === 'school' ? <SchoolDashboard user={user} /> :
                user.user_type === 'bookshop' ? <BookshopDashboard user={user} /> :
                    <ParentDashboard user={user} />}
        </div>
    );
};

export default DashboardPage;