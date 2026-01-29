-- Inventory Management System - Seed Data
-- Initial data for testing and development

-- Insert Default Admin User (password: Admin@123)
INSERT INTO users (username, email, password, full_name, role, phone, is_active) VALUES
('admin', 'admin@inventory.com', '$2a$10$nCX3er8YZECel8u35PdApel78mnox6l0pMv/o5/0lYaaWduzCqHp.', 'System Administrator', 'admin', '+91-9876543210', TRUE),
('staff1', 'staff1@inventory.com', '$2a$10$nCX3er8YZECel8u35PdApel78mnox6l0pMv/o5/0lYaaWduzCqHp.', 'John Staff', 'staff', '+91-9876543211', TRUE),
('staff2', 'staff2@inventory.com', '$2a$10$nCX3er8YZECel8u35PdApel78mnox6l0pMv/o5/0lYaaWduzCqHp.', 'Jane Staff', 'staff', '+91-9876543212', TRUE);

-- Insert Sample Vendors
INSERT INTO vendors (name, contact_person, phone, email, address, city, state, postal_code, gst_number, payment_terms, status) VALUES
('Tech Supplies Co.', 'Rajesh Kumar', '+91-9111222333', 'rajesh@techsupplies.com', '123 Industrial Area', 'Mumbai', 'Maharashtra', '400001', 'GSTIN12345678', 'Net 30', 'active'),
('Global Electronics Ltd.', 'Priya Sharma', '+91-9222333444', 'priya@globalelec.com', '456 Commerce Street', 'Delhi', 'Delhi', '110001', 'GSTIN23456789', 'Net 45', 'active'),
('Office Essentials Pvt Ltd', 'Amit Patel', '+91-9333444555', 'amit@officeess.com', '789 Business Park', 'Bangalore', 'Karnataka', '560001', 'GSTIN34567890', 'Net 15', 'active'),
('Quality Goods Inc.', 'Sneha Verma', '+91-9444555666', 'sneha@qualitygoods.com', '321 Market Road', 'Chennai', 'Tamil Nadu', '600001', 'GSTIN45678901', 'Net 30', 'active'),
('Prime Distributors', 'Vikram Singh', '+91-9555666777', 'vikram@primedist.com', '654 Trade Center', 'Hyderabad', 'Telangana', '500001', 'GSTIN56789012', 'Net 60', 'active');

-- Insert Sample Customers
INSERT INTO customers (name, phone, email, billing_address, city, state, postal_code, gst_number, credit_limit, status) VALUES
('Acme Corporation', '+91-8111222333', 'purchase@acme.com', '100 Corporate Avenue', 'Mumbai', 'Maharashtra', '400002', 'GSTIN98765432', 50000.00, 'active'),
('StarTech Solutions', '+91-8222333444', 'accounts@startech.com', '200 IT Park', 'Pune', 'Maharashtra', '411001', 'GSTIN87654321', 75000.00, 'active'),
('Metro Retail Chain', '+91-8333444555', 'billing@metroretail.com', '300 Mall Road', 'Delhi', 'Delhi', '110002', 'GSTIN76543210', 100000.00, 'active'),
('Sunrise Enterprises', '+91-8444555666', 'info@sunriseent.com', '400 Business Hub', 'Bangalore', 'Karnataka', '560002', 'GSTIN65432109', 30000.00, 'active'),
('Golden Trading Co.', '+91-8555666777', 'orders@goldentrading.com', '500 Commerce Street', 'Chennai', 'Tamil Nadu', '600002', 'GSTIN54321098', 60000.00, 'active'),
('Blue Ocean Ltd.', '+91-8666777888', 'purchase@blueocean.com', '600 Harbor Road', 'Kochi', 'Kerala', '682001', 'GSTIN43210987', 45000.00, 'active'),
('Green Valley Foods', '+91-8777888999', 'accounts@greenvalley.com', '700 Farm Lane', 'Jaipur', 'Rajasthan', '302001', NULL, 25000.00, 'active'),
('Digital Dreams Inc.', '+91-8888999000', 'billing@digitaldreams.com', '800 Tech Street', 'Hyderabad', 'Telangana', '500002', 'GSTIN32109876', 80000.00, 'active');

