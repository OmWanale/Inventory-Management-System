import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  TrashIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

const Invoices = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [deleteId, setDeleteId] = useState(null);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  });

  useEffect(() => {
    fetchInvoices();
  }, [searchParams]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: searchParams.get('page') || 1,
        limit: 10,
        search: searchParams.get('search') || '',
        status: searchParams.get('status') || '',
        startDate: searchParams.get('startDate') || '',
        endDate: searchParams.get('endDate') || '',
      };
      const response = await invoiceAPI.getAll(params);
      setInvoices(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (page) => {
    searchParams.set('page', page);
    setSearchParams(searchParams);
  };

  const handleDelete = async () => {
    try {
      await invoiceAPI.delete(deleteId);
      toast.success('Invoice deleted successfully');
      setDeleteId(null);
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      const response = await invoiceAPI.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'badge-gray',
      sent: 'badge-info',
      paid: 'badge-success',
      overdue: 'badge-danger',
      cancelled: 'badge-gray',
    };
    return statusClasses[status] || 'badge-gray';
  };

  const getPaymentBadge = (status) => {
    const statusClasses = {
      paid: 'badge-success',
      partial: 'badge-warning',
      unpaid: 'badge-danger',
    };
    return statusClasses[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Link to="/invoices/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice # or customer..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFilters({ search: '', status: '', startDate: '', endDate: '' });
                setSearchParams(new URLSearchParams());
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8"><Loading fullScreen /></div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No invoices found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Customer</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Due Date</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Payment</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-sm font-medium">
                        {invoice.invoice_number}
                      </td>
                      <td className="table-cell">{invoice.customer_name}</td>
                      <td className="table-cell">{formatDate(invoice.invoice_date)}</td>
                      <td className="table-cell">{formatDate(invoice.due_date)}</td>
                      <td className="table-cell font-medium">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusBadge(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getPaymentBadge(invoice.payment_status)}`}>
                          {invoice.payment_status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="p-1 text-gray-500 hover:text-primary-600"
                            title="View"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDownloadPdf(invoice.id)}
                            className="p-1 text-gray-500 hover:text-green-600"
                            title="Download PDF"
                          >
                            <DocumentArrowDownIcon className="w-5 h-5" />
                          </button>
                          {isAdmin() && invoice.status === 'draft' && (
                            <button
                              onClick={() => setDeleteId(invoice.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This will also reverse the stock changes."
      />
    </div>
  );
};

export default Invoices;
