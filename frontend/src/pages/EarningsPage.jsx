import React, { useState, useEffect } from 'react';
import { getMyEarnings, requestWithdrawal } from '../utils/api';

const EarningsPage = () => {
    const [data, setData] = useState({ balance: 0, history: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMyEarnings()
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching earnings:", err);
                setLoading(false);
                alert("Could not load wallet. Is the server running?");
            });
    }, []);

    const handleWithdraw = () => {
        const amount = prompt("Enter amount to withdraw (KSh):");
        if (amount) {
            requestWithdrawal(amount)
                .then(res => {
                    alert("Withdrawal Successful!");
                    setData(prev => ({
                        ...prev,
                        balance: res.data.new_balance,
                        history: [{
                            id: Date.now(),
                            description: "Withdrawal Request",
                            amount: amount,
                            transaction_type: 'debit',
                            timestamp: new Date().toISOString()
                        }, ...prev.history]
                    }));
                })
                .catch(err => alert(err.response?.data?.error || "Failed"));
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Wallet...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">💰 My Wallet</h1>

            <div className="bg-slate-900 text-white rounded-2xl p-8 mb-8 shadow-xl relative overflow-hidden">
                <p className="text-slate-400 text-sm font-bold uppercase">Available Balance</p>
                <h2 className="text-4xl font-bold mt-2">KSh {Number(data.balance).toLocaleString()}</h2>
                <button
                    onClick={handleWithdraw}
                    className="mt-6 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold transition"
                >
                    Request Withdrawal
                </button>
            </div>

            <h3 className="font-bold text-gray-700 mb-4">Transaction History</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {data.history.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No transactions yet.</div>
                ) : (
                    data.history.map((txn, index) => (
                        <div key={index} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-gray-50">
                            <div>
                                <p className="font-bold text-gray-800">{txn.description}</p>
                                <p className="text-xs text-gray-500">{new Date(txn.timestamp).toLocaleDateString()} {new Date(txn.timestamp).toLocaleTimeString()}</p>
                            </div>
                            <span className={`font-bold ${txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                {txn.transaction_type === 'credit' ? '+' : '-'} KSh {txn.amount}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EarningsPage;