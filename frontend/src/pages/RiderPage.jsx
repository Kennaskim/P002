import React, { useState, useEffect } from 'react';
import { getAvailableDeliveries, acceptDeliveryJob, completeDeliveryJob } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const RiderPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = () => {
        getAvailableDeliveries()
            .then(res => {
                setJobs(res.data.results || res.data);
                setLoading(false);
            })
            .catch(err => alert("Failed to load jobs"));
    };

    const handleAccept = async (id) => {
        if (window.confirm("Accept this delivery job?")) {
            try {
                console.log(`Attempting to accept job ID: ${id}`); // Debug Log

                await acceptDeliveryJob(id);

                alert("Job Accepted! You are now the rider.");
                loadJobs(); // Refresh list
            } catch (error) {
                console.error("Accept Job Error:", error); // See full error in Console (F12)

                // Show the specific error message to the user
                if (error.response) {
                    alert(`Error: ${error.response.status} - ${error.response.statusText}\n${JSON.stringify(error.response.data)}`);
                } else {
                    alert(`Network Error: ${error.message}`);
                }
            }
        }
    };

    const handleComplete = async (id) => {
        if (window.confirm("Confirm package delivered?")) {
            await completeDeliveryJob(id);
            alert("Great work! Delivery marked as complete.");
            loadJobs();
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Available Jobs...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2">🏍️ Rider Dashboard</h1>
            <p className="text-gray-600 mb-8">View and manage active deliveries.</p>

            <div className="grid gap-6">
                {jobs.length === 0 ? (
                    <p className="text-gray-500">No active jobs right now.</p>
                ) : (
                    jobs.map(job => (
                        <div key={job.id} className={`bg-white p-6 rounded shadow border-l-4 ${job.status === 'paid' ? 'border-green-500' : 'border-blue-500'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-lg">#{job.tracking_code || 'PENDING'}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${job.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            job.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                                            }`}>
                                            {job.status === 'paid' ? 'Ready for Pickup' : 'In Transit'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                                        <div>
                                            <p className="text-gray-500 font-bold">📍 From (Seller):</p>
                                            <p>{job.seller_location || job.pickup_location}</p>
                                            {job.status === 'shipped' && <p className="text-blue-600">📞 {job.seller_phone}</p>}
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-bold">🏁 To (Buyer):</p>
                                            <p>{job.dropoff_location}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 font-bold text-gray-700">
                                        Earn: KSh {job.transport_cost}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {job.status === 'paid' && (
                                        <button
                                            onClick={() => handleAccept(job.id)}
                                            className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700"
                                        >
                                            Accept Job
                                        </button>
                                    )}

                                    {job.status === 'shipped' && (
                                        <>
                                            <button
                                                onClick={() => navigate(`/tracking/${job.id}`)}
                                                className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
                                            >
                                                View Map
                                            </button>
                                            <button
                                                onClick={() => handleComplete(job.id)}
                                                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
                                            >
                                                Mark Delivered
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RiderPage;