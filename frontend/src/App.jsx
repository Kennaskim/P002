import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch every time user switches tabs
      retry: 1, // Retry failed requests once before showing error
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
    },
  },
});

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

const PageLoader = () => (
  <div className="flex justify-center items-center h-screen w-full bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.user_type)) {
    return <Navigate to="/" replace />; // Or to an unauthorized page
  }

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;