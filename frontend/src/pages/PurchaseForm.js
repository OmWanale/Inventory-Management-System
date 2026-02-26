import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseAPI, vendorAPI, productAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const PurchaseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [formData, setFormData] = useState({
    vendor_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    status: 'pending',
    payment_status: 'pending',
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
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered.slice(0, 10));
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, products]);

  const fetchInitialData = async () => {
    try {
      const [vendorsRes, productsRes] = await Promise.all([
        vendorAPI.getAll({ limit: 1000 }),
        productAPI.getAll({ limit: 1000 }),
      ]);
      setVendors(vendorsRes.data.data.filter((v) => v.status === 'active'));
      setProducts(productsRes.data.data);

      if (isEdit) {
        const purchaseRes = await purchaseAPI.getById(id);
        const purchase = purchaseRes.data.data;
        setFormData({
          vendor_id: purchase.vendor_id,
          purchase_date: purchase.purchase_date.split('T')[0],
          expected_date: purchase.expected_date ? purchase.expected_date.split('T')[0] : '',
          status: purchase.status,
          payment_status: purchase.payment_status,
          notes: purchase.notes || '',
          items: purchase.items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
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
      unit_price: product.purchase_price || 0,
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
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0,
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      toast.error('Please select a vendor');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);
      const data = {
        vendorId: formData.vendor_id,
        purchaseDate: formData.purchase_date,
        invoiceNumber: '',
        paymentStatus: formData.payment_status,
        taxAmount: 0,
        items: formData.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          purchasePrice: item.unit_price,
        })),
        notes: formData.notes,
      };

      if (isEdit) {
        await purchaseAPI.update(id, data);
        toast.success('Purchase updated successfully');
      } else {
        await purchaseAPI.create(data);
        toast.success('Purchase created successfully');
      }
      navigate('/purchases');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save purchase');
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
          {isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                name="vendor_id"
                value={formData.vendor_id}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                name="expected_date"
                value={formData.expected_date}
                onChange={handleChange}
                className="input"
              />
            </div>
            {isEdit && (
              <>
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
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    name="payment_status"
                    value={formData.payment_status}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </>
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
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                      <span className="text-gray-600">
                        {formatCurrency(product.purchase_price)}
                      </span>
                    </button>
                  ))}
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
                      <td className="table-cell font-medium">{item.product_name}</td>
                      <td className="table-cell text-gray-500">{item.sku}</td>
                      <td className="table-cell">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="input w-24"
                          min="1"
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
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
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
            placeholder="Any additional notes for this purchase order..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Purchase' : 'Create Purchase'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseForm;
