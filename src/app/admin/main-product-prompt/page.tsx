'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  // Trash2, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Calendar,
  Bot,
  Eye,
  X,
  Loader2,
  Link
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';

interface MainProductPrompt {
  id: string;
  vectorId: string | null;
  aiModel: string;
  mcpUrl: string | null;
  mainPrompt: string;
  createdAt: string;
  updatedAt: string;
}

interface MainProductPromptFormData {
  vectorId: string;
  aiModel: string;
  mcpUrl: string;
  mainPrompt: string;
}

const MainProductPromptPage = () => {
  const [mainProductPrompts, setMainProductPrompts] = useState<MainProductPrompt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedPrompt, setSelectedPrompt] = useState<MainProductPrompt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  const [formData, setFormData] = useState<MainProductPromptFormData>({
    vectorId: '',
    aiModel: 'gpt-5',
    mcpUrl: '',
    mainPrompt: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch main product prompts
  const fetchMainProductPrompts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
      });

      const response = await fetch(`/api/admin/main-product-prompt?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setMainProductPrompts(data.data.mainProductPrompts);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
      } else {
        if (response.status === 401) {
          router.push('/admin/signin');
        }
        console.error('Failed to fetch main product prompts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching main product prompts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, router]);

  useEffect(() => {
    fetchMainProductPrompts();
  }, [fetchMainProductPrompts]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Reset form
  const resetForm = () => {
    setFormData({
      vectorId: '',
      aiModel: 'gpt-5',
      mcpUrl: '',
      mainPrompt: '',
    });
    setErrors({});
  };

  // Open modal for create
  const handleCreate = () => {
    resetForm();
    setModalMode('create');
    setSelectedPrompt(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (prompt: MainProductPrompt) => {
    setFormData({
      vectorId: prompt.vectorId || '',
      aiModel: prompt.aiModel,
      mcpUrl: prompt.mcpUrl || '',
      mainPrompt: prompt.mainPrompt,
    });
    setModalMode('edit');
    setSelectedPrompt(prompt);
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for view
  const handleView = (prompt: MainProductPrompt) => {
    setSelectedPrompt(prompt);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const url = modalMode === 'create' 
        ? '/api/admin/main-product-prompt'
        : `/api/admin/main-product-prompt/${selectedPrompt?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setIsModalOpen(false);
        resetForm();
        fetchMainProductPrompts();
      } else {
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          data.details.forEach((validationError: { path: string[]; message: string }) => {
            fieldErrors[validationError.path[0]] = validationError.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error });
        }
      }
    } catch (submitError) {
      console.error('Submit error:', submitError);
      setErrors({ general: 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  // const handleDelete = async (prompt: MainProductPrompt) => {
  //   if (!confirm(`Are you sure you want to delete this main product prompt?`)) {
  //     return;
  //   }

  //   try {
  //     const response = await fetch(`/api/admin/main-product-prompt/${prompt.id}`, {
  //       method: 'DELETE',
  //       credentials: 'include',
  //     });

  //     const data = await response.json();

  //     if (data.success) {
  //       fetchMainProductPrompts();
  //     } else {
  //       alert(data.error);
  //     }
  //   } catch (deleteError) {
  //     console.error('Delete error:', deleteError);
  //     alert('Failed to delete main product prompt');
  //   }
  // };

  // AI Model color helper
  const getAiModelColor = (aiModel: string) => {
    switch (aiModel) {
      case 'gpt-5': return 'bg-purple-100 text-purple-800';
      case 'gpt-5-mini': return 'bg-purple-100 text-purple-800';
      case 'gpt-4': return 'bg-blue-100 text-blue-800';
      case 'gpt-3.5-turbo': return 'bg-green-100 text-green-800';
      case 'claude-3-sonnet': return 'bg-orange-100 text-orange-800';
      case 'claude-3-haiku': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AdminHeader />
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Main Product Prompts</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your AI model configurations and prompts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Prompts</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">GPT-5 Models</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {mainProductPrompts.filter(p => p.aiModel === 'gpt-5').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">With MCP URL</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {mainProductPrompts.filter(p => p.mcpUrl).length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                <Link className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">This Month</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {mainProductPrompts.filter(p => {
                    const promptDate = new Date(p.createdAt);
                    const now = new Date();
                    return promptDate.getMonth() === now.getMonth() && 
                           promptDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Add Prompt Button */}
            {/* <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Prompt</span>
              <span className="sm:hidden">Add</span>
            </button> */}
          </div>
        </div>

        {/* Prompts Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 sm:p-12">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm">AI Model</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden md:table-cell">Vector ID</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden lg:table-cell">MCP URL</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm">Prompt Preview</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Created</th>
                      <th className="text-right p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mainProductPrompts.map((prompt) => (
                      <tr key={prompt.id} className="hover:bg-gray-50">
                        <td className="p-3 sm:p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAiModelColor(prompt.aiModel)}`}>
                            {prompt.aiModel}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 hidden md:table-cell">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {prompt.vectorId ? (
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {prompt.vectorId.length > 15 ? `${prompt.vectorId.substring(0, 15)}...` : prompt.vectorId}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell">
                          {prompt.mcpUrl ? (
                            <a
                              href={prompt.mcpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                            >
                              <Link className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden xl:inline">MCP Link</span>
                              <span className="xl:hidden">Link</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">No URL</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="text-xs sm:text-sm text-gray-900 max-w-xs">
                            <div className="line-clamp-2">
                              {prompt.mainPrompt.length > 80 
                                ? `${prompt.mainPrompt.substring(0, 80)}...` 
                                : prompt.mainPrompt}
                            </div>
                            {/* Show additional info on mobile */}
                            <div className="mt-2 space-y-1 md:hidden">
                              {prompt.vectorId && (
                                <div className="text-xs text-gray-500">
                                  <span className="font-medium">Vector:</span> {prompt.vectorId.substring(0, 10)}...
                                </div>
                              )}
                              {prompt.mcpUrl && (
                                <div className="text-xs text-blue-600">
                                  <Link className="w-3 h-3 inline mr-1" />
                                  Has MCP URL
                                </div>
                              )}
                              <div className="text-xs text-gray-400 sm:hidden">
                                {new Date(prompt.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {new Date(prompt.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <button
                              onClick={() => handleView(prompt)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(prompt)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Prompt"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            {/* <button
                              onClick={() => handleDelete(prompt)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Prompt"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {mainProductPrompts.length === 0 && !isLoading && (
                <div className="text-center py-8 sm:py-12 px-4">
                  <MessageSquare className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
                  <p className="text-sm sm:text-base text-gray-500 mb-4">Get started by creating your first main product prompt</p>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Add Prompt
                  </button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 px-4 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                      Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} prompts
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-900">
                        {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-4">
                  {modalMode === 'create' && 'Add New Main Product Prompt'}
                  {modalMode === 'edit' && 'Edit Main Product Prompt'}
                  {modalMode === 'view' && 'Main Product Prompt Details'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              {modalMode === 'view' ? (
                // View Mode
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">AI Model</label>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAiModelColor(selectedPrompt?.aiModel || '')}`}>
                        {selectedPrompt?.aiModel}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Vector ID</label>
                      <div className="text-sm sm:text-base text-gray-900 font-mono break-all">
                        {selectedPrompt?.vectorId || '—'}
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">MCP URL</label>
                      {selectedPrompt?.mcpUrl ? (
                        <a
                          href={selectedPrompt.mcpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 break-all text-sm sm:text-base"
                        >
                          <Link className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{selectedPrompt.mcpUrl}</span>
                        </a>
                      ) : (
                        <div className="text-gray-500 text-sm sm:text-base">No MCP URL</div>
                      )}
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Main Prompt</label>
                      <div className="text-sm sm:text-base text-gray-900 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap max-h-40 sm:max-h-60 overflow-y-auto">
                        {selectedPrompt?.mainPrompt}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 sm:pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Created Date</label>
                        <div className="text-sm sm:text-base text-gray-900">{selectedPrompt ? new Date(selectedPrompt.createdAt).toLocaleDateString() : '—'}</div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Last Updated</label>
                        <div className="text-sm sm:text-base text-gray-900">{selectedPrompt ? new Date(selectedPrompt.updatedAt).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Create/Edit Mode
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                      <div className="text-red-800 text-sm sm:text-base">{errors.general}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        AI Model *
                      </label>
                      <select
                        value={formData.aiModel}
                        onChange={(e) => setFormData(prev => ({ ...prev, aiModel: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base ${
                          errors.aiModel ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="gpt-5">GPT-5</option>
                        <option value="gpt-5-mini">GPT-5-mini</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                        <option value="claude-3-haiku">Claude 3 Haiku</option>
                      </select>
                      {errors.aiModel && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.aiModel}</div>}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Vector ID
                      </label>
                      <input
                        type="text"
                        value={formData.vectorId}
                        onChange={(e) => setFormData(prev => ({ ...prev, vectorId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-xs sm:text-sm"
                        placeholder="Enter vector ID (optional)"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        MCP URL
                      </label>
                      <input
                        type="url"
                        value={formData.mcpUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, mcpUrl: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base ${
                          errors.mcpUrl ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="https://example.com/mcp-endpoint (optional)"
                      />
                      {errors.mcpUrl && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.mcpUrl}</div>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Main Prompt *
                      </label>
                      <textarea
                        value={formData.mainPrompt}
                        onChange={(e) => setFormData(prev => ({ ...prev, mainPrompt: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base ${
                          errors.mainPrompt ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter the main prompt for product recommendations"
                        rows={4}
                      />
                      {errors.mainPrompt && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.mainPrompt}</div>}
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="border-t pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          <span className="hidden sm:inline">{modalMode === 'create' ? 'Creating...' : 'Updating...'}</span>
                          <span className="sm:hidden">{modalMode === 'create' ? 'Creating' : 'Updating'}</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">{modalMode === 'create' ? 'Create Prompt' : 'Update Prompt'}</span>
                          <span className="sm:hidden">{modalMode === 'create' ? 'Create' : 'Update'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainProductPromptPage;