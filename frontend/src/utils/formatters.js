// Formatting utilities for display purposes

export const formatters = {
  // Currency formatting for Indian Rupees
  currency: (amount, currency = 'INR') => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      return '₹0.00';
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  },

  // Short currency format (for mobile displays)
  shortCurrency: (amount) => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      return '₹0';
    }

    if (numAmount >= 100000) {
      return `₹${(numAmount / 100000).toFixed(1)}L`;
    } else if (numAmount >= 1000) {
      return `₹${(numAmount / 1000).toFixed(1)}K`;
    } else {
      return `₹${numAmount.toFixed(0)}`;
    }
  },

  // Date formatting
  date: (date, options = {}) => {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };

    return dateObj.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
  },

  // Date and time formatting
  dateTime: (date, options = {}) => {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return dateObj.toLocaleString('en-IN', { ...defaultOptions, ...options });
  },

  // Time formatting
  time: (date, options = {}) => {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };

    return dateObj.toLocaleTimeString('en-IN', { ...defaultOptions, ...options });
  },

  // Relative time formatting (e.g., "2 hours ago")
  relativeTime: (date) => {
    if (!date) return 'Never';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const now = new Date();
    const diff = now - dateObj;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    return `${years} year${years > 1 ? 's' : ''} ago`;
  },

  // Phone number formatting
  phone: (phone) => {
    if (!phone) return 'N/A';
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format for Indian numbers
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{5})(\d{5})/, '$1-$2');
    }
    
    // Format for international numbers
    if (cleaned.length > 10) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2-$3');
    }
    
    return phone;
  },

  // Email masking (for privacy)
  maskEmail: (email) => {
    if (!email) return 'N/A';
    
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    // Show first 2 characters and last character of username
    const maskedUsername = username.length > 3 
      ? username.substring(0, 2) + '*'.repeat(username.length - 3) + username.substring(username.length - 1)
      : username;
    
    return `${maskedUsername}@${domain}`;
  },

  // Customer ID formatting
  customerId: (id) => {
    if (!id) return 'N/A';
    
    const numId = parseInt(id);
    if (isNaN(numId)) return id;
    
    return `#${numId.toString().padStart(6, '0')}`;
  },

  // Transaction ID formatting
  transactionId: (id) => {
    if (!id) return 'N/A';
    
    const numId = parseInt(id);
    if (isNaN(numId)) return id;
    
    return `TXN${numId.toString().padStart(8, '0')}`;
  },

  // Account number formatting (masking for security)
  accountNumber: (accountNumber) => {
    if (!accountNumber) return 'N/A';
    
    const cleaned = accountNumber.replace(/\D/g, '');
    if (cleaned.length < 4) return accountNumber;
    
    // Show last 4 digits only
    return `****${cleaned.slice(-4)}`;
  },

  // Percentage formatting
  percentage: (value, decimals = 1) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return '0%';
    }

    return `${numValue.toFixed(decimals)}%`;
  },

  // Number formatting with commas
  number: (num, decimals = 0) => {
    const parsedNum = parseFloat(num);
    
    if (isNaN(parsedNum)) {
      return '0';
    }

    return new Intl.NumberFormat('en-IN').toFixed(parsedNum, decimals);
  },

  // File size formatting
  fileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Text truncation
  truncate: (text, maxLength = 50, suffix = '...') => {
    if (!text) return '';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - suffix.length) + suffix;
  },

  // Capitalize first letter
  capitalize: (text) => {
    if (!text) return '';
    
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  // Title case
  titleCase: (text) => {
    if (!text) return '';
    
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  // Status formatting
  status: (status) => {
    if (!status) return 'Unknown';
    
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  },

  // Transaction type formatting
  transactionType: (type) => {
    if (!type) return 'Unknown';
    
    const typeMap = {
      'transfer': 'Transfer',
      'deposit': 'Deposit',
      'withdrawal': 'Withdrawal'
    };
    
    return typeMap[type] || formatters.titleCase(type);
  }
};

// Custom hooks for formatting
export const useFormatters = () => {
  return {
    currency: formatters.currency,
    shortCurrency: formatters.shortCurrency,
    date: formatters.date,
    dateTime: formatters.dateTime,
    time: formatters.time,
    relativeTime: formatters.relativeTime,
    phone: formatters.phone,
    maskEmail: formatters.maskEmail,
    customerId: formatters.customerId,
    transactionId: formatters.transactionId,
    accountNumber: formatters.accountNumber,
    percentage: formatters.percentage,
    number: formatters.number,
    fileSize: formatters.fileSize,
    truncate: formatters.truncate,
    capitalize: formatters.capitalize,
    titleCase: formatters.titleCase,
    status: formatters.status,
    transactionType: formatters.transactionType
  };
};

export default formatters;
