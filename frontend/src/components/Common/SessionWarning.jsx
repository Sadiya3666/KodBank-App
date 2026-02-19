import React from 'react';
import { useAuthContext } from '../../context/AuthContext';
import '../Dashboard/Dashboard.css';

const SessionWarning = () => {
    const { showSessionWarning, dismissSessionWarning, logout } = useAuthContext();

    if (!showSessionWarning) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content session-warning">
                <div className="modal-header">
                    <h2>⚠️ Session Timeout Warning</h2>
                </div>
                <div className="modal-body">
                    <p>Your session is about to expire in less than 5 minutes. For your security, you will be logged out automatically.</p>
                    <p>Would you like to stay logged in or logout now?</p>
                </div>
                <div className="modal-footer">
                    <button onClick={logout} className="btn-cancel">
                        Logout Now
                    </button>
                    <button onClick={dismissSessionWarning} className="btn-confirm">
                        Stay Logged In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionWarning;
