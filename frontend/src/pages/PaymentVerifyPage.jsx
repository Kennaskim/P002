import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPaystackPayment } from '../utils/api';
import Layout from '../components/Layout';

const PaymentVerifyPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const reference = searchParams.get('reference');

    useEffect(() => {
        const verify = async () => {
            if (!reference) {
                setStatus('error');
                return;
            }

            try {
                await verifyPaystackPayment(reference);
                setStatus('success');

                // Redirect to dashboard after 3 seconds
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);

            } catch (error) {
                console.error("Verification failed", error);
                setStatus('error');
            }
        };

        verify();
    }, [reference, navigate]);

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">

                {status === 'verifying' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-6"></div>
                        <h2 className="text-2xl font-bold text-gray-800">Verifying Payment...</h2>
                        <p className="text-gray-600 mt-2">Please wait while we confirm your transaction.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">✅</span>
                        </div>
                        <h2 className="text-2xl font-bold text-green-700">Payment Successful!</h2>
                        <p className="text-gray-600 mt-2">Redirecting you to your dashboard...</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mt-6 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                        >
                            Go to Dashboard
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">❌</span>
                        </div>
                        <h2 className="text-2xl font-bold text-red-700">Verification Failed</h2>
                        <p className="text-gray-600 mt-2">We couldn't confirm the payment. Please contact support if you were debited.</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mt-6 px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                        >
                            Return to Dashboard
                        </button>
                    </>
                )}

            </div>
        </Layout>
    );
};

export default PaymentVerifyPage;