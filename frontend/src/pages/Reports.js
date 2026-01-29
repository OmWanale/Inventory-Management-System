import React, { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import {
  DocumentArrowDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyRupeeIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [activeTab, dateRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let response;
      switch (activeTab) {
        case 'sales':
          response = await reportAPI.getSales(dateRange);
          break;
        case 'purchases':
          response = await reportAPI.getPurchases(dateRange);
          break;
        case 'profit':
          response = await reportAPI.getProfitLoss(dateRange);
          break;
        case 'stock':
          response = await reportAPI.getStock();
          break;
        default:
          response = await reportAPI.getSales(dateRange);
      }
      setReportData(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      let response;
      switch (activeTab) {
        case 'sales':
          response = await reportAPI.exportSales(dateRange);
          break;
        case 'purchases':
          response = await reportAPI.exportPurchases(dateRange);
          break;
        case 'profit':
          response = await reportAPI.exportProfitLoss(dateRange);
          break;
        case 'stock':
          response = await reportAPI.exportStock();
          break;
        default:
          response = await reportAPI.exportSales(dateRange);
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const tabs = [
    { id: 'sales', name: 'Sales Report', icon: ArrowTrendingUpIcon },
    { id: 'purchases', name: 'Purchases Report', icon: ArrowTrendingDownIcon },
    { id: 'profit', name: 'Profit & Loss', icon: CurrencyRupeeIcon },
    { id: 'stock', name: 'Stock Report', icon: CubeIcon },
  ];

  const renderSalesReport = () => {
    if (!reportData) return null;
    return (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.summary?.totalSales)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">
              {reportData.summary?.totalInvoices || 0}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Paid Amount</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.summary?.paidAmount)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Pending Amount</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.summary?.pendingAmount)}
            </p>
          </div>
        </div>

        {/* Sales Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Items</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.invoices?.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono">{invoice.invoice_number}</td>
                    <td className="table-cell">{formatDate(invoice.invoice_date)}</td>
                    <td className="table-cell">{invoice.customer_name}</td>
                    <td className="table-cell">{invoice.item_count}</td>
                    <td className="table-cell font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        invoice.payment_status === 'paid' ? 'badge-success' :
                        invoice.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {invoice.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderPurchasesReport = () => {
    if (!reportData) return null;
    return (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Purchases</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.summary?.totalPurchases)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">
              {reportData.summary?.totalOrders || 0}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Paid Amount</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.summary?.paidAmount)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Pending Amount</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.summary?.pendingAmount)}
            </p>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">PO Number</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Vendor</th>
                  <th className="table-header">Items</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.purchases?.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono">{purchase.po_number}</td>
                    <td className="table-cell">{formatDate(purchase.purchase_date)}</td>
                    <td className="table-cell">{purchase.vendor_name}</td>
                    <td className="table-cell">{purchase.item_count}</td>
                    <td className="table-cell font-medium">
                      {formatCurrency(purchase.total_amount)}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        purchase.status === 'received' ? 'badge-success' :
                        purchase.status === 'pending' ? 'badge-warning' : 'badge-gray'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderProfitLossReport = () => {
    if (!reportData) return null;
    const profit = (reportData.totalSales || 0) - (reportData.totalPurchases || 0);
    const profitMargin = reportData.totalSales > 0 
      ? ((profit / reportData.totalSales) * 100).toFixed(1) 
      : 0;

    return (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.totalSales)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.totalPurchases)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Net Profit/Loss</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Profit Margin</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin}%
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Invoices</dt>
                <dd className="font-medium">{reportData.totalInvoices || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Paid Invoices</dt>
                <dd className="font-medium text-green-600">
                  {formatCurrency(reportData.paidSales)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Pending Invoices</dt>
                <dd className="font-medium text-orange-600">
                  {formatCurrency(reportData.pendingSales)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Purchase Orders</dt>
                <dd className="font-medium">{reportData.totalPurchaseOrders || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Paid Purchases</dt>
                <dd className="font-medium text-green-600">
                  {formatCurrency(reportData.paidPurchases)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Pending Purchases</dt>
                <dd className="font-medium text-orange-600">
                  {formatCurrency(reportData.pendingPurchases)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </>
    );
  };

  const renderStockReport = () => {
    if (!reportData) return null;
    return (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">
              {reportData.summary?.totalProducts || 0}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Stock Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.summary?.totalValue)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Low Stock Items</p>
            <p className="text-2xl font-bold text-orange-600">
              {reportData.summary?.lowStock || 0}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Out of Stock</p>
            <p className="text-2xl font-bold text-red-600">
              {reportData.summary?.outOfStock || 0}
            </p>
          </div>
        </div>

        {/* Stock Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Product</th>
                  <th className="table-header">Category</th>
                  <th className="table-header text-right">Stock</th>
                  <th className="table-header text-right">Reorder Level</th>
                  <th className="table-header text-right">Unit Cost</th>
                  <th className="table-header text-right">Stock Value</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.products?.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono">{product.sku}</td>
                    <td className="table-cell font-medium">{product.name}</td>
                    <td className="table-cell">{product.category || '-'}</td>
                    <td className="table-cell text-right">{product.stock_quantity}</td>
                    <td className="table-cell text-right">{product.reorder_level}</td>
                    <td className="table-cell text-right">
                      {formatCurrency(product.purchase_price)}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(product.stock_quantity * product.purchase_price)}
                    </td>
                    <td className="table-cell">
                      {product.stock_quantity === 0 ? (
                        <span className="badge badge-danger">Out of Stock</span>
                      ) : product.stock_quantity <= product.reorder_level ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button onClick={handleExport} className="btn btn-primary">
          <DocumentArrowDownIcon className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Date Range (except for stock report) */}
      {activeTab !== 'stock' && (
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="input"
              />
            </div>
            <button onClick={fetchReport} className="btn btn-primary">
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="p-8"><Loading fullScreen /></div>
      ) : (
        <>
          {activeTab === 'sales' && renderSalesReport()}
          {activeTab === 'purchases' && renderPurchasesReport()}
          {activeTab === 'profit' && renderProfitLossReport()}
          {activeTab === 'stock' && renderStockReport()}
        </>
      )}
    </div>
  );
};

export default Reports;
