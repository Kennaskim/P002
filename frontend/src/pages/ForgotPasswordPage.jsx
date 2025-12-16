import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset, confirmPasswordReset } from '../utils/api';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1); // 1 = Request, 2 = Confirm
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await requestPasswordReset(email);
            setStep(2); // Move to next step
            alert("Check your backend terminal/console for the reset token!");
        } catch (err) {
            alert("Error: " + (err.response?.data?.email || "User not found"));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await confirmPasswordReset({ token, password });
            alert("Password reset successfully! Please login.");
            navigate('/login');
        } catch (err) {
            alert("Invalid token or password error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {step === 1 ? 'Reset Password' : 'Set New Password'}
                </h2>

                {step === 1 ? (
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Enter your email</label>
                            <input
                                type="email"
                                className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button disabled={loading} className="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700">
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleConfirm} className="space-y-4">
                        <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mb-4">
                            Check your <b>Backend Terminal</b>. Copy the Token labeled <code>key=...</code>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Reset Token</label>
                            <input
                                type="text"
                                className="w-full border p-3 rounded"
                                placeholder="Paste token here"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">New Password</label>
                            <input
                                type="password"
                                className="w-full border p-3 rounded"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button disabled={loading} className="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700">
                            {loading ? 'Resetting...' : 'Change Password'}
                        </button>
                    </form>
                )}

                <div className="mt-4 text-center">
                    <Link to="/login" className="text-green-600 hover:underline">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;