# Inventory Management & Billing System

A complete full-stack Inventory Management and Billing System built with React, Node.js, Express, and MySQL.

## 🚀 Features

### Core Features
- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin/Staff)
- **Dashboard**: Real-time statistics, sales/purchase charts, low stock alerts, and recent transactions
- **Product Management**: Full CRUD operations with image upload, categories, and stock tracking
- **Vendor Management**: Manage suppliers with contact details, bank info, and purchase history
- **Customer Management**: Track customers with credit limits and transaction history
- **Purchase Orders**: Create purchase orders, track deliveries, and manage vendor payments
- **Invoices/Sales**: Generate invoices with multi-item support, discounts, taxes, and PDF export
- **Reports**: Sales, purchases, profit/loss, and stock reports with CSV export
- **Settings**: System configuration for company details, billing, and invoice settings

### Technical Highlights
- Clean, scalable architecture following best practices
- Responsive UI with Tailwind CSS
- Real-time stock tracking with automatic inventory updates
- PDF generation for invoices and purchase orders
- Comprehensive audit logging
- Search, filter, and pagination on all list views

## 📋 Prerequisites

- Node.js v18+
- MySQL 8.0+
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Inventory-Management-System
```

### 2. Set up the database

```bash
# Login to MySQL
mysql -u root -p

# Create database and run schema
source database/schema.sql;

# (Optional) Load sample data
source database/seed.sql;
```

### 3. Configure Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=inventory_management

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

### 4. Configure Frontend

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Start the application

```bash
# Terminal 1 - Start Backend
cd backend
npm run dev

# Terminal 2 - Start Frontend
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## 🔐 Default Login Credentials

```
Admin User:
  Username: admin
  Password: Admin@123

Staff User:
  Username: staff
  Password: Staff@123
```

## 📁 Project Structure

```
Inventory-Management-System/
├── backend/
│   ├── config/
│   │   └── database.js         # MySQL connection pool
│   ├── controllers/            # Route handlers
│   │   ├── auth.controller.js
│   │   ├── customer.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── inventory.controller.js
│   │   ├── invoice.controller.js
│   │   ├── product.controller.js
│   │   ├── purchase.controller.js
│   │   ├── report.controller.js
│   │   ├── settings.controller.js
│   │   ├── user.controller.js
│   │   └── vendor.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js  # JWT verification & role check
│   │   └── upload.middleware.js # Multer file upload
│   ├── routes/                 # API routes
│   ├── utils/
│   │   ├── auditLog.js        # Audit logging utility
│   │   └── pdfGenerator.js    # PDF generation for invoices/POs
│   ├── uploads/               # Uploaded files (auto-created)
│   ├── server.js              # Express app entry point
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ConfirmDialog.js
│   │   │   ├── Layout.js
│   │   │   ├── Loading.js
│   │   │   ├── Modal.js
│   │   │   ├── Pagination.js
│   │   │   └── PrivateRoute.js
│   │   ├── context/
│   │   │   └── AuthContext.js # Authentication state
│   │   ├── pages/             # Page components
│   │   │   ├── CustomerForm.js
│   │   │   ├── Customers.js
│   │   │   ├── Dashboard.js
│   │   │   ├── InvoiceForm.js
│   │   │   ├── Invoices.js
│   │   │   ├── InvoiceView.js
│   │   │   ├── Login.js
│   │   │   ├── ProductForm.js
│   │   │   ├── Products.js
│   │   │   ├── PurchaseForm.js
│   │   │   ├── Purchases.js
│   │   │   ├── PurchaseView.js
│   │   │   ├── Reports.js
│   │   │   ├── Settings.js
│   │   │   ├── UserForm.js
│   │   │   ├── Users.js
│   │   │   ├── VendorForm.js
│   │   │   └── Vendors.js
│   │   ├── services/
│   │   │   └── api.js         # Axios API service
│   │   ├── App.js             # Main app with routes
│   │   ├── index.css          # Tailwind CSS
│   │   └── index.js           # React entry point
│   └── package.json
├── database/
│   ├── schema.sql             # Database schema
│   └── seed.sql               # Sample data
└── README.md
```

## 🗃️ Database Schema

The system uses 11 tables:

- **users**: System users with roles (admin/staff)
- **vendors**: Supplier information with bank details
- **customers**: Customer information with credit limits
- **products**: Product catalog with pricing and stock
- **purchases**: Purchase order headers
- **purchase_items**: Purchase order line items
- **invoices**: Sales invoice headers
- **invoice_items**: Sales invoice line items
- **inventory_movements**: Stock in/out audit trail
- **audit_logs**: System-wide audit logging
- **system_config**: Application settings

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Dashboard
- `GET /api/dashboard/stats` - Overview statistics
- `GET /api/dashboard/low-stock-alerts` - Low stock products
- `GET /api/dashboard/recent-transactions` - Recent sales/purchases
- `GET /api/dashboard/chart-data` - Sales/purchase chart data

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Vendors
- `GET /api/vendors` - List vendors
- `GET /api/vendors/:id` - Get vendor details
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Purchases
- `GET /api/purchases` - List purchases
- `GET /api/purchases/:id` - Get purchase details
- `POST /api/purchases` - Create purchase order
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase
- `GET /api/purchases/:id/pdf` - Download PDF

### Invoices
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/:id/pdf` - Download PDF

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/purchases` - Purchases report
- `GET /api/reports/profit-loss` - Profit/Loss report
- `GET /api/reports/stock` - Stock report

### Users (Admin only)
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Settings (Admin only)
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd backend
NODE_ENV=production npm start
```

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=5000
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=inventory_management
JWT_SECRET=your-production-secret-key
FRONTEND_URL=https://your-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

Built with ❤️ for DBMS Project
