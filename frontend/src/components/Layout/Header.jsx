import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './Layout.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-section">
          <h1 className="app-logo">KodBank</h1>
          <span className="app-tagline">Modern Banking Solution</span>
        </div>
        
        {user && (
          <div className="user-section">
            <div className="user-info">
              <span className="welcome-text">Welcome,</span>
              <span className="user-name">{user.name}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
