import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SearchBar from './SearchBar';

const Layout = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'text-green-200' : 'text-white hover:text-green-200';
    const cartCount = cart?.items?.length || 0;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <nav className="bg-green-600 text-white shadow-lg sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">

                        <Link to="/" className="text-xl font-bold flex items-center gap-2">
                            📚 <span className="hidden sm:inline">Textbook Exchange</span>
                        </Link>

                        <div className="hidden md:block flex-1 mx-8">
                            <SearchBar />
                        </div>

                        <div className="flex items-center gap-6">
                            {user ? (
                                <>
                                    <Link to="/" className={isActive('/')}>Home</Link>
                                    <Link to="/schools" className={isActive('/schools')}>Schools</Link>
                                    <Link to="/bookshops" className={isActive('/bookshops')}>Bookshops</Link>
                                    <Link to="/listings/create" className={isActive('/listings/create')}>Sell</Link>

                                    <Link to="/cart" className={`relative flex items-center ${isActive('/cart')}`}>
                                        <span>🛒 Cart</span>
                                        {cartCount > 0 && (
                                            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                {cartCount}
                                            </span>
                                        )}
                                    </Link>

                                    <div className="flex items-center gap-3 ml-4 border-l pl-4 border-green-500">
                                        <Link
                                            to="/dashboard"
                                            className="text-sm font-medium hidden sm:block hover:underline flex items-center gap-2"
                                        >
                                            <span>👤</span>
                                            Hi, {user.username}
                                        </Link>

                                        <button
                                            onClick={logout}
                                            className="bg-green-700 hover:bg-green-800 text-xs px-3 py-2 rounded transition"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-x-4">
                                    <Link to="/login" className="hover:underline">Login</Link>
                                    <Link to="/register" className="bg-white text-green-600 px-4 py-2 rounded hover:bg-gray-100 transition">
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:hidden pb-4">
                        <SearchBar />
                    </div>
                </div>
            </nav>

            <main className="flex-grow">
                <Outlet />
            </main>

            <footer className="bg-gray-800 text-white py-6 mt-12">
                <div className="container mx-auto px-4 text-center">
                    <p>&copy; {new Date().getFullYear()} Nyeri Textbook Exchange.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;