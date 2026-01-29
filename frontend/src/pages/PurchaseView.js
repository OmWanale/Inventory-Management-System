import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { purchaseAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const PurchaseView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState(null);

  useEffect(() => {
    fetchPurchase();
  }, [id]);

  const fetchPurchase = async () => {
    try {
      const response = await purchaseAPI.getById(id);
      setPurchase(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch purchase details');
      navigate('/purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await purchaseAPI.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `purchase-${purchase.po_number}.pdf`);
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
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'badge-warning',
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

  if (loading) return <Loading fullScreen />;
  if (!purchase) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/purchases')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Purchase Order #{purchase.po_number}
            </h1>
            <p className="text-gray-500">Created on {formatDate(purchase.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {purchase.status === 'pending' && (
            <Link to={`/purchases/${id}/edit`} className="btn btn-secondary">
              <PencilSquareIcon className="w-5 h-5" />
              Edit
            </Link>
          )}
          <button onClick={handleDownloadPdf} className="btn btn-primary">
            <DocumentArrowDownIcon className="w-5 h-5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Order Status</p>
          <span className={`badge ${getStatusBadge(purchase.status)} mt-1`}>
            {purchase.status}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Payment Status</p>
          <span className={`badge ${getPaymentBadge(purchase.payment_status)} mt-1`}>
            {purchase.payment_status}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(purchase.total_amount)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendor Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Vendor Name</dt>
              <dd className="font-medium">{purchase.vendor_name}</dd>
            </div>
            {purchase.vendor_phone && (
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd>{purchase.vendor_phone}</dd>
              </div>
            )}
            {purchase.vendor_email && (
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd>{purchase.vendor_email}</dd>
              </div>
            )}
            {purchase.vendor_address && (
              <div>
                <dt className="text-sm text-gray-500">Address</dt>
                <dd>{purchase.vendor_address}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Order Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">PO Number</dt>
              <dd className="font-mono font-medium">{purchase.po_number}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Purchase Date</dt>
              <dd>{formatDate(purchase.purchase_date)}</dd>
            </div>
            {purchase.expected_date && (
              <div>
                <dt className="text-sm text-gray-500">Expected Delivery</dt>
                <dd>{formatDate(purchase.expected_date)}</dd>
              </div>
            )}
            {purchase.received_date && (
              <div>
                <dt className="text-sm text-gray-500">Received Date</dt>
                <dd>{formatDate(purchase.received_date)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Product</th>
                <th className="table-header">SKU</th>
                <th className="table-header text-right">Quantity</th>
                <th className="table-header text-right">Unit Price</th>
                <th className="table-header text-right">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchase.items?.map((item, index) => (
                <tr key={item.id}>
                  <td className="table-cell text-gray-500">{index + 1}</td>
                  <td className="table-cell font-medium">{item.product_name}</td>
                  <td className="table-cell text-gray-500 font-mono">{item.sku}</td>
                  <td className="table-cell text-right">{item.quantity}</td>
                  <td className="table-cell text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="table-cell text-right font-medium">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="5" className="table-cell text-right font-semibold">
                  Subtotal
                </td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(purchase.subtotal)}
                </td>
              </tr>
              {purchase.tax_amount > 0 && (
                <tr>
                  <td colSpan="5" className="table-cell text-right">
                    Tax
                  </td>
                  <td className="table-cell text-right">
                    {formatCurrency(purchase.tax_amount)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan="5" className="table-cell text-right text-lg font-bold">
                  Total
                </td>
                <td className="table-cell text-right text-lg font-bold">
                  {formatCurrency(purchase.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{purchase.notes}</p>
        </div>
      )}
    </div>
  );
};

export default PurchaseView;
