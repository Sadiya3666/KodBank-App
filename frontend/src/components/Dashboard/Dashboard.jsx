import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
// import { useBalance } from '../../hooks/useBalance'; // Removed unused import
import CheckBalance from './CheckBalance';
import TransferMoney from './TransferMoney';
import DepositMoney from './DepositMoney';
import TransactionHistory from './TransactionHistory';
import './Dashboard.css';

import LogoutConfirm from '../Common/LogoutConfirm';
import SessionWarning from '../Common/SessionWarning';

const Dashboard = () => {
  const { user, logout } = useAuth();
  // const { balance } = useBalance(); // Unused variable removed to fix lint error
  const [activeSection, setActiveSection] = useState('overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Unused formatCurrency function removed

  return (
    <div className="dashboard-container">
      <SessionWarning />
      <LogoutConfirm
        isOpen={showLogoutConfirm}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="logo">KodBank</h1>
          </div>

          <div className="user-section">
            <div className="welcome-message">
              <span>Welcome, </span>
              <span className="user-name">{user?.name}</span>
            </div>

            <div className="user-info-brief">
              <span className="user-id">ID: {user?.customer_id}</span>
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-content">
          <button
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            🏠 Overview
          </button>
          <button
            className={`nav-item ${activeSection === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveSection('balance')}
          >
            💰 Check Balance
          </button>
          <button
            className={`nav-item ${activeSection === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveSection('transfer')}
          >
            💸 Transfer Money
          </button>
          <button
            className={`nav-item ${activeSection === 'deposit' ? 'active' : ''}`}
            onClick={() => setActiveSection('deposit')}
          >
            📥 Add Balance
          </button>
          <button
            className={`nav-item ${activeSection === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSection('history')}
          >
            📊 Transaction History
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="main-content">
          {activeSection === 'overview' && (
            <div className="overview-section">
              <h2>Account Overview</h2>

              {/* Quick Actions Card */}
              <div className="quick-actions-card">
                <div className="actions-header">
                  <h3>Quick Actions</h3>
                  <p>Common banking operations</p>
                </div>
                <div className="actions-grid">
                  <button onClick={() => setActiveSection('balance')} className="action-btn">
                    <span className="icon">💰</span> Check Balance
                  </button>
                  <button onClick={() => setActiveSection('transfer')} className="action-btn">
                    <span className="icon">💸</span> Send Money
                  </button>
                  <button onClick={() => setActiveSection('deposit')} className="action-btn">
                    <span className="icon">📥</span> Add Funds
                  </button>
                </div>
              </div>

              <div className="cards-grid">
                <div
                  className="bank-card balance-card"
                  onClick={() => setActiveSection('balance')}
                >
                  <div className="card-icon">💰</div>
                  <h3>Check Balance</h3>
                  <p>View your current account balance</p>
                  <button className="card-button">
                    Check Balance
                  </button>
                </div>

                <div
                  className="bank-card transfer-card"
                  onClick={() => setActiveSection('transfer')}
                >
                  <div className="card-icon">💸</div>
                  <h3>Transfer Money</h3>
                  <p>Send money to other customers</p>
                  <button className="card-button">
                    Transfer Money
                  </button>
                </div>

                <div
                  className="bank-card deposit-card"
                  onClick={() => setActiveSection('deposit')}
                >
                  <div className="card-icon">📥</div>
                  <h3>Add Balance</h3>
                  <p>Top up your account instantly</p>
                  <button className="card-button">
                    Add Balance
                  </button>
                </div>

                <div
                  className="bank-card history-card"
                  onClick={() => setActiveSection('history')}
                >
                  <div className="card-icon">📊</div>
                  <h3>Transaction History</h3>
                  <p>View your recent transactions</p>
                  <button className="card-button">
                    View History
                  </button>
                </div>

                <div className="bank-card profile-card">
                  <div className="card-icon">👤</div>
                  <h3>Account Details</h3>
                  <div className="account-info">
                    <p><strong>Customer ID:</strong> {user?.customer_id}</p>
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Member Since:</strong> {new Date(user?.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="recent-transactions">
                <h3>Recent Transactions</h3>
                <TransactionHistory limit={5} showViewAll={true} />
              </div>
            </div>
          )}

          {activeSection === 'balance' && (
            <CheckBalance onBack={() => setActiveSection('overview')} />
          )}

          {activeSection === 'transfer' && (
            <TransferMoney onBack={() => setActiveSection('overview')} />
          )}

          {activeSection === 'deposit' && (
            <DepositMoney onBack={() => setActiveSection('overview')} />
          )}

          {activeSection === 'history' && (
            <TransactionHistory onBack={() => setActiveSection('overview')} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
