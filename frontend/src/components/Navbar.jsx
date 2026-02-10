import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getConversations } from '../utils/api';
import SearchBar from './SearchBar';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Message State
    const [unreadMessages, setUnreadMessages] = useState(0);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // --- POLL FOR MESSAGES ---
    useEffect(() => {
        if (!user) return;

        const checkMessages = async () => {
            try {
                const res = await getConversations();
                setUnreadMessages(res.data.length);
            } catch (err) {
                console.error("Msg check failed", err);
            }
        };

        checkMessages();
        const interval = setInterval(checkMessages, 15000);
        return () => clearInterval(interval);
    }, [user]);

    // --- NAVIGATION LINKS BASED ON ROLE ---
    const getLinks = () => {
        // 1. GUEST (Not Logged In)
        if (!user) return [
            { name: 'Home', path: '/' },
            { name: 'Schools', path: '/schools' },
            { name: 'Login', path: '/login' },
            { name: 'Register', path: '/register' },
        ];

        // 2. LOGGED IN USERS
        switch (user.user_type) {
            case 'rider':
                return [
                    { name: 'Dashboard', path: '/rider' },
                    { name: 'Earnings', path: '/earnings' },
                    { name: 'My Profile', path: '/profile' },
                ];
            case 'school':
                return [
                    { name: 'Home', path: '/' },
                    { name: 'Dashboard', path: '/dashboard' },
                    { name: 'My Booklists', path: `/schools/${user.id}/booklists` },
                    { name: 'School Profile', path: '/profile' },
                ];
            case 'bookshop':
                return [
                    { name: 'Home', path: '/' },
                    { name: 'Dashboard', path: '/dashboard' },
                    { name: 'Inventory', path: '/listings/create' },
                    { name: 'Orders', path: '/orders' },
                ];
            default: // PARENT / STANDARD USER
                return [
                    { name: 'Home', path: '/' },
                    { name: 'Schools', path: '/schools' },
                    { name: 'Bookshops', path: '/bookshops' },
                    { name: 'My Dashboard', path: '/dashboard' },
                    {
                        name: 'Cart',
                        path: '/cart',
                        badge: cart?.items?.length > 0 ? cart.items.length : null
                    },
                    {
                        name: 'Messages',
                        path: '/chat',
                        badge: unreadMessages > 0 ? '•' : null
                    },
                    { name: 'Profile', path: '/profile' },
                ];
        }
    };
    const showSearch = !user || user.user_type === 'parent';

    return (
        <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo: Added flex-shrink-0 to prevent squashing */}
                    <Link to="/" className="text-xl font-extrabold text-green-700 flex items-center gap-2 flex-shrink-0">
                        📚 TextbookExchange
                    </Link>

                    {/* Search Bar: Made flexible with min-w-0 and responsive margins */}
                    {showSearch && (
                        <div className="hidden md:block flex-1 mx-4 lg:mx-8 max-w-2xl min-w-0 transition-all duration-300">
                            <SearchBar />
                        </div>
                    )}

                    {/* Desktop Menu: Added flex-shrink-0 */}
                    <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                        {getLinks().map(link => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className="text-sm font-medium text-gray-600 hover:text-green-600 transition relative group whitespace-nowrap"
                            >
                                {link.name}
                                {/* Badge Logic */}
                                {link.badge && (
                                    <span className={`absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${link.name === 'Messages' ? 'text-lg leading-3 px-1' : ''}`}>
                                        {link.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                        {user && (
                            <button
                                onClick={handleLogout}
                                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition whitespace-nowrap"
                            >
                                Logout
                            </button>
                        )}
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 text-gray-600 rounded-md hover:bg-gray-100 relative"
                    >
                        <span className="text-2xl">☰</span>
                        {(cart?.items?.length > 0 || unreadMessages > 0) && (
                            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100 bg-gray-50 px-4 space-y-2">
                        {showSearch && (
                            <div className="mb-4">
                                <SearchBar />
                            </div>
                        )}
                        {getLinks().map(link => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setIsMenuOpen(false)}
                                className="flex justify-between items-center text-gray-700 py-2 hover:text-green-600 font-medium"
                            >
                                {link.name}
                                {link.badge && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {link.badge === '•' ? 'New' : link.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                        {user && (
                            <button onClick={handleLogout} className="block w-full text-left text-red-600 py-2 font-bold">
                                Logout
                            </button>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;