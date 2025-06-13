'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const CHANNELS = [
  { id: 'email', name: 'Email', icon: EnvelopeIcon, color: 'bg-blue-500' },
  { id: 'sms', name: 'SMS', icon: DevicePhoneMobileIcon, color: 'bg-green-500' },
  { id: 'in-app', name: 'In-App', icon: ComputerDesktopIcon, color: 'bg-purple-500' },
];

export default function SendNotificationPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    to: '',
    channel: 'email',
    message: '',
    subject: '',
    sendAt: '',
    isBulk: false,
    recipients: '',
  });
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        channel: formData.channel,
        message: formData.message,
      };

      // Add subject for email
      if (formData.channel === 'email' && formData.subject) {
        payload.subject = formData.subject;
      }

      // Handle bulk vs single notification
      if (formData.isBulk && formData.recipients) {
        // Parse recipients (comma-separated or line-separated)
        const recipients = formData.recipients
          .split(/[,\n]/)
          .map(r => r.trim())
          .filter(r => r.length > 0);
        
        payload.recipients = recipients;
      } else {
        payload.to = formData.to;
      }

      // Add scheduling if specified
      if (formData.sendAt) {
        payload.sendAt = new Date(formData.sendAt).toISOString();
      }

      const endpoint = formData.isBulk ? '/notify/bulk' : '/notify';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      toast.success(
        formData.isBulk 
          ? `Bulk notification queued for ${payload.recipients?.length} recipients!`
          : formData.sendAt 
            ? 'Notification scheduled successfully!'
            : 'Notification sent successfully!'
      );

      // Reset form
      setFormData({
        to: '',
        channel: 'email',
        message: '',
        subject: '',
        sendAt: '',
        isBulk: false,
        recipients: '',
      });

    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setFormData({
      ...formData,
      to: 'dheemanthmadaiah@gmail.com',
      message: 'Hello! This is a test notification from Dheenotifications platform. 🚀',
      subject: 'Test Notification from Dheenotifications',
    });
  };

  const handleSMSQuickFill = () => {
    setFormData({
      ...formData,
      to: '+919686490654',
      channel: 'sms',
      message: 'Hello! This is a test SMS from Dheenotifications platform. 📱',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-lg">
              <BellIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Send Notification</h1>
              <p className="text-gray-600">Send notifications via Email, SMS, or In-App channels</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Notification Type Toggle */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="notificationType"
                      checked={!formData.isBulk}
                      onChange={() => setFormData({ ...formData, isBulk: false })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Single Notification</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="notificationType"
                      checked={formData.isBulk}
                      onChange={() => setFormData({ ...formData, isBulk: true })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Bulk Notification</span>
                  </label>
                </div>

                {/* Channel Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Notification Channel
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {CHANNELS.map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, channel: channel.id })}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          formData.channel === channel.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <channel.icon className={`h-6 w-6 mx-auto mb-2 ${
                          formData.channel === channel.id ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          formData.channel === channel.id ? 'text-indigo-600' : 'text-gray-600'
                        }`}>
                          {channel.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                {!formData.isBulk ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.channel === 'email' ? 'Email Address' : 
                       formData.channel === 'sms' ? 'Phone Number' : 'User ID'}
                    </label>
                    <input
                      type={formData.channel === 'email' ? 'email' : 'text'}
                      value={formData.to}
                      onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={
                        formData.channel === 'email' ? 'user@example.com' :
                        formData.channel === 'sms' ? '+1234567890' : 'user123'
                      }
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipients (one per line or comma-separated)
                    </label>
                    <textarea
                      value={formData.recipients}
                      onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={
                        formData.channel === 'email' 
                          ? 'user1@example.com\nuser2@example.com\nuser3@example.com'
                          : formData.channel === 'sms'
                            ? '+1234567890, +0987654321'
                            : 'user1, user2, user3'
                      }
                      required
                    />
                  </div>
                )}

                {/* Subject (Email only) */}
                {formData.channel === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter email subject"
                    />
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your message here..."
                    required
                  />
                </div>

                {/* Schedule (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    Schedule for Later (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.sendAt}
                    onChange={(e) => setFormData({ ...formData, sendAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {formData.sendAt ? 'Scheduling...' : 'Sending...'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <BellIcon className="h-5 w-5 mr-2" />
                      {formData.sendAt ? 'Schedule Notification' : 'Send Notification'}
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleQuickFill}
                  className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-blue-900">Test Email</p>
                      <p className="text-sm text-blue-600">Fill demo email data</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={handleSMSQuickFill}
                  className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-green-900">Test SMS</p>
                      <p className="text-sm text-green-600">Fill demo SMS data</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Use bulk notifications for sending to multiple recipients</li>
                <li>• Schedule notifications for optimal delivery times</li>
                <li>• Email subjects improve open rates</li>
                <li>• SMS messages are limited to 160 characters</li>
                <li>• In-app notifications appear in real-time</li>
              </ul>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sent Today</span>
                  <span className="font-semibold">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold text-green-600">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Templates</span>
                  <span className="font-semibold">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}