-- Insert Sample Products
INSERT INTO products (sku, name, description, category, brand, unit, quantity, purchase_price, selling_price, reorder_level, vendor_id, is_active) VALUES
('SKU001', 'Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 'Electronics', 'Logitech', 'piece', 150, 450.00, 699.00, 20, 1, TRUE),
('SKU002', 'Mechanical Keyboard', 'RGB mechanical gaming keyboard', 'Electronics', 'Corsair', 'piece', 75, 2500.00, 3499.00, 10, 1, TRUE),
('SKU003', 'USB-C Hub', '7-in-1 USB-C multiport adapter', 'Electronics', 'Anker', 'piece', 100, 1200.00, 1799.00, 15, 2, TRUE),
('SKU004', 'Monitor Stand', 'Adjustable monitor stand with USB ports', 'Accessories', 'AmazonBasics', 'piece', 50, 800.00, 1299.00, 10, 3, TRUE),
('SKU005', 'Webcam HD', '1080p HD webcam with microphone', 'Electronics', 'Logitech', 'piece', 80, 1800.00, 2599.00, 12, 1, TRUE),
('SKU006', 'Laptop Bag', '15.6 inch laptop backpack', 'Accessories', 'HP', 'piece', 120, 600.00, 999.00, 20, 3, TRUE),
('SKU007', 'HDMI Cable 2m', 'High-speed HDMI 2.1 cable', 'Cables', 'Belkin', 'piece', 200, 150.00, 299.00, 30, 2, TRUE),
('SKU008', 'Power Strip 6-way', 'Surge protected power strip', 'Electrical', 'Belkin', 'piece', 90, 350.00, 599.00, 15, 4, TRUE),
('SKU009', 'Wireless Earbuds', 'TWS earbuds with charging case', 'Electronics', 'JBL', 'piece', 60, 1500.00, 2299.00, 10, 2, TRUE),
('SKU010', 'Desk Lamp LED', 'Adjustable LED desk lamp', 'Lighting', 'Philips', 'piece', 45, 700.00, 1199.00, 8, 4, TRUE),
('SKU011', 'Notebook A4', 'Spiral bound ruled notebook 200 pages', 'Stationery', 'Classmate', 'piece', 500, 35.00, 65.00, 100, 3, TRUE),
('SKU012', 'Pen Set', 'Premium ball pen set of 10', 'Stationery', 'Parker', 'pack', 300, 80.00, 149.00, 50, 3, TRUE),
('SKU013', 'External SSD 500GB', 'Portable SSD USB 3.1', 'Storage', 'Samsung', 'piece', 40, 3500.00, 4999.00, 5, 1, TRUE),
('SKU014', 'Mousepad XL', 'Extended gaming mousepad', 'Accessories', 'SteelSeries', 'piece', 70, 400.00, 699.00, 15, 5, TRUE),
('SKU015', 'USB Flash Drive 64GB', 'USB 3.0 flash drive', 'Storage', 'SanDisk', 'piece', 180, 250.00, 449.00, 25, 2, TRUE);

-- Insert Sample Purchases
INSERT INTO purchases (purchase_number, vendor_id, purchase_date, invoice_number, subtotal, tax_amount, total_amount, payment_status, received_by) VALUES
('PO-2026-001', 1, '2026-01-05', 'VND-INV-1001', 45000.00, 8100.00, 53100.00, 'paid', 1),
('PO-2026-002', 2, '2026-01-10', 'VND-INV-2001', 36000.00, 6480.00, 42480.00, 'paid', 1),
('PO-2026-003', 3, '2026-01-15', 'VND-INV-3001', 17500.00, 3150.00, 20650.00, 'pending', 2),
('PO-2026-004', 4, '2026-01-20', 'VND-INV-4001', 21000.00, 3780.00, 24780.00, 'paid', 1),
('PO-2026-005', 5, '2026-01-25', 'VND-INV-5001', 8000.00, 1440.00, 9440.00, 'pending', 2);

-- Insert Purchase Items
INSERT INTO purchase_items (purchase_id, product_id, quantity, purchase_price, total) VALUES
(1, 1, 50, 450.00, 22500.00),
(1, 2, 10, 2500.00, 25000.00),
(2, 3, 30, 1200.00, 36000.00),
(3, 11, 200, 35.00, 7000.00),
(3, 12, 100, 80.00, 8000.00),
(3, 6, 25, 600.00, 15000.00),
(4, 8, 30, 350.00, 10500.00),
(4, 10, 15, 700.00, 10500.00),
(5, 14, 20, 400.00, 8000.00);

-- Insert Sample Invoices
INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, discount_amount, total_amount, amount_paid, payment_mode, payment_status, created_by) VALUES
('INV-2026-001', 1, '2026-01-08', '2026-02-08', 10497.00, 18.00, 1889.46, 0.00, 12386.46, 12386.46, 'bank_transfer', 'paid', 1),
('INV-2026-002', 2, '2026-01-12', '2026-02-12', 7995.00, 18.00, 1439.10, 500.00, 8934.10, 8934.10, 'upi', 'paid', 1),
('INV-2026-003', 3, '2026-01-18', '2026-02-18', 15093.00, 18.00, 2716.74, 0.00, 17809.74, 10000.00, 'card', 'partial', 2),
('INV-2026-004', 4, '2026-01-22', '2026-02-22', 5096.00, 18.00, 917.28, 200.00, 5813.28, 5813.28, 'cash', 'paid', 1),
('INV-2026-005', 5, '2026-01-28', '2026-02-28', 8995.00, 18.00, 1619.10, 0.00, 10614.10, 0.00, 'credit', 'pending', 2);

