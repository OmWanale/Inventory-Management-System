import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import Loading from '../components/Loading';
import {
  CubeIcon,
  TruckIcon,
  UserGroupIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes, lowStockRes, transactionsRes, categoryRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getChartData(6),
        dashboardAPI.getLowStockAlerts(),
        dashboardAPI.getRecentTransactions(),
        dashboardAPI.getCategoryDistribution(),
      ]);

      setStats(statsRes.data.data);
      setChartData(chartRes.data.data);
      setLowStock(lowStockRes.data.data);
      setRecentTransactions(transactionsRes.data.data);
      setCategoryData(categoryRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      name: 'Total Products',
      value: stats?.products?.total || 0,
      icon: CubeIcon,
      color: 'bg-blue-500',
      link: '/products',
    },
    {
      name: 'Active Vendors',
      value: stats?.vendors?.total || 0,
      icon: TruckIcon,
      color: 'bg-green-500',
      link: '/vendors',
    },
    {
      name: 'Active Customers',
      value: stats?.customers?.total || 0,
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      link: '/customers',
    },
    {
      name: 'Monthly Sales',
      value: formatCurrency(stats?.currentMonth?.sales?.total || 0),
      icon: BanknotesIcon,
      color: 'bg-emerald-500',
      link: '/invoices',
    },
    {
      name: 'Monthly Purchases',
      value: formatCurrency(stats?.currentMonth?.purchases?.total || 0),
      icon: ShoppingCartIcon,
      color: 'bg-orange-500',
      link: '/purchases',
    },
    {
      name: 'Low Stock Items',
      value: stats?.products?.lowStock || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      link: '/products?lowStock=true',
    },
  ];

  const lineChartData = {
    labels: chartData.map(d => {
      const [year, month] = d.month.split('-');
      return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
    }),
    datasets: [
      {
        label: 'Sales',
        data: chartData.map(d => d.sales),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Purchases',
        data: chartData.map(d => d.purchases),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const doughnutData = {
    labels: categoryData.map(c => c.category),
    datasets: [
      {
        data: categoryData.map(c => c.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(14, 165, 233, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Purchases Chart */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales vs Purchases (6 Months)</h3>
          <div className="h-[300px]">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => '₹' + value.toLocaleString(),
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Products by Category</h3>
          <div className="h-[300px] flex items-center justify-center">
            {categoryData.length > 0 ? (
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' },
                  },
                }}
              />
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
            <Link to="/products?lowStock=true" className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStock.length > 0 ? (
              lowStock.slice(0, 5).map((product) => (
                <div key={product.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${product.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                      {product.quantity} left
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Reorder: {product.reorder_level}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No low stock items
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((transaction, index) => (
                <div key={index} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${transaction.type === 'sale' ? 'bg-green-100' : 'bg-orange-100'}`}>
                      {transaction.type === 'sale' ? (
                        <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.reference}</p>
                      <p className="text-sm text-gray-500">{transaction.party_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.type === 'sale' ? 'text-green-600' : 'text-orange-600'}`}>
                      {transaction.type === 'sale' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No recent transactions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Payments Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receivables</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(stats?.pending?.invoices?.total || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats?.pending?.invoices?.count || 0} pending invoices
              </p>
            </div>
            <Link to="/invoices?status=pending" className="btn btn-secondary">
              View
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payables</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(stats?.pending?.purchases?.total || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats?.pending?.purchases?.count || 0} pending purchases
              </p>
            </div>
            <Link to="/purchases?status=pending" className="btn btn-secondary">
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
