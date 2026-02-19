import React, { useState, useEffect } from 'react';
import { useBalance } from '../../hooks/useBalance';
import bankService from '../../services/bankService';
import './Dashboard.css';

const CheckBalance = ({ onBack }) => {
  const { balance, refreshBalance, loading: balanceLoading } = useBalance();
  const [isRevealed, setIsRevealed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [fullDetails, setFullDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    // We still fetch full details for the database view, but balance display is controlled
    fetchFullDetails();
  }, []);

  const fetchFullDetails = async () => {
    setLoadingDetails(true);
    try {
      const response = await bankService.getFullDetails();
      if (response.success) {
        setFullDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch full details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRevealBalance = async () => {
    setLoadingDetails(true);
    await refreshBalance();
    setIsRevealed(true);
    setLastUpdated(new Date());
    setLoadingDetails(false);
  };

  const handleRefreshBalance = async () => {
    setShowAnimation(true);
    await refreshBalance();
    await fetchFullDetails();
    setLastUpdated(new Date());
    setTimeout(() => setShowAnimation(false), 500);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="balance-section">
      <div className="section-header">
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <h2>Account Balance</h2>
      </div>

      <div className="balance-content">
        <div className={`balance-card ${showAnimation ? 'animate' : ''}`}>
          <div className="balance-header">
            <h3>Current Balance</h3>
            {isRevealed && (
              <button
                onClick={handleRefreshBalance}
                disabled={balanceLoading || loadingDetails}
                className="refresh-button"
              >
                {balanceLoading ? '🔄' : '🔄'} Refresh
              </button>
            )}
          </div>

          <div className="balance-display-area">
            {isRevealed ? (
              <div className="balance-amount-large">
                {formatCurrency(balance)}
              </div>
            ) : (
              <div className="balance-hidden">
                <div className="masked-balance">₹ ••••.••</div>
                <button
                  className="reveal-button"
                  onClick={handleRevealBalance}
                  disabled={balanceLoading || loadingDetails}
                >
                  {balanceLoading || loadingDetails ? 'Fetching...' : '👁️ View Balance'}
                </button>
              </div>
            )}
          </div>

          {lastUpdated && (
            <div className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          <div className="balance-info">
            <div className="info-item">
              <span className="info-label">Account Status:</span>
              <span className="info-value status-active">Active</span>
            </div>
            <div className="info-item">
              <span className="info-label">Currency:</span>
              <span className="info-value">Indian Rupee (₹)</span>
            </div>
          </div>
        </div>

        {/* Technical Table View (as requested in image) */}
        <div className="technical-view">
          <h3 className="tech-title">🚀 Database View (Live Data)</h3>

          <div className="table-container">
            <h4>BankUser Table</h4>
            <div className="raw-table-wrapper">
              <table className="raw-data-table">
                <thead>
                  <tr>
                    <th>Cid</th>
                    <th>Cname</th>
                    <th>Cpwd</th>
                    <th>Balance</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {fullDetails ? (
                    <tr>
                      <td>{fullDetails.user.customer_id}</td>
                      <td>{fullDetails.user.name}</td>
                      <td><span className="password-mask">{fullDetails.user.password.substring(0, 10)}...</span></td>
                      <td>{fullDetails.user.balance}</td>
                      <td>{fullDetails.user.email}</td>
                    </tr>
                  ) : (
                    <tr><td colSpan="5">Loading user data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-container">
            <h4>BankUserJwt Table</h4>
            <div className="raw-table-wrapper">
              <table className="raw-data-table">
                <thead>
                  <tr>
                    <th>TokenId</th>
                    <th>TokenValue</th>
                    <th>Cid</th>
                    <th>Exp</th>
                  </tr>
                </thead>
                <tbody>
                  {fullDetails ? (
                    <tr>
                      <td>{fullDetails.token.token_id}</td>
                      <td className="token-cell" title={fullDetails.token.token_value}>
                        {fullDetails.token.token_value.substring(0, 15)}...
                      </td>
                      <td>{fullDetails.token.customer_id}</td>
                      <td>{new Date(fullDetails.token.expiry_time).toLocaleTimeString()}</td>
                    </tr>
                  ) : (
                    <tr><td colSpan="4">Loading token data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="balance-tips">
          <h4>💡 Banking Tips</h4>
          <ul>
            <li>Your balance is updated in real-time after every transaction</li>
            <li>The <b>BankUser</b> table stores your core sensitive account information.</li>
            <li>The <b>BankUserJwt</b> table manages your secure session tokens.</li>
            <li>Passwords are always stored encrypted (hashed) for your security.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CheckBalance;