-- Insert Invoice Items
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount, total) VALUES
(1, 1, 5, 699.00, 0.00, 3495.00),
(1, 5, 2, 2599.00, 0.00, 5198.00),
(1, 7, 6, 299.00, 0.00, 1794.00),
(2, 2, 2, 3499.00, 0.00, 6998.00),
(2, 6, 1, 999.00, 0.00, 999.00),
(3, 3, 5, 1799.00, 0.00, 8995.00),
(3, 9, 2, 2299.00, 0.00, 4598.00),
(3, 8, 3, 599.00, 0.00, 1797.00),
(4, 4, 2, 1299.00, 0.00, 2598.00),
(4, 11, 20, 65.00, 0.00, 1300.00),
(4, 12, 8, 149.00, 0.00, 1192.00),
(5, 13, 1, 4999.00, 0.00, 4999.00),
(5, 15, 5, 449.00, 0.00, 2245.00),
(5, 14, 2, 699.00, 0.00, 1398.00);

-- Insert Inventory Movements
INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, created_by) VALUES
(1, 'stock_in', 50, 'purchase', 1, 100, 150, 1),
(2, 'stock_in', 10, 'purchase', 1, 65, 75, 1),
(3, 'stock_in', 30, 'purchase', 2, 70, 100, 1),
(1, 'stock_out', 5, 'invoice', 1, 150, 145, 1),
(5, 'stock_out', 2, 'invoice', 1, 82, 80, 1),
(2, 'stock_out', 2, 'invoice', 2, 75, 73, 1),
(3, 'stock_out', 5, 'invoice', 3, 100, 95, 2);

-- Insert System Configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('company_name', 'Inventory Pro Solutions', 'Company name displayed in invoices'),
('company_address', '123 Business Park, Mumbai, Maharashtra - 400001', 'Company address'),
('company_phone', '+91-22-12345678', 'Company phone number'),
('company_email', 'info@inventorypro.com', 'Company email'),
('company_gst', 'GSTIN12345678901', 'Company GST number'),
('tax_rate', '18', 'Default tax rate percentage'),
('currency', 'INR', 'Default currency'),
('currency_symbol', '₹', 'Currency symbol'),
('invoice_prefix', 'INV', 'Invoice number prefix'),
('purchase_prefix', 'PO', 'Purchase order prefix'),
('low_stock_threshold', '10', 'Default low stock alert threshold');
