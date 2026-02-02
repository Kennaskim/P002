import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // 1. Show a spinner while we check if the user is logged in
    // (This prevents flashing the login page momentarily on refresh)
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // 2. If not logged in, redirect to Login
    if (!user) {
        // 'state={{ from: location }}' lets us redirect them BACK 
        // to the page they wanted after they successfully login.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. If logged in, render the protected page
    return children;
};

export default ProtectedRoute;