import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const notify = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeNotification(id);
        }, 3000);
    }, []);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[3000] flex flex-col gap-3">
                {notifications.map(({ id, message, type }) => (
                    <div
                        key={id}
                        className={`
                            min-w-[250px] px-4 py-3 rounded-lg shadow-lg text-white font-medium 
                            transform transition-all duration-300 animate-slide-in
                            flex items-center gap-3
                            ${type === 'success' ? 'bg-green-600' : ''}
                            ${type === 'error' ? 'bg-red-600' : ''}
                            ${type === 'info' ? 'bg-blue-600' : ''}
                        `}
                    >
                        <span>{type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
                        {message}
                        <button onClick={() => removeNotification(id)} className="ml-auto opacity-70 hover:opacity-100">✕</button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};