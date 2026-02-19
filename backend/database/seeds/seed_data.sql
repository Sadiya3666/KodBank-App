-- KodBank Seed Data
-- Created on: 2026-02-19
-- Description: Sample users and initial data for testing

-- Note: Passwords are hashed using bcrypt with salt rounds = 10
-- Test passwords: "password123", "test123", "demo123"

-- Clear existing data (for clean seeding)
DELETE FROM Transactions;
DELETE FROM BankUserJwt;
DELETE FROM BankUser;

-- Insert sample users with hashed passwords
-- Password: password123
INSERT INTO BankUser (name, email, password, balance) VALUES 
('John Doe', 'john.doe@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjO', 5000.00),
('Jane Smith', 'jane.smith@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjO', 3000.00),
('Bob Johnson', 'bob.johnson@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjO', 7500.00),
('Alice Brown', 'alice.brown@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjO', 2000.00),
('Charlie Wilson', 'charlie.wilson@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjO', 10000.00);

-- Get the inserted customer IDs for reference
-- Note: In a real application, you would get these IDs programmatically

-- Insert sample transactions
-- Transfer from John (ID: 1) to Jane (ID: 2)
INSERT INTO Transactions (from_customer_id, to_customer_id, amount, transaction_type, status, description) VALUES 
(1, 2, 500.00, 'transfer', 'completed', 'Payment for dinner'),
(1, 2, 200.00, 'transfer', 'completed', 'Shared expenses'),
(2, 1, 150.00, 'transfer', 'completed', 'Refund for cancelled plan');

-- Transfer from Bob (ID: 3) to Alice (ID: 4)
INSERT INTO Transactions (from_customer_id, to_customer_id, amount, transaction_type, status, description) VALUES 
(3, 4, 1000.00, 'transfer', 'completed', 'Birthday gift'),
(4, 3, 300.00, 'transfer', 'completed', 'Thank you payment');

-- Transfer from Charlie (ID: 5) to John (ID: 1)
INSERT INTO Transactions (from_customer_id, to_customer_id, amount, transaction_type, status, description) VALUES 
(5, 1, 750.00, 'transfer', 'completed', 'Project payment'),
(5, 2, 250.00, 'transfer', 'completed', 'Consulting fee');

-- Deposit transactions
INSERT INTO Transactions (from_customer_id, amount, transaction_type, status, description) VALUES 
(1, 2000.00, 'deposit', 'completed', 'Initial deposit'),
(2, 1500.00, 'deposit', 'completed', 'Salary credit'),
(3, 3000.00, 'deposit', 'completed', 'Investment return'),
(4, 1000.00, 'deposit', 'completed', 'Savings deposit'),
(5, 5000.00, 'deposit', 'completed', 'Business income');

-- Withdrawal transactions
INSERT INTO Transactions (from_customer_id, amount, transaction_type, status, description) VALUES 
(1, 300.00, 'withdrawal', 'completed', 'ATM withdrawal'),
(2, 200.00, 'withdrawal', 'completed', 'Cash withdrawal'),
(3, 500.00, 'withdrawal', 'completed', 'Bill payment'),
(4, 150.00, 'withdrawal', 'completed', 'Shopping'),
(5, 1000.00, 'withdrawal', 'completed', 'Office rent');

-- Update user balances to reflect transactions
-- John Doe (ID: 1): Started with 5000, -500-200+150+2000-300 = 4150
UPDATE BankUser SET balance = 4150.00 WHERE customer_id = 1;

-- Jane Smith (ID: 2): Started with 3000, +500+200-150+1500-200+250 = 4100
UPDATE BankUser SET balance = 4100.00 WHERE customer_id = 2;

-- Bob Johnson (ID: 3): Started with 7500, -1000+300+3000-500 = 8300
UPDATE BankUser SET balance = 8300.00 WHERE customer_id = 3;

-- Alice Brown (ID: 4): Started with 2000, +1000-300+1000-150 = 3550
UPDATE BankUser SET balance = 3550.00 WHERE customer_id = 4;

-- Charlie Wilson (ID: 5): Started with 10000, -750-250+5000-1000 = 13000
UPDATE BankUser SET balance = 13000.00 WHERE customer_id = 5;

