-- Migration V2: Purchase Order Workflow, Payment Tracking & Invoice Enhancements
-- Date: February 2026

-- 1. Add new columns to purchases table
ALTER TABLE purchases 
  ADD COLUMN payment_due_date DATE AFTER purchase_date,
  ADD COLUMN order_status ENUM('draft', 'ordered', 'partially_received', 'received', 'cancelled') DEFAULT 'ordered' AFTER payment_status,
  ADD COLUMN amount_paid DECIMAL(12, 2) DEFAULT 0 AFTER total_amount;

-- Set payment_due_date for existing records (30 days from purchase_date)
UPDATE purchases SET payment_due_date = DATE_ADD(purchase_date, INTERVAL 30 DAY) WHERE payment_due_date IS NULL;

-- Set order_status based on existing payment_status for backward compatibility
UPDATE purchases SET order_status = 'received' WHERE payment_status = 'paid';

-- 2. Create purchase_payments table
CREATE TABLE IF NOT EXISTS purchase_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_mode ENUM('cash', 'bank', 'upi', 'cheque') NOT NULL DEFAULT 'cash',
    reference_no VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_mode ENUM('cash', 'bank', 'upi', 'cheque') NOT NULL DEFAULT 'cash',
    reference_no VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Add indexes for performance
CREATE INDEX idx_purchase_payments_purchase ON purchase_payments(purchase_id);
CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_purchases_due_date ON purchases(payment_due_date);
CREATE INDEX idx_purchases_order_status ON purchases(order_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
