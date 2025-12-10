import React from 'react';

const Input = ({ label, type = "text", error, ...props }) => {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                type={type}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${error ? 'border-red-500' : 'border-gray-300'
                    }`}
                {...props} // Spreads all other props (onChange, value, etc.) here
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};

export default Input;