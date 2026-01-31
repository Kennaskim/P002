// frontend/src/pages/EarningsPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const EarningsPage = () => {
    const [data, setData] = useState({ balance: 0, history: [] });

    useEffect(() => {
        api.get('rider/earnings/').then(res => setData(res.data));
    }, []);

    const handleWithdraw = () => {
        const amount = prompt("Enter amount to withdraw:");
        if (amount) {
            api.post('rider/withdraw/', { amount }).then(() => alert("Request Sent!"));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-2xl font-bold mb-6">💰 My Wallet</h1>

            {/* Balance Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-8 mb-8 shadow-xl relative overflow-hidden">
                <p className="text-slate-400 text-sm font-bold uppercase">Available Balance</p>
                <h2 className="text-4xl font-bold mt-2">KSh {data.balance.toLocaleString()}</h2>
                <button
                    onClick={handleWithdraw}
                    className="mt-6 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold transition"
                >
                    Request Withdrawal
                </button>
                <div className="absolute right-[-20px] bottom-[-20px] text-9xl opacity-10">💵</div>
            </div>

            {/* History */}
            <h3 className="font-bold text-gray-700 mb-4">Recent Earnings</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {data.history.map(job => (
                    <div key={job.id} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-gray-50">
                        <div>
                            <p className="font-bold text-gray-800">Delivery #{job.tracking_code}</p>
                            <p className="text-xs text-gray-500">{new Date(job.delivered_at).toLocaleDateString()}</p>
                        </div>
                        <span className="text-green-600 font-bold">+ KSh {job.transport_cost}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EarningsPage;