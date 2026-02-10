import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';


import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CreateListingPage from './pages/CreateListingPage';
import ListingDetailPage from './pages/ListingDetailPage';
import SchoolsPage from './pages/SchoolsPage';
import SchoolBookListsPage from './pages/SchoolBookListsPage';
import BookshopsPage from './pages/BookshopsPage';
import ChatPage from './pages/ChatPage';
import CartPage from './pages/CartPage';
import TrackingPage from './pages/TrackingPage';
import RiderPage from './pages/RiderPage';
import EarningsPage from './pages/EarningsPage';
import PaymentVerifyPage from './pages/PaymentVerifyPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              <Route element={<Layout />}>
                {/* --- PUBLIC ROUTES (Accessible by anyone) --- */}
                <Route path="/" element={<HomePage />} />
                <Route path="/listings/:id" element={<ListingDetailPage />} />
                <Route path="/schools" element={<SchoolsPage />} />
                <Route path="/schools/:schoolId/booklists" element={<SchoolBookListsPage />} />
                <Route path="/bookshops" element={<BookshopsPage />} />

                {/* --- PRIVATE ROUTES (Must be logged in) --- */}
                <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/listings/create" element={<PrivateRoute><CreateListingPage /></PrivateRoute>} />
                <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                <Route path="/chat/:conversationId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                <Route path="/cart" element={<PrivateRoute><CartPage /></PrivateRoute>} />
                <Route path="/rider" element={<PrivateRoute><RiderPage /></PrivateRoute>} />
                <Route path="/earnings" element={<PrivateRoute><EarningsPage /></PrivateRoute>} />
                <Route path="/tracking/:id" element={<TrackingPage />} />
                <Route path="/payment/verify" element={<ProtectedRoute><PaymentVerifyPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;