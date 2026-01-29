import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vendorAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const Vendors = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  useEffect(() => {
    fetchVendors();
  }, [searchParams]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = {
        page: searchParams.get('page') || 1,
        limit: 10,
        search: searchParams.get('search') || '',
        status: searchParams.get('status') || '',
      };
      const response = await vendorAPI.getAll(params);
      setVendors(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (page) => {
    searchParams.set('page', page);
    setSearchParams(searchParams);
  };

  const handleDelete = async () => {
    try {
      await vendorAPI.delete(deleteId);
      toast.success('Vendor deleted successfully');
      setDeleteId(null);
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <Link to="/vendors/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          Add Vendor
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {/* Vendors Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8"><Loading fullScreen /></div>
        ) : vendors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No vendors found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Vendor</th>
                    <th className="table-header">Contact Person</th>
                    <th className="table-header">Contact</th>
                    <th className="table-header">GST Number</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          <p className="text-sm text-gray-500">{vendor.city}, {vendor.state}</p>
                        </div>
                      </td>
                      <td className="table-cell">{vendor.contact_person || '-'}</td>
                      <td className="table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <PhoneIcon className="w-4 h-4 text-gray-400" />
                            {vendor.phone}
                          </div>
                          {vendor.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                              {vendor.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell font-mono text-sm">{vendor.gst_number || '-'}</td>
                      <td className="table-cell">
                        <span className={`badge ${vendor.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/vendors/${vendor.id}/edit`}
                            className="p-1 text-gray-500 hover:text-primary-600"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </Link>
                          {isAdmin() && (
                            <button
                              onClick={() => setDeleteId(vendor.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
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
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor? This action cannot be undone."
      />
    </div>
  );
};

export default Vendors;
