import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useNotification } from '../context/NotificationContext'; // Optional: Use context here if needed

const Layout = () => {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <footer className="bg-slate-900 text-white py-8 mt-12 border-t border-slate-800">
                <div className="container mx-auto px-4 text-center">
                    <p className="font-medium text-slate-400">
                        &copy; {new Date().getFullYear()} Nyeri Textbook Exchange.
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                        Empowering Education in Nyeri County
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;