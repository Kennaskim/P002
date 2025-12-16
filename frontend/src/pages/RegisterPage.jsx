import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        national_id: '',
        phone_number: '',
        password: '',
        user_type: 'parent',
        location: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = await register(formData);

        if (result.success) {
            navigate('/login');
        } else {
            // API might return an object of errors (e.g. {email: ["Invalid email"]})
            setError(result.error);
        }
        setLoading(false);
    };

    // get error message for a specific field
    const getError = (field) => {
        return error && typeof error === 'object' && error[field] ? error[field][0] : null;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Create an account
                    </h2>
                </div>

                {/* Global error message if it's a string */}
                {error && typeof error === 'string' && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <Input
                        label="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        error={getError('username')}
                        required
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={getError('email')}
                        required
                    />
                    <Input
                        label="National ID"
                        type="text"
                        value={formData.national_id}
                        onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                        error={getError('national_id')}
                        required
                    />
                    <Input
                        label="Phone Number"
                        type="tel"
                        placeholder="e.g. 0712345678"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        error={getError('phone_number')}
                        required
                    />

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500"
                            value={formData.user_type}
                            onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                        >
                            <option value="parent">Parent</option>
                            <option value="school">School Administrator</option>
                            <option value="bookshop">Bookshop Owner</option>
                        </select>
                    </div>

                    <Input
                        label="Location (Optional)"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Nyeri Town"
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        error={getError('password')}
                        required
                    />

                    <Button type="submit" loading={loading}>
                        Register
                    </Button>
                </form>

                <div className="text-center text-sm">
                    <p className="text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;