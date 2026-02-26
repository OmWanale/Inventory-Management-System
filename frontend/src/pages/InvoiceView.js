import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';

const InvoiceView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode: 'cash',
    reference_no: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

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

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      setSubmitting(true);
      await invoiceAPI.recordPayment(id, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_mode: 'cash',
        reference_no: '',
        notes: '',
      });
      fetchInvoice();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
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

  const isOverdue = () => {
    if (!invoice.due_date) return false;
    const paymentStatus = invoice.computed_payment_status || invoice.payment_status;
    if (paymentStatus === 'paid') return false;
    return new Date(invoice.due_date) < new Date();
  };

  if (loading) return <Loading fullScreen />;
  if (!invoice) return null;

  const pendingAmount = invoice.total_amount - (invoice.amount_paid || 0);
  const paymentStatus = invoice.computed_payment_status || invoice.payment_status;

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
        <div className="flex items-center gap-2 flex-wrap">
          {pendingAmount > 0 && (
            <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary">
              <CurrencyRupeeIcon className="w-5 h-5" />
              Record Payment
            </button>
          )}
          {paymentStatus !== 'paid' && (
            <Link to={`/invoices/${id}/edit`} className="btn btn-secondary">
              <PencilSquareIcon className="w-5 h-5" />
              Edit
            </Link>
          )}
          <button onClick={handleDownloadPdf} className="btn btn-secondary">
            <DocumentArrowDownIcon className="w-5 h-5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Invoice Status</p>
          <span className={`badge ${getStatusBadge(invoice.payment_status)} mt-1`}>
            {invoice.payment_status}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Payment Status</p>
          <span className={`badge ${getPaymentBadge(paymentStatus)} mt-1`}>
            {paymentStatus}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(invoice.amount_paid || 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className={`text-lg font-bold ${pendingAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(pendingAmount)}
          </p>
        </div>
      </div>

      {/* Overdue Warning */}
      {isOverdue() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">
            Payment overdue! Due date was {formatDate(invoice.due_date)}.
            Pending amount: {formatCurrency(pendingAmount)}
          </p>
        </div>
      )}

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
            {(invoice.customer_address || invoice.billing_address) && (
              <div>
                <dt className="text-sm text-gray-500">Address</dt>
                <dd>{invoice.customer_address || invoice.billing_address}</dd>
              </div>
            )}
            {(invoice.customer_gst_number || invoice.customer_gst) && (
              <div>
                <dt className="text-sm text-gray-500">GST Number</dt>
                <dd className="font-mono">{invoice.customer_gst_number || invoice.customer_gst}</dd>
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
              <dd className={isOverdue() ? 'text-red-600 font-semibold' : ''}>
                {formatDate(invoice.due_date)}
              </dd>
            </div>
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
                <tr key={item.id || index}>
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
                <td colSpan="5" className="table-cell text-right">Subtotal</td>
                <td className="table-cell text-right">
                  {formatCurrency(invoice.subtotal || invoice.items?.reduce((sum, i) => sum + i.quantity * i.unit_price, 0))}
                </td>
              </tr>
              {invoice.discount_amount > 0 && (
                <tr>
                  <td colSpan="5" className="table-cell text-right">
                    Discount{invoice.discount_type === 'percentage' ? ` (${invoice.discount_value}%)` : ''}
                  </td>
                  <td className="table-cell text-right text-red-600">
                    -{formatCurrency(invoice.discount_amount)}
                  </td>
                </tr>
              )}
              {invoice.tax_amount > 0 && (
                <tr>
                  <td colSpan="5" className="table-cell text-right">
                    Tax{invoice.tax_rate ? ` (${invoice.tax_rate}%)` : ''}
                  </td>
                  <td className="table-cell text-right">{formatCurrency(invoice.tax_amount)}</td>
                </tr>
              )}
              {invoice.shipping_cost > 0 && (
                <tr>
                  <td colSpan="5" className="table-cell text-right">Shipping</td>
                  <td className="table-cell text-right">{formatCurrency(invoice.shipping_cost)}</td>
                </tr>
              )}
              <tr>
                <td colSpan="5" className="table-cell text-right text-lg font-bold">Total</td>
                <td className="table-cell text-right text-lg font-bold">{formatCurrency(invoice.total_amount)}</td>
              </tr>
              {(invoice.amount_paid || 0) > 0 && (
                <>
                  <tr>
                    <td colSpan="5" className="table-cell text-right text-green-600">Paid Amount</td>
                    <td className="table-cell text-right text-green-600">{formatCurrency(invoice.amount_paid)}</td>
                  </tr>
                  <tr>
                    <td colSpan="5" className="table-cell text-right font-semibold">Balance Due</td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(pendingAmount)}</td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Mode</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.payments.map((payment, index) => (
                  <tr key={payment.id || index}>
                    <td className="table-cell text-gray-500">{index + 1}</td>
                    <td className="table-cell">{formatDate(payment.payment_date)}</td>
                    <td className="table-cell font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                    <td className="table-cell capitalize">{payment.payment_mode}</td>
                    <td className="table-cell font-mono text-sm">{payment.reference_no || '-'}</td>
                    <td className="table-cell text-gray-500">{payment.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="2" className="table-cell text-right font-semibold">Total Paid</td>
                  <td className="table-cell font-bold text-green-600">
                    {formatCurrency(invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0))}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              className="input mt-1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount (Pending: {formatCurrency(pendingAmount)})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={pendingAmount}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="input mt-1"
              placeholder={`Max: ${pendingAmount.toFixed(2)}`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
            <select
              value={paymentForm.payment_mode}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
              className="input mt-1"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reference No.</label>
            <input
              type="text"
              value={paymentForm.reference_no}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
              className="input mt-1"
              placeholder="Transaction ID, Cheque No., etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="input mt-1"
              rows="2"
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvoiceView;
