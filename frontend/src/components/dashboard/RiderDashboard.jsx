import React from 'react';
import { useNavigate } from 'react-router-dom';

const RiderDashboard = ({ user, logout }) => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Rider Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {user.username}</p>
                </div>
                <button onClick={logout} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition">
                    Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg mb-4 text-gray-800">My Profile</h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Name:</span> <span className="font-medium">{user.username}</span></p>
                        <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{user.phone_number || "Not set"}</span></p>
                        <p><span className="text-gray-500">Vehicle:</span> <span className="font-medium">Motorbike</span></p>
                        <div className="mt-4 pt-4 border-t">
                            <button
                                onClick={() => navigate('/earnings')}
                                className="w-full bg-gray-100 text-gray-800 py-2 rounded font-bold hover:bg-gray-200"
                            >
                                💰 View Earnings History
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-2">Start Working</h2>
                        <p className="text-slate-400 mb-6">Go to the live map to view requests and track deliveries.</p>
                        <button
                            onClick={() => navigate('/rider')}
                            className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 transition shadow-lg shadow-green-900/50 w-full sm:w-auto"
                        >
                            Check For Delivery Requests
                        </button>
                    </div>
                    <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 group-hover:scale-110 transition-transform duration-500">
                        🏍️
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderDashboard;