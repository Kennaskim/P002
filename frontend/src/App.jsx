import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';


const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const CreateListingPage = lazy(() => import('./pages/CreateListingPage'));
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'));
const SchoolsPage = lazy(() => import('./pages/SchoolsPage'));
const SchoolBookListsPage = lazy(() => import('./pages/SchoolBookListsPage'));
const BookshopsPage = lazy(() => import('./pages/BookshopsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const RiderPage = lazy(() => import('./pages/RiderPage'));
const EarningsPage = lazy(() => import('./pages/EarningsPage'));
const PaymentVerifyPage = lazy(() => import('./pages/PaymentVerifyPage'));

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/listings/:id" element={<ListingDetailPage />} />
                  <Route path="/schools" element={<SchoolsPage />} />
                  <Route path="/schools/:schoolId/booklists" element={<SchoolBookListsPage />} />
                  <Route path="/bookshops" element={<BookshopsPage />} />

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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;