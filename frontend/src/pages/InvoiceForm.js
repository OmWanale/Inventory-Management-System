import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceAPI, customerAPI, productAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const InvoiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    payment_status: 'pending',
    payment_method: '',
    discount_type: 'fixed',
    discount_value: 0,
    tax_rate: 18,
    notes: '',
    items: [],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (productSearch.length >= 2) {
      const filtered = products.filter(
        (p) =>
          (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase())) &&
          (p.quantity || p.stock_quantity) > 0
      );
      setFilteredProducts(filtered.slice(0, 10));
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, products]);

  const fetchInitialData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        customerAPI.getAll({ limit: 1000 }),
        productAPI.getAll({ limit: 1000 }),
      ]);
      setCustomers(customersRes.data.data);
      const productsList = productsRes.data.data;
      setProducts(productsList);

      if (isEdit) {
        const invoiceRes = await invoiceAPI.getById(id);
        const invoice = invoiceRes.data.data;
        setFormData({
          customer_id: invoice.customer_id,
          invoice_date: invoice.invoice_date.split('T')[0],
          due_date: invoice.due_date.split('T')[0],
          status: invoice.status,
          payment_status: invoice.payment_status,
          payment_method: invoice.payment_method || '',
          discount_type: invoice.discount_type || 'fixed',
          discount_value: invoice.discount_value || 0,
          tax_rate: invoice.tax_rate || 18,
          notes: invoice.notes || '',
          items: invoice.items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name || item.name,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            max_quantity: item.quantity + (productsList.find(p => p.id === item.product_id)?.quantity || 0),
          })),
        });
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProduct = (product) => {
    // Check if product already exists
    const exists = formData.items.find((item) => item.product_id === product.id);
    if (exists) {
      toast.error('Product already added');
      return;
    }

    const newItem = {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: 1,
      unit_price: product.selling_price || 0,
      max_quantity: product.quantity || product.stock_quantity,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setProductSearch('');
    setShowProductSearch(false);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    let newValue = field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0;
    
    // Validate quantity against stock
    if (field === 'quantity' && newValue > updatedItems[index].max_quantity) {
      toast.error(`Only ${updatedItems[index].max_quantity} items available in stock`);
      newValue = updatedItems[index].max_quantity;
    }
    
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: newValue,
    };
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (formData.discount_type === 'percentage') {
      return (subtotal * formData.discount_value) / 100;
    }
    return parseFloat(formData.discount_value) || 0;
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return ((subtotal - discount) * formData.tax_rate) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    return subtotal - discount + tax;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);
      const data = {
        customerId: formData.customer_id,
        invoiceDate: formData.invoice_date,
        dueDate: formData.due_date,
        taxRate: parseFloat(formData.tax_rate) || 0,
        discountAmount: calculateDiscount(),
        notes: formData.notes,
        subtotal: calculateSubtotal(),
        totalAmount: calculateTotal(),
        items: formData.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: 0,
        })),
      };

      if (isEdit) {
        await invoiceAPI.update(id, data);
        toast.success('Invoice updated successfully');
      } else {
        await invoiceAPI.create(data);
        toast.success('Invoice created successfully');
      }
      navigate('/invoices');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  if (loading) return <Loading fullScreen />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Invoice' : 'New Invoice'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="invoice_date"
                value={formData.invoice_date}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProductSearch(!showProductSearch)}
                className="btn btn-primary"
              >
                <PlusIcon className="w-5 h-5" />
                Add Item
              </button>
            </div>
          </div>

          {/* Product Search */}
          {showProductSearch && (
            <div className="mb-4 relative">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="input pl-10"
                  autoFocus
                />
              </div>
              {filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          SKU: {product.sku} | Stock: {product.quantity || product.stock_quantity}
                        </p>
                      </div>
                      <span className="text-gray-600">
                        {formatCurrency(product.selling_price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {productSearch.length >= 2 && filteredProducts.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
                  No products found with available stock
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          {formData.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header">SKU</th>
                    <th className="table-header w-32">Quantity</th>
                    <th className="table-header w-40">Unit Price</th>
                    <th className="table-header w-32">Total</th>
                    <th className="table-header w-16"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-gray-500">
                            Available: {item.max_quantity}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{item.sku}</td>
                      <td className="table-cell">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="input w-24"
                          min="1"
                          max={item.max_quantity}
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          className="input w-32"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="table-cell font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                      <td className="table-cell">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No items added. Click "Add Item" to search and add products.
            </div>
          )}

          {/* Totals */}
          {formData.items.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <div className="flex flex-col md:flex-row md:justify-between gap-6">
                {/* Discount and Tax */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type
                    </label>
                    <select
                      name="discount_type"
                      value={formData.discount_type}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="number"
                      name="discount_value"
                      value={formData.discount_value}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      name="tax_rate"
                      value={formData.tax_rate}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="w-full md:w-72 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-red-600">-{formatCurrency(calculateDiscount())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({formData.tax_rate}%):</span>
                    <span>{formatCurrency(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            className="input"
            placeholder="Any additional notes for this invoice..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
