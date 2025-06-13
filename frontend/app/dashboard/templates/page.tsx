'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface Template {
  id: number;
  name: string;
  channel: string;
  subject?: string;
  content: string;
  variables: string[];
  createdAt: string;
}

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    channel: 'email',
    subject: '',
    content: '',
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/templates`, formData);
      toast.success('Template created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', channel: 'email', subject: '', content: '' });
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await axios.delete(`${API_BASE_URL}/templates/${id}`);
        toast.success('Template deleted successfully!');
        fetchTemplates();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete template');
      }
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'sms': return 'bg-green-100 text-green-800';
      case 'in-app': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
              <p className="text-gray-600">Create and manage reusable notification templates</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Template</span>
          </button>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-6">Create your first template to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
            >
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getChannelColor(template.channel)}`}>
                      {template.channel.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {template.subject && (
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Subject:</strong> {template.subject}
                  </p>
                )}
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {template.content}
                </p>
                
                {template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Create Template Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Template</h2>
              
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Welcome Email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="in-app">In-App</option>
                  </select>
                </div>

                {formData.channel === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Welcome to {{company_name}}!"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Hello {{name}}, welcome to our platform! We're excited to have you on board."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {`{{variable_name}}`} for dynamic content
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}