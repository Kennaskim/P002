import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Hero = () => {
    const { user } = useAuth();

    // 1. RIDER VIEW (Tailored for Work)
    if (user && user.user_type === 'rider') {
        return (
            <div className="bg-gray-900 text-white py-16 px-4 mb-8 rounded-b-3xl shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-green-900 opacity-20 pattern-grid-lg"></div>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
                    <div className="md:w-1/2 mb-8 md:mb-0">
                        <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4 inline-block">
                            Rider Portal
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                            Earn Money Delivering <br />
                            <span className="text-green-400">Knowledge</span>
                        </h1>
                        <p className="text-gray-300 text-lg mb-8 max-w-md">
                            View available delivery jobs in your area, track your earnings, and manage your schedule efficiently.
                        </p>
                        <div className="flex gap-4">
                            <Link to="/rider" className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition shadow-lg transform hover:-translate-y-1">
                                View Active Jobs
                            </Link>
                            <Link to="/earnings" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold py-3 px-8 rounded-lg transition">
                                My Earnings
                            </Link>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center">
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 max-w-sm w-full">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-green-500 p-3 rounded-full">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-300">Current Status</p>
                                    <p className="font-bold text-xl text-green-400">Ready to Deliver</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400">Check your dashboard for new pickup requests in Nyeri.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. SCHOOL ADMIN VIEW (Tailored for Management)
    if (user && user.user_type === 'school') {
        return (
            <div className="bg-blue-900 text-white py-16 px-4 mb-8 rounded-b-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
                    <div className="md:w-1/2">
                        <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4 inline-block">
                            School Administration
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                            Manage Your School's <br />
                            <span className="text-blue-300">Book Inventory</span>
                        </h1>
                        <p className="text-blue-100 text-lg mb-8 max-w-lg">
                            Upload book lists for parents, manage surplus textbooks, and track student exchanges easily.
                        </p>
                        <div className="flex gap-4">
                            <Link to="/dashboard" className="bg-white text-blue-900 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition shadow-lg">
                                Go to Dashboard
                            </Link>
                            <Link to="/listings/create" className="bg-blue-700 hover:bg-blue-600 border border-blue-500 text-white font-bold py-3 px-8 rounded-lg transition">
                                Upload Books
                            </Link>
                        </div>
                    </div>
                    {/* Decorative Icon */}
                    <div className="hidden md:block text-9xl opacity-20 transform rotate-12">
                        🏫
                    </div>
                </div>
            </div>
        );
    }

    // 3. PARENT / GUEST VIEW (Standard Buy/Sell/Swap)
    return (
        <div className="bg-green-900 relative overflow-hidden mb-8 rounded-b-[3rem] shadow-2xl">
            {/* Abstract Background */}
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
            </svg>

            <div className="container mx-auto px-6 py-20 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between">
                    <div className="md:w-1/2 text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
                            Smart Way to <br />
                            <span className="text-green-300">Swap Textbooks</span>
                        </h1>
                        <p className="text-lg text-green-100 mb-8 max-w-lg mx-auto md:mx-0">
                            Connect with other parents and schools to buy, sell, or exchange CBC and 8-4-4 textbooks. Save money and reduce waste.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <Link to="/schools" className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg transform hover:-translate-y-1 flex items-center justify-center gap-2">
                                🔍 Find Books
                            </Link>
                            {/* Only show 'Sell' if user is NOT a rider (already handled by checks above, but double safety) */}
                            {(!user || user.user_type !== 'rider') && (
                                <Link to="/listings/create" className="bg-white text-green-900 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    💰 Sell Books
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="md:w-1/2 mt-10 md:mt-0 flex justify-center">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-green-500 rounded-full opacity-30 blur-2xl animate-pulse"></div>
                            <img
                                src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
                                alt="Books"
                                className="relative rounded-2xl shadow-2xl border-4 border-white/20 w-full max-w-md transform -rotate-2 hover:rotate-0 transition duration-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;