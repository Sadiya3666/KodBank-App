import { apiRequest, handleApiError } from './api';

const bankService = {
  // Get account balance
  getBalance: async () => {
    try {
      const response = await apiRequest.get('/bank/balance');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get full account details (debug view)
  getFullDetails: async () => {
    try {
      const response = await apiRequest.get('/bank/full-details');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Transfer money to another customer
  transferMoney: async (transferData) => {
    try {
      const response = await apiRequest.post('/bank/transfer', transferData);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get transaction history
  getTransactionHistory: async (params = {}) => {
    try {
      const { limit = 10, offset = 0 } = params;
      const response = await apiRequest.get('/bank/transactions', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await apiRequest.get('/user/profile');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await apiRequest.put('/user/profile', profileData);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Verify recipient exists (for transfer validation)
  verifyRecipient: async (customerId) => {
    try {
      const response = await apiRequest.get('/bank/verify-recipient', {
        params: { customer_id: customerId }
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Deposit money (if implemented)
  deposit: async (amount, description = '') => {
    try {
      const response = await apiRequest.post('/bank/deposit', {
        amount,
        description
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Withdraw money (if implemented)
  withdraw: async (amount, description = '') => {
    try {
      const response = await apiRequest.post('/bank/withdraw', {
        amount,
        description
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Search transactions by date range or amount
  searchTransactions: async (searchParams) => {
    try {
      const response = await apiRequest.get('/bank/transactions/search', {
        params: searchParams
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get transaction details by ID
  getTransactionById: async (transactionId) => {
    try {
      const response = await apiRequest.get(`/bank/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Download transaction receipt as PDF
  downloadReceipt: async (transactionId) => {
    try {
      const response = await apiRequest.get(`/bank/transactions/${transactionId}/receipt`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${transactionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
};

export default bankService;
