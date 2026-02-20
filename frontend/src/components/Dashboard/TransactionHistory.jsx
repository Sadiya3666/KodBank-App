import React, { useState, useEffect } from 'react';
import bankService from '../../services/bankService';
import './Dashboard.css';

const TransactionHistory = ({ onBack, limit = null, showViewAll = false }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: limit || 10,
    total: 0
  });

  // const [isSearching, setIsSearching] = useState(false); // Unused state removed to fix lint error
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransactions = async (offset = 0, search = '') => {
    try {
      setLoading(true);
      let response;
      if (search) {
        // setIsSearching(true); // Removed usage of unused state
        response = await bankService.searchTransactions({ q: search, limit: pagination.limit, offset });
      } else {
        response = await bankService.getTransactionHistory({
          limit: pagination.limit,
          offset
        });
      }

      setTransactions(response.data.transactions);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || response.data.count || response.data.transactions.length,
        offset
      }));
      setError(null);
    } catch (error) {
      setError(error.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
      // setIsSearching(false); // Removed usage of unused state
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Debounce search
    if (window.searchTimeout) clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      fetchTransactions(0, value);
    }, 500);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchTransactions();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'transfer':
        return '💸';
      case 'deposit':
        return '⬇️';
      case 'withdrawal':
        return '⬆️';
      default:
        return '🔄';
    }
  };

  const getTransactionColor = (type, fromCustomerId, currentUserId) => {
    if (type === 'deposit') return 'success';
    if (type === 'withdrawal') return 'warning';
    if (type === 'transfer') {
      return fromCustomerId === currentUserId ? 'danger' : 'success';
    }
    return 'primary';
  };

  const handlePageChange = (newOffset) => {
    fetchTransactions(newOffset, searchTerm);
  };

  const handleExportCSV = () => {
    // CSV export functionality
    const csvContent = [
      ['Date', 'Type', 'Amount', 'Description', 'Status'],
      ...transactions.map(t => [
        formatDate(t.transaction_date),
        t.transaction_type,
        formatCurrency(t.amount),
        t.description || 'N/A',
        t.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🔄</div>
        <p>Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">❌</div>
        <p>{error}</p>
        <button onClick={() => fetchTransactions()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      {onBack && (
        <div className="section-header">
          <button onClick={onBack} className="back-button">
            ← Back to Dashboard
          </button>
          <h2>Transaction History</h2>
        </div>
      )}

      <div className="history-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by amount, date or description..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          {searchTerm && <button onClick={() => { setSearchTerm(''); fetchTransactions(0, ''); }} className="clear-search">×</button>}
        </div>
        <div className="history-actions">
          <button onClick={handleExportCSV} className="export-button">
            📥 Export CSV
          </button>
          {!limit && (
            <button onClick={() => fetchTransactions(pagination.offset, searchTerm)} className="refresh-button">
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      <div className="history-info">
        <span>Showing {transactions.length} of {pagination.total} transactions</span>
      </div>

      <div className="transactions-list">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Transactions Found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.transaction_id} className="transaction-item">
              <div className="transaction-icon">
                {getTransactionIcon(transaction.transaction_type)}
              </div>

              <div className="transaction-details">
                <div className="transaction-header">
                  <span className="transaction-type">
                    {transaction.transaction_type.charAt(0).toUpperCase() +
                      transaction.transaction_type.slice(1)}
                  </span>
                  <span className={`transaction-amount ${getTransactionColor(
                    transaction.transaction_type,
                    transaction.from_customer_id,
                    // This would come from auth context in real implementation
                    1
                  )}`}>
                    {transaction.from_customer_id === 1 ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>

                <div className="transaction-info">
                  <span className="transaction-date">
                    {formatDate(transaction.transaction_date)}
                  </span>
                  {transaction.description && (
                    <span className="transaction-description">
                      {transaction.description}
                    </span>
                  )}
                </div>

                {transaction.transaction_type === 'transfer' && (
                  <div className="transfer-info">
                    {transaction.from_customer_id === 1 ? (
                      <span>To: Customer {transaction.to_customer_id}</span>
                    ) : (
                      <span>From: Customer {transaction.from_customer_id}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="transaction-status">
                <span className={`status-badge ${transaction.status}`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {!limit && pagination.total > pagination.limit && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
            disabled={pagination.offset === 0 || loading}
            className="pagination-button"
          >
            ← Previous
          </button>

          <span className="page-info">
            Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(pagination.total / pagination.limit)}
          </span>

          <button
            onClick={() => handlePageChange(pagination.offset + pagination.limit)}
            disabled={pagination.offset + pagination.limit >= pagination.total || loading}
            className="pagination-button"
          >
            Next →
          </button>
        </div>
      )}

      {showViewAll && (
        <div className="view-all-container">
          <button onClick={onBack} className="view-all-button">
            View All Transactions
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
