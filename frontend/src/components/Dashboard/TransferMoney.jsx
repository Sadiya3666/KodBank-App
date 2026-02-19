import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../hooks/useBalance';
import { useNotification } from '../../context/NotificationContext';
import bankService from '../../services/bankService';
import './Dashboard.css';

const TransferMoney = ({ onBack }) => {
  const { balance, refreshBalance } = useBalance();
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState({
    to_customer_id: '',
    amount: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [checkingRecipient, setCheckingRecipient] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferDetails, setTransferDetails] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear recipient info when customer ID changes
    if (name === 'to_customer_id') {
      setRecipientInfo(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.to_customer_id) {
      newErrors.to_customer_id = 'Recipient Customer ID is required';
    } else if (!/^\d+$/.test(formData.to_customer_id)) {
      newErrors.to_customer_id = 'Customer ID must be a number';
    } else if (!recipientInfo) {
      newErrors.to_customer_id = 'Please verify the recipient first';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (parseFloat(formData.amount) > 10000) {
      newErrors.amount = 'Maximum transfer amount is ₹10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckRecipient = async () => {
    if (!formData.to_customer_id || !/^\d+$/.test(formData.to_customer_id)) {
      setErrors(prev => ({ ...prev, to_customer_id: 'Enter a valid Customer ID' }));
      return;
    }

    setCheckingRecipient(true);
    setRecipientInfo(null);
    setErrors(prev => ({ ...prev, to_customer_id: '' }));

    try {
      const response = await bankService.verifyRecipient(formData.to_customer_id);
      if (response.success) {
        setRecipientInfo({
          customer_id: response.data.customer_id,
          name: response.data.name,
          exists: true
        });
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, to_customer_id: error.message || 'Recipient not found' }));
      setRecipientInfo(null);
    } finally {
      setCheckingRecipient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      const response = await bankService.transferMoney({
        to_customer_id: parseInt(formData.to_customer_id),
        amount: parseFloat(formData.amount),
        description: formData.description || 'Money transfer'
      });

      setTransferDetails(response.data);
      setTransferSuccess(true);

      // Success Notification
      showNotification('Transfer completed successfully!', 'success');

      // Trigger Confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b']
      });

      // Refresh balance after successful transfer
      await refreshBalance();

      // Reset form
      setFormData({
        to_customer_id: '',
        amount: '',
        description: ''
      });
      setRecipientInfo(null);

    } catch (error) {
      const errorMessage = error.message || 'Transfer failed. Please try again.';
      setErrors({ general: errorMessage });
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (transferSuccess) {
    return (
      <div className="transfer-success">
        <div className="success-animation">🎉</div>
        <h2>Transfer Successful!</h2>
        <div className="transfer-details">
          <p><strong>Transaction ID:</strong> {transferDetails.transaction_id}</p>
          <p><strong>To Customer:</strong> {transferDetails.to_customer_id}</p>
          <p><strong>Amount:</strong> {formatCurrency(transferDetails.amount)}</p>
          <p><strong>New Balance:</strong> {formatCurrency(transferDetails.new_balance)}</p>
          <p><strong>Date:</strong> {new Date(transferDetails.transaction_date).toLocaleString()}</p>
        </div>
        <button onClick={onBack} className="back-to-dashboard">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="transfer-section">
      <div className="section-header">
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <h2>Transfer Money</h2>
      </div>

      <div className="transfer-content">
        <div className="balance-info-card">
          <p>Available Balance:</p>
          <span className="balance-amount">{formatCurrency(balance)}</span>
        </div>

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} className="transfer-form">
          <div className="form-group">
            <label htmlFor="to_customer_id">Recipient Customer ID</label>
            <div className="recipient-input-group">
              <input
                type="text"
                id="to_customer_id"
                name="to_customer_id"
                value={formData.to_customer_id}
                onChange={handleChange}
                onBlur={handleCheckRecipient}
                className={errors.to_customer_id ? 'error' : ''}
                placeholder="Enter customer ID"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleCheckRecipient}
                disabled={!formData.to_customer_id || loading || checkingRecipient}
                className="check-recipient-btn"
              >
                {checkingRecipient ? '...' : 'Check'}
              </button>
            </div>
            {errors.to_customer_id && <span className="error-text">{errors.to_customer_id}</span>}
            {recipientInfo && (
              <div className="recipient-info success">
                <span className="info-icon">👤</span>
                <span className="info-name">{recipientInfo.name}</span>
                <span className="info-status">Verified</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (₹)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={errors.amount ? 'error' : ''}
              placeholder="Enter amount"
              min="1"
              max="10000"
              step="0.01"
              disabled={loading}
            />
            {errors.amount && <span className="error-text">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description for this transfer"
              rows="3"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="transfer-button"
            disabled={loading || !recipientInfo}
          >
            {loading ? 'Processing...' : 'Transfer Money'}
          </button>
        </form>
      </div>

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Confirm Transfer</h3>
            <div className="transfer-summary">
              <p><strong>To:</strong> Customer {formData.to_customer_id}</p>
              <p><strong>Amount:</strong> {formatCurrency(parseFloat(formData.amount))}</p>
              <p><strong>Description:</strong> {formData.description || 'No description'}</p>
              <p className="warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={confirmTransfer}
                className="confirm-button"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferMoney;
