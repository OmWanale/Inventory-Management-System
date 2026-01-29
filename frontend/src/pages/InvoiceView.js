import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const InvoiceView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await invoiceAPI.getById(id);
      setInvoice(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch invoice details');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await invoiceAPI.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoice.invoice_number}.pdf`);
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

  if (loading) return <Loading fullScreen />;
  if (!invoice) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice #{invoice.invoice_number}
            </h1>
            <p className="text-gray-500">Created on {formatDate(invoice.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <Link to={`/invoices/${id}/edit`} className="btn btn-secondary">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Invoice Status</p>
          <span className={`badge ${getStatusBadge(invoice.status)} mt-1`}>
            {invoice.status}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Payment Status</p>
          <span className={`badge ${getPaymentBadge(invoice.payment_status)} mt-1`}>
            {invoice.payment_status}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Due Date</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatDate(invoice.due_date)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(invoice.total_amount)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Customer Name</dt>
              <dd className="font-medium">{invoice.customer_name}</dd>
            </div>
            {invoice.customer_phone && (
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd>{invoice.customer_phone}</dd>
              </div>
            )}
            {invoice.customer_email && (
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd>{invoice.customer_email}</dd>
              </div>
            )}
            {invoice.customer_address && (
              <div>
                <dt className="text-sm text-gray-500">Address</dt>
                <dd>{invoice.customer_address}</dd>
              </div>
            )}
            {invoice.customer_gst_number && (
              <div>
                <dt className="text-sm text-gray-500">GST Number</dt>
                <dd className="font-mono">{invoice.customer_gst_number}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Invoice Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Invoice Number</dt>
              <dd className="font-mono font-medium">{invoice.invoice_number}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Invoice Date</dt>
              <dd>{formatDate(invoice.invoice_date)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Due Date</dt>
              <dd>{formatDate(invoice.due_date)}</dd>
            </div>
            {invoice.payment_method && (
              <div>
                <dt className="text-sm text-gray-500">Payment Method</dt>
                <dd className="capitalize">{invoice.payment_method.replace('_', ' ')}</dd>
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
              {invoice.items?.map((item, index) => (
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
                <td colSpan="5" className="table-cell text-right">
                  Subtotal
                </td>
                <td className="table-cell text-right">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>
              {invoice.discount_amount > 0 && (
                <tr>
                  <td colSpan="5" className="table-cell text-right">
                    Discount
                    {invoice.discount_type === 'percentage' && ` (${invoice.discount_value}%)`}
                  </td>
                  <td className="table-cell text-right text-red-600">
                    -{formatCurrency(invoice.discount_amount)}
                  </td>
                </tr>
              )}
              {invoice.tax_amount > 0 && (
                <tr>
                  <td colSpan="5" className="table-cell text-right">
                    Tax ({invoice.tax_rate}%)
                  </td>
                  <td className="table-cell text-right">
                    {formatCurrency(invoice.tax_amount)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan="5" className="table-cell text-right text-lg font-bold">
                  Total
                </td>
                <td className="table-cell text-right text-lg font-bold">
                  {formatCurrency(invoice.total_amount)}
                </td>
              </tr>
              {invoice.paid_amount > 0 && (
                <>
                  <tr>
                    <td colSpan="5" className="table-cell text-right text-green-600">
                      Paid Amount
                    </td>
                    <td className="table-cell text-right text-green-600">
                      {formatCurrency(invoice.paid_amount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="5" className="table-cell text-right font-semibold">
                      Balance Due
                    </td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
};

export default InvoiceView;
