import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import {
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_gst: '',
    company_pan: '',
    currency_symbol: '₹',
    currency_code: 'INR',
    tax_rate: 18,
    invoice_prefix: 'INV',
    po_prefix: 'PO',
    invoice_terms: '',
    invoice_notes: '',
    low_stock_threshold: 10,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.get();
      if (response.data.data) {
        setSettings((prev) => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await settingsAPI.update(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'company', name: 'Company', icon: BuildingOfficeIcon },
    { id: 'billing', name: 'Billing', icon: CurrencyRupeeIcon },
    { id: 'invoice', name: 'Invoice', icon: DocumentTextIcon },
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
  ];

  if (loading) return <Loading fullScreen />;

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

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

      <form onSubmit={handleSubmit}>
        {/* Company Settings */}
        {activeTab === 'company' && (
          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={settings.company_name}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="company_address"
                  value={settings.company_address}
                  onChange={handleChange}
                  rows="3"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="company_phone"
                  value={settings.company_phone}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="company_email"
                  value={settings.company_email}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  name="company_gst"
                  value={settings.company_gst}
                  onChange={handleChange}
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="company_pan"
                  value={settings.company_pan}
                  onChange={handleChange}
                  className="input font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Billing Settings */}
        {activeTab === 'billing' && (
          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Billing Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  name="currency_symbol"
                  value={settings.currency_symbol}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  name="currency_code"
                  value={settings.currency_code}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="tax_rate"
                  value={settings.tax_rate}
                  onChange={handleChange}
                  className="input"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        )}

        {/* Invoice Settings */}
        {activeTab === 'invoice' && (
          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  name="invoice_prefix"
                  value={settings.invoice_prefix}
                  onChange={handleChange}
                  className="input"
                />
                <p className="text-sm text-gray-500 mt-1">e.g., INV-001, INV-002</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Prefix
                </label>
                <input
                  type="text"
                  name="po_prefix"
                  value={settings.po_prefix}
                  onChange={handleChange}
                  className="input"
                />
                <p className="text-sm text-gray-500 mt-1">e.g., PO-001, PO-002</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Invoice Terms
                </label>
                <textarea
                  name="invoice_terms"
                  value={settings.invoice_terms}
                  onChange={handleChange}
                  rows="3"
                  className="input"
                  placeholder="Payment is due within 30 days..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Invoice Notes
                </label>
                <textarea
                  name="invoice_notes"
                  value={settings.invoice_notes}
                  onChange={handleChange}
                  rows="3"
                  className="input"
                  placeholder="Thank you for your business..."
                />
              </div>
            </div>
          </div>
        )}

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={settings.low_stock_threshold}
                  onChange={handleChange}
                  className="input"
                  min="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Alert when stock falls below this level
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
