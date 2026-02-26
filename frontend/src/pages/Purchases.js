import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { purchaseAPI } from '../services/api';
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

const Purchases = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [deleteId, setDeleteId] = useState(null);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  });

  useEffect(() => {
    fetchPurchases();
  }, [searchParams]);

  const fetchPurchases = async () => {
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
      const response = await purchaseAPI.getAll(params);
      setPurchases(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch purchases');
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
      await purchaseAPI.delete(deleteId);
      toast.success('Purchase deleted successfully');
      setDeleteId(null);
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete purchase');
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      const response = await purchaseAPI.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `purchase-${id}.pdf`);
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
      ordered: 'badge-info',
      partially_received: 'badge-warning',
      received: 'badge-success',
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
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <Link to="/purchases/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          New Purchase
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
                placeholder="Search by PO number or vendor..."
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
              <option value="">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
              placeholder="End Date"
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

      {/* Purchases Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8"><Loading fullScreen /></div>
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No purchases found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">PO Number</th>
                    <th className="table-header">Vendor</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Due Date</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Paid</th>
                    <th className="table-header">Order</th>
                    <th className="table-header">Payment</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-sm font-medium">
                        {purchase.purchase_number || purchase.po_number}
                      </td>
                      <td className="table-cell">{purchase.vendor_name}</td>
                      <td className="table-cell">{formatDate(purchase.purchase_date)}</td>
                      <td className="table-cell">
                        <span className={purchase.payment_due_date && new Date(purchase.payment_due_date) < new Date() && purchase.computed_payment_status !== 'paid' ? 'text-red-600 font-semibold' : ''}>
                          {purchase.payment_due_date ? formatDate(purchase.payment_due_date) : '-'}
                        </span>
                      </td>
                      <td className="table-cell font-medium">
                        {formatCurrency(purchase.total_amount)}
                      </td>
                      <td className="table-cell text-green-600 font-medium">
                        {formatCurrency(purchase.amount_paid || 0)}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusBadge(purchase.order_status)}`}>
                          {(purchase.order_status || 'ordered').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getPaymentBadge(purchase.computed_payment_status || purchase.payment_status)}`}>
                          {purchase.computed_payment_status || purchase.payment_status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/purchases/${purchase.id}`}
                            className="p-1 text-gray-500 hover:text-primary-600"
                            title="View"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDownloadPdf(purchase.id)}
                            className="p-1 text-gray-500 hover:text-green-600"
                            title="Download PDF"
                          >
                            <DocumentArrowDownIcon className="w-5 h-5" />
                          </button>
                          {isAdmin() && purchase.computed_payment_status !== 'paid' && (
                            <button
                              onClick={() => setDeleteId(purchase.id)}
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
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Purchase"
        message="Are you sure you want to delete this purchase order? This will also reverse the stock changes."
      />
    </div>
  );
};

export default Purchases;
