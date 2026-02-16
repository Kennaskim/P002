import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Hero = () => {
    const { user } = useAuth();

    // 1. RIDER VIEW
    if (user && user.user_type === 'rider') {
        return (
            <div className="bg-slate-900 text-white py-12 px-6 mb-8 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-500 opacity-5 pattern-diagonal-lines"></div>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
                    <div className="md:w-1/2 mb-8 md:mb-0">
                        <p className="text-yellow-400 font-bold text-lg mb-2 flex items-center gap-2">
                            Welcome back, {user.username}!
                        </p>

                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                            Your Bike, Your <br />
                            <span className="text-yellow-400">Earnings.</span>
                        </h1>
                        <p className="text-slate-300 text-lg mb-8 max-w-md">
                            Delivery jobs are waiting. Connect with parents in Nyeri to deliver textbooks.
                        </p>
                        <div className="flex gap-4">
                            <Link to="/rider" className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-8 rounded-xl transition shadow-lg transform hover:-translate-y-1">
                                Go to Map
                            </Link>
                            <Link to="/earnings" className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 px-8 rounded-xl transition">
                                My Wallet
                            </Link>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center">
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 w-full max-w-xs text-center">
                            <div className="text-6xl mb-2">📍</div>
                            <p className="text-gray-400 text-sm">Nyeri Zone</p>
                            <p className="text-yellow-400 font-bold text-lg">Logistics Hub</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. SCHOOL ADMIN VIEW
    if (user && user.user_type === 'school') {
        return (
            <div className="bg-blue-900 text-white py-16 px-6 mb-8 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
                    <div className="md:w-1/2">
                        <p className="text-blue-300 font-bold text-lg mb-2 flex items-center gap-2">
                            Hello, {user.username}
                        </p>

                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                            Manage Book Lists & <br />
                            <span className="text-blue-300">Curriculum</span>
                        </h1>
                        <p className="text-blue-100 text-lg mb-8 max-w-lg">
                            Upload required book lists for the academic year and update your school profile for parents to see.
                        </p>
                        <div className="flex gap-4">
                            {/* Updated Link to point to the new Dashboard */}
                            <Link to="/dashboard" className="bg-white text-blue-900 hover:bg-blue-50 font-bold py-3 px-8 rounded-xl transition shadow-lg">
                                Manage Lists
                            </Link>
                            <Link to="/profile" className="bg-blue-700 hover:bg-blue-600 border border-blue-500 text-white font-bold py-3 px-8 rounded-xl transition">
                                Edit Profile
                            </Link>
                        </div>
                    </div>
                    <div className="hidden md:block text-9xl opacity-20 transform -rotate-12">
                        🎓
                    </div>
                </div>
            </div>
        );
    }

    // 3. BOOKSHOP OWNER VIEW
    if (user && user.user_type === 'bookshop') {
        return (
            <div className="bg-purple-900 text-white py-16 px-6 mb-8 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
                    <div className="md:w-1/2">
                        <p className="text-purple-300 font-bold text-lg mb-2 flex items-center gap-2">
                            Welcome, {user.username}
                        </p>

                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                            Digitize Your <br />
                            <span className="text-purple-300">Storefront</span>
                        </h1>
                        <p className="text-purple-100 text-lg mb-8 max-w-lg">
                            Reach thousands of parents in Nyeri. List your books, track orders online.
                        </p>
                        <div className="flex gap-4">
                            {/* Pointing both to dashboard since that's where the action is */}
                            <Link to="/dashboard" className="bg-white text-purple-900 hover:bg-purple-50 font-bold py-3 px-8 rounded-xl transition shadow-lg">
                                Manage Inventory
                            </Link>
                            <Link to="/profile" className="bg-purple-700 hover:bg-purple-600 border border-purple-500 text-white font-bold py-3 px-8 rounded-xl transition">
                                Edit Profile
                            </Link>
                        </div>
                    </div>
                    <div className="hidden md:block text-9xl opacity-20 transform rotate-6">
                        📚
                    </div>
                </div>
            </div>
        );
    }

    // 4. PARENT / GUEST VIEW
    return (
        <div className="bg-green-900 text-white py-20 px-6 mb-8 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
            </svg>

            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
                <div className="md:w-1/2 text-center md:text-left">

                    {user ? (
                        <p className="text-green-300 font-bold text-lg mb-2 flex items-center justify-center md:justify-start gap-2">
                            Welcome back, {user.username}!
                        </p>
                    ) : (
                        <p className="text-green-300 font-bold text-lg mb-2">
                            Welcome to Textbook Exchange
                        </p>
                    )}

                    <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                        Purchase Or  <br />
                        <span className="text-green-300">Swap Textbooks</span>
                    </h1>
                    <p className="text-green-100 text-lg mb-8 max-w-lg mx-auto md:mx-0">
                        Connect with parents and schools to buy, sell, or exchange CBC easily.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Link to="/schools" className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2">
                            Find Books
                        </Link>
                        <Link to="/listings/create" className="bg-white text-green-900 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2">
                            Sell Books
                        </Link>
                    </div>
                </div>

                <div className="md:w-1/2 mt-10 md:mt-0 flex justify-center">
                    <div className="relative">
                        <div className="absolute -inset-4 bg-green-500 rounded-full opacity-30 blur-2xl animate-pulse"></div>
                        <img
                            src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80"
                            alt="Books"
                            className="relative rounded-2xl shadow-2xl border-4 border-white/20 w-full max-w-sm transform -rotate-2 hover:rotate-0 transition duration-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;