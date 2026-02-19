// Form validation utilities

export const validators = {
  // Email validation
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    if (email.length > 150) return 'Email must be less than 150 characters';
    return null;
  },

  // Name validation
  name: (name) => {
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > 100) return 'Name must be less than 100 characters';
    if (!/^[a-zA-Z\s]+$/.test(name)) return 'Name can only contain letters and spaces';
    if (!name.trim()) return 'Name cannot be empty';
    return null;
  },

  // Password validation
  password: (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password.length > 128) return 'Password must be less than 128 characters';
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    // Check for at least one number
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    
    // Check for at least one special character
    if (!/[@$!%*?&]/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    
    return null;
  },

  // Confirm password validation
  confirmPassword: (confirmPassword, password) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== password) return 'Passwords do not match';
    return null;
  },

  // Customer ID validation
  customerId: (customerId) => {
    if (!customerId) return 'Customer ID is required';
    if (!/^\d+$/.test(customerId)) return 'Customer ID must be a number';
    if (parseInt(customerId) <= 0) return 'Customer ID must be a positive number';
    return null;
  },

  // Amount validation
  amount: (amount, balance = null) => {
    if (!amount) return 'Amount is required';
    
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) return 'Please enter a valid amount';
    if (numAmount <= 0) return 'Amount must be greater than 0';
    if (numAmount > 10000) return 'Maximum transfer amount is ₹10,000';
    
    // Check if sufficient balance is available
    if (balance !== null && numAmount > balance) {
      return 'Insufficient balance';
    }
    
    // Check for too many decimal places
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) return 'Amount can have maximum 2 decimal places';
    
    return null;
  },

  // Description validation (optional field)
  description: (description) => {
    if (description && description.length > 255) {
      return 'Description must be less than 255 characters';
    }
    return null;
  },

  // Phone number validation (optional)
  phone: (phone) => {
    if (!phone) return null; // Optional field
    
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
    if (phone.replace(/\D/g, '').length < 10) return 'Phone number must be at least 10 digits';
    if (phone.length > 20) return 'Phone number is too long';
    return null;
  },

  // Required field validation
  required: (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  // Length validation
  length: (value, min, max, fieldName = 'Field') => {
    if (!value) return null;
    
    const length = value.length;
    if (min && length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    if (max && length > max) {
      return `${fieldName} must be less than ${max} characters`;
    }
    return null;
  },

  // Numeric validation
  numeric: (value, fieldName = 'Field') => {
    if (!value) return null;
    if (isNaN(parseFloat(value))) return `${fieldName} must be a number`;
    return null;
  },

  // Positive number validation
  positive: (value, fieldName = 'Field') => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  }
};

// Validate entire form object
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field];
    const value = formData[field];
    
    for (const rule of rules) {
      const error = rule(value, formData);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });
  
  return errors;
};

// Common validation rule sets
export const commonValidationRules = {
  signup: {
    name: [validators.name],
    email: [validators.email],
    password: [validators.password],
    confirmPassword: [
      (value, formData) => validators.confirmPassword(value, formData.password)
    ]
  },
  
  login: {
    email: [validators.email],
    password: [validators.required]
  },
  
  transfer: {
    to_customer_id: [validators.customerId],
    amount: [
      (value, formData) => validators.amount(value, formData.balance)
    ],
    description: [validators.description]
  }
};

// Real-time validation hook (for React components)
export const useFieldValidation = (initialValues = {}) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value, formData = {}) => {
    const error = validators[name] ? validators[name](value, formData) : null;
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const validateForm = (formData, validationRules) => {
    const newErrors = validateForm(formData, validationRules);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const setFieldTouched = (name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  };

  const clearErrors = () => setErrors({});
  
  const clearFieldError = (name) => {
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  return {
    errors,
    touched,
    validateField,
    validateForm,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).some(key => errors[key])
  };
};

export default validators;
