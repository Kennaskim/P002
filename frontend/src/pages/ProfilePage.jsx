import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFullProfile, updateMyProfile } from '../utils/api';

const ProfilePage = () => {
    const { user: authUser } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone_number: '',
        location: '',
        national_id: '',
        school_name: '',
        shop_name: '',
        address: '',
        opening_hours: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await getFullProfile();
            const data = res.data;

            setFormData({
                username: data.username || '',
                email: data.email || '',
                phone_number: data.phone_number || '',
                location: data.location || '',
                national_id: data.national_id || '',
                school_name: data.profile?.school_name || '',
                shop_name: data.profile?.shop_name || '',
                address: data.profile?.address || '',
                opening_hours: data.profile?.opening_hours || ''
            });
            setLoading(false);
        } catch (err) {
            console.error("Failed to load profile");
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            await updateMyProfile(formData);
            setMessage({ type: 'success', text: '✅ Profile Updated Successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Failed to update. Check your inputs.' });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Profile...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-lg border-t-4 border-green-600">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Edit Profile</h1>

                {message && (
                    <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">Username</label>
                            <input value={formData.username} disabled className="w-full bg-gray-100 border p-2 rounded cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">Email</label>
                            <input value={formData.email} disabled className="w-full bg-gray-100 border p-2 rounded cursor-not-allowed" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Phone Number (M-Pesa)</label>
                        <input
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            placeholder="0712 345 678"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Required for Meetups & Deliveries.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Default Location</label>
                        <input
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. Nyeri Town, Skuta"
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">National ID (Optional)</label>
                        <input
                            name="national_id"
                            value={formData.national_id}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    {authUser?.user_type === 'school' && (
                        <div className="bg-blue-50 p-4 rounded border border-blue-200">
                            <h3 className="font-bold text-blue-800 mb-2">School Details</h3>
                            <div className="space-y-3">
                                <input name="school_name" value={formData.school_name} onChange={handleChange} placeholder="School Name" className="w-full border p-2 rounded" />
                                <input name="address" value={formData.address} onChange={handleChange} placeholder="Physical Address" className="w-full border p-2 rounded" />
                            </div>
                        </div>
                    )}

                    {authUser?.user_type === 'bookshop' && (
                        <div className="bg-purple-50 p-4 rounded border border-purple-200">
                            <h3 className="font-bold text-purple-800 mb-2">Shop Details</h3>
                            <div className="space-y-3">
                                <input name="shop_name" value={formData.shop_name} onChange={handleChange} placeholder="Shop Name" className="w-full border p-2 rounded" />
                                <input name="address" value={formData.address} onChange={handleChange} placeholder="Physical Address" className="w-full border p-2 rounded" />
                                <input name="opening_hours" value={formData.opening_hours} onChange={handleChange} placeholder="Opening Hours (e.g. 8am - 6pm)" className="w-full border p-2 rounded" />
                            </div>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;