import React from 'react';

const Input = ({ 
  label, 
  error, 
  helperText, 
  required = false, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'input-field';
  const classes = [
    baseClasses,
    error && 'input-error',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-group">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <input className={classes} {...props} />
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
};

export default Input;
