'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  BellIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface DashboardData {
  summary: {
    totalNotifications: number;
    successRate: number;
    scheduledCount: number;
    templatesCount: number;
  };
  charts: {
    notificationsByChannel: Array<{ channel: string; count: number }>;
    notificationsByStatus: Array<{ status: string; count: number }>;
    dailyNotifications: Array<{ date: string; count: number }>;
  };
  recentFailures: Array<{
    id: number;
    to: string;
    channel: string;
    error: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Notifications',
      value: data?.summary.totalNotifications || 0,
      icon: BellIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Success Rate',
      value: `${data?.summary.successRate || 0}%`,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      change: '+2.1%',
      changeType: 'positive',
    },
    {
      name: 'Scheduled',
      value: data?.summary.scheduledCount || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      change: '+5',
      changeType: 'positive',
    },
    {
      name: 'Templates',
      value: data?.summary.templatesCount || 0,
      icon: DocumentTextIcon,
      color: 'bg-purple-500',
      change: '+1',
      changeType: 'positive',
    },
  ];

  // Chart configurations
  const dailyNotificationsData = {
    labels: data?.charts.dailyNotifications.map(item => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [
      {
        label: 'Notifications Sent',
        data: data?.charts.dailyNotifications.map(item => item.count) || [],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const channelData = {
    labels: data?.charts.notificationsByChannel.map(item => 
      item.channel.charAt(0).toUpperCase() + item.channel.slice(1)
    ) || [],
    datasets: [
      {
        data: data?.charts.notificationsByChannel.map(item => item.count) || [],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const statusData = {
    labels: data?.charts.notificationsByStatus.map(item => 
      item.status.charAt(0).toUpperCase() + item.status.slice(1)
    ) || [],
    datasets: [
      {
        data: data?.charts.notificationsByStatus.map(item => item.count) || [],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your notifications today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last week</span>
                  </div>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Notifications Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Daily Notifications (Last 7 Days)
            </h3>
            <Line data={dailyNotificationsData} options={chartOptions} />
          </div>

          {/* Channel Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notifications by Channel
            </h3>
            <div className="h-64 flex items-center justify-center">
              {data?.charts.notificationsByChannel.length ? (
                <Doughnut data={channelData} options={doughnutOptions} />
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Status Distribution and Recent Failures */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notifications by Status
            </h3>
            <div className="h-64 flex items-center justify-center">
              {data?.charts.notificationsByStatus.length ? (
                <Doughnut data={statusData} options={doughnutOptions} />
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </div>

          {/* Recent Failures */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              Recent Failures
            </h3>
            <div className="space-y-3">
              {data?.recentFailures.length ? (
                data.recentFailures.slice(0, 5).map((failure) => (
                  <div
                    key={failure.id}
                    className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {failure.channel.toUpperCase()} to {failure.to}
                      </p>
                      <p className="text-sm text-red-600 truncate">
                        {failure.error}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(failure.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No recent failures! 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-left transition-all duration-200">
              <BellIcon className="h-6 w-6 mb-2" />
              <p className="font-medium">Send Notification</p>
              <p className="text-sm opacity-90">Send a quick notification</p>
            </button>
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-left transition-all duration-200">
              <DocumentTextIcon className="h-6 w-6 mb-2" />
              <p className="font-medium">Create Template</p>
              <p className="text-sm opacity-90">Build reusable templates</p>
            </button>
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-left transition-all duration-200">
              <ChartBarIcon className="h-6 w-6 mb-2" />
              <p className="font-medium">View Analytics</p>
              <p className="text-sm opacity-90">Detailed performance metrics</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}