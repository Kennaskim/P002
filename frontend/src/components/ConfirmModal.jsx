import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false }) => {
    if (!isOpen) return null;

    return (
        // 👇 UPDATED: Changed bg-opacity-50 to bg-black/30 backdrop-blur-sm
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[5000] animate-fade-in transition-all">

            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100 animate-scale-in border border-white/20">
                <div className="mb-4">
                    <h3 className={`text-xl font-bold ${isDangerous ? 'text-red-600' : 'text-gray-900'}`}>
                        {title}
                    </h3>
                    <p className="text-gray-500 mt-2">{message}</p>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2 font-bold text-white rounded-lg shadow-lg transition transform active:scale-95 ${isDangerous
                            ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                            : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;