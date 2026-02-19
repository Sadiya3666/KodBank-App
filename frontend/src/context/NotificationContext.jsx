import React, { createContext, useContext, useState, useCallback } from 'react';
import './Notification.css';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setNotifications((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="notification-container">
                {notifications.map((n) => (
                    <div key={n.id} className={`notification-toast ${n.type}`} onClick={() => removeNotification(n.id)}>
                        <div className="notification-icon">
                            {n.type === 'success' && '✅'}
                            {n.type === 'error' && '❌'}
                            {n.type === 'info' && 'ℹ️'}
                            {n.type === 'warning' && '⚠️'}
                        </div>
                        <div className="notification-content">
                            {n.message}
                        </div>
                        <button className="notification-close">×</button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
