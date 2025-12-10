import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSchools } from '../utils/api';

const SchoolsPage = () => {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSchools()
            .then(res => setSchools(res.data.results || res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center">Loading schools...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Registered Schools</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schools.map(school => (
                    <div key={school.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                        <h2 className="text-xl font-semibold text-gray-800">{school.school_name}</h2>
                        <p className="text-gray-600 mt-2">📍 {school.address}</p>
                        <Link
                            to={`/schools/${school.id}/booklists`}
                            className="mt-4 inline-block text-green-600 font-medium hover:underline"
                        >
                            View Book Lists →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SchoolsPage;