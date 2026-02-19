import React from 'react';
import '../Dashboard/Dashboard.css';

const LogoutConfirm = ({ isOpen, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Confirm Logout</h2>
                </div>
                <div className="modal-body">
                    <p>Are you sure you want to end your current session? You will need to log in again to access your account.</p>
                </div>
                <div className="modal-footer">
                    <button onClick={onCancel} className="btn-cancel">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="btn-danger">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirm;