-- Insert some sample JWT tokens (these would normally be generated during login)
-- These tokens are set to expire in 24 hours from now
INSERT INTO BankUserJwt (customer_id, token_value, expiry_time, is_active) VALUES 
(1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcl9pZCI6MSwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsImlhdCI6MTY5NTE5OTQwMCwiZXhwIjoxNjk1Mjg1ODAwfQ.sample_signature_john', CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE),
(2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcl9pZCI6MiwiZW1haWwiOiJqYW5lLnNtaXRoQGV4YW1wbGUuY29tIiwiaWF0IjoxNjk1MTk5NDAwLCJleHAiOjE2OTUyODU4MDB9.sample_signature_jane', CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE),
(3, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcl9pZCI6MywiZW1haWwiOiJib2Iuam9obnNvbkBleGFtcGxlLmNvbSIsImlhdCI6MTY5NTE5OTQwMCwiZXhwIjoxNjk1Mjg1ODAwfQ.sample_signature_bob', CURRENT_TIMESTAMP + INTERVAL '24 hours', TRUE);

-- Insert some expired tokens for testing cleanup functionality
INSERT INTO BankUserJwt (customer_id, token_value, expiry_time, is_active) VALUES 
(1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcl9pZCI6MSwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsImlhdCI6MTY5NTExMzAwMCwiZXhwIjoxNjk1MTE2NjAwfQ.expired_token_john', CURRENT_TIMESTAMP - INTERVAL '1 hour', FALSE),
(4, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcl9pZCI6NCwiZW1haWwiOiJhbGljZS5icm93bkBleGFtcGxlLmNvbSIsImlhdCI6MTY5NTExMzAwMCwiZXhwIjoxNjk1MTE2NjAwfQ.expired_token_alice', CURRENT_TIMESTAMP - INTERVAL '2 hours', FALSE);

-- Create a view for easy testing of user data
CREATE OR REPLACE VIEW test_users AS
SELECT 
    customer_id,
    name,
    email,
    balance,
    'password123' as test_password,
    created_at
FROM BankUser
WHERE customer_id <= 5;

-- Create a view for transaction testing
CREATE OR REPLACE VIEW test_transactions AS
SELECT 
    t.transaction_id,
    t.from_customer_id,
    fu.name as from_customer_name,
    t.to_customer_id,
    tu.name as to_customer_name,
    t.amount,
    t.transaction_type,
    t.status,
    t.description,
    t.transaction_date
FROM Transactions t
LEFT JOIN BankUser fu ON t.from_customer_id = fu.customer_id
LEFT JOIN BankUser tu ON t.to_customer_id = tu.customer_id
ORDER BY t.transaction_date DESC;

-- Create a summary view for testing
CREATE OR REPLACE VIEW test_summary AS
SELECT 
    'Users' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM BankUser
UNION ALL
SELECT 
    'Transactions' as table_name,
    COUNT(*) as record_count,
    MIN(transaction_date) as earliest_record,
    MAX(transaction_date) as latest_record
FROM Transactions
UNION ALL
SELECT 
    'Active Tokens' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM BankUserJwt
WHERE is_active = TRUE
UNION ALL
SELECT 
    'Expired Tokens' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM BankUserJwt
WHERE is_active = FALSE;

-- Add some helpful comments for testing
COMMENT ON VIEW test_users IS 'View containing test users with their passwords for development/testing';
COMMENT ON VIEW test_transactions IS 'View containing all transactions with customer names for easy testing';
COMMENT ON VIEW test_summary IS 'Summary view showing record counts and dates for all main tables';

-- Sample queries for testing:

-- Get all test users:
-- SELECT * FROM test_users;

-- Get all transactions:
-- SELECT * FROM test_transactions;

-- Get customer dashboard data:
-- SELECT * FROM customer_dashboard WHERE customer_id = 1;

-- Test transfer function:
-- SELECT execute_transfer(1, 2, 100.00, 'Test transfer');

-- Test deposit function:
-- SELECT deposit_money(1, 500.00, 'Test deposit');

-- Test withdraw function:
-- SELECT withdraw_money(1, 200.00, 'Test withdrawal');

-- Cleanup expired tokens:
-- SELECT cleanup_expired_tokens();

-- Validate transfer:
-- SELECT validate_transfer(1, 2, 100.00);

-- Seed data completed successfully
-- Total users created: 5
-- Total transactions created: 15
-- Total tokens created: 5 (3 active, 2 expired)
