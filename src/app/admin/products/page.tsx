'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  // TrendingUp,
  Calendar,
  ShieldAlert,
  Eye,
  X,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';

interface Product {
  id: string;
  name: string;
  description: string | null;
  shortName: string | null;
  fileName: string | null;
  minimumYear: number | null;
  maximumYear: number | null;
  riskType: 'CONSERVATIVE' | 'RISK_AWARE' | 'OPPORTUNITY_ORIENTED' | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    productSuggestions: number;
    aiSettings: number;
  };
  aiSettings: {
    id: string;
    model: string;
    prompt: string;
    firstMessage: string;
    vectorId: string | null;
    isActive: boolean;
  }[];
}

interface ProductFormData {
  name: string;
  description: string;
  shortName: string;
  fileName: string | null;
  minimumYear: number | null;
  maximumYear: number | null;
  riskType: 'CONSERVATIVE' | 'RISK_AWARE' | 'OPPORTUNITY_ORIENTED' | null;
  aiModel: string;
  aiPrompt: string;
  firstMessage: string;
  vectorId: string;
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  
  const router = useRouter();

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    shortName: '',
    fileName: null,
    minimumYear: null,
    maximumYear: null,
    riskType: null,
    aiModel: 'gpt-5',
    aiPrompt: '',
    firstMessage: '',
    vectorId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch products
  const fetchProducts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        riskType: riskFilter,
      });

      const response = await fetch(`/api/admin/products?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
      } else {
        if (response.status === 401) {
          router.push('/admin/signin');
        }
        console.error('Failed to fetch products:', data.error);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, riskFilter, router]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, riskFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      shortName: '',
      fileName: null,
      minimumYear: null,
      maximumYear: null,
      riskType: null,
      aiModel: 'gpt-5',
      aiPrompt: '',
      firstMessage: '',
      vectorId: '',
    });
    setErrors({});
    setUploadedFile(null);
  };

  // Open modal for create
  const handleCreate = () => {
    resetForm();
    setModalMode('create');
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (product: Product) => {
    const activeAiSetting = product.aiSettings.find(ai => ai.isActive) || product.aiSettings[0];
    setFormData({
      name: product.name,
      description: product.description || '',
      shortName: product.shortName || '',
      fileName: product.fileName,
      minimumYear: product.minimumYear,
      maximumYear: product.maximumYear,
      riskType: product.riskType,
      aiModel: activeAiSetting?.model || 'gpt-5',
      aiPrompt: activeAiSetting?.prompt || '',
      firstMessage: activeAiSetting?.firstMessage || '',
      vectorId: activeAiSetting?.vectorId || '',
    });
    setUploadedFile(product.fileName);
    setModalMode('edit');
    setSelectedProduct(product);
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for view
  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadedFile(data.data.fileName);
        setFormData(prev => ({ ...prev, fileName: data.data.fileName }));
      } else {
        setErrors(prev => ({ ...prev, fileName: data.error }));
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      setErrors(prev => ({ ...prev, fileName: 'Upload failed' }));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const url = modalMode === 'create' 
        ? '/api/admin/products'
        : `/api/admin/products/${selectedProduct?.id}`;
      
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
        fetchProducts();
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
  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        fetchProducts();
      } else {
        alert(data.error);
      }
    } catch (deleteError) {
      console.error('Delete error:', deleteError);
      alert('Failed to delete product');
    }
  };

  // Risk type mapping to German
  const riskMap: Record<string, string> = {
    CONSERVATIVE: 'Konservativ',
    RISK_AWARE: 'Ausgewogen', 
    OPPORTUNITY_ORIENTED: 'Gewinnorientiert',
  };

  // Risk type color helper
  const getRiskTypeColor = (riskType: string | null) => {
    switch (riskType) {
      case 'CONSERVATIVE': return 'bg-green-100 text-green-800';
      case 'RISK_AWARE': return 'bg-yellow-100 text-yellow-800';
      case 'OPPORTUNITY_ORIENTED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskTypeText = (riskType: string | null) => {
    return riskType ? riskMap[riskType] || 'Not Set' : 'Not Set';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AdminHeader />
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Products Overview</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your product catalog and configurations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Products</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Products</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div> */}

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Gewinnorientiert</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {products.filter(p => p.riskType === 'OPPORTUNITY_ORIENTED').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">This Month</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {products.filter(p => {
                    const productDate = new Date(p.createdAt);
                    const now = new Date();
                    return productDate.getMonth() === now.getMonth() && 
                           productDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
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
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                />
              </div>

              {/* Risk Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full sm:w-auto pl-9 sm:pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white text-sm sm:text-base"
                >
                  <option value="all">All Risk Types</option>
                  <option value="CONSERVATIVE">Konservativ</option>
                  <option value="RISK_AWARE">Ausgewogen</option>
                  <option value="OPPORTUNITY_ORIENTED">Gewinnorientiert</option>
                </select>
              </div>
            </div>

            {/* Add Product Button */}
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
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
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm">Product</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Risk Type</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden md:table-cell">Investment Horizon</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden lg:table-cell">PDF</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden xl:table-cell">Usage</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Created</th>
                      <th className="text-right p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="p-3 sm:p-4">
                          <div>
                            <div className="font-medium text-gray-900 text-sm sm:text-base">{product.name}</div>
                            {product.shortName && (
                              <div className="text-xs sm:text-sm text-gray-500">{product.shortName}</div>
                            )}
                            {product.description && (
                              <div className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                                {product.description}
                              </div>
                            )}
                            {/* Mobile-only additional info */}
                            <div className="mt-2 space-y-1 sm:hidden">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTypeColor(product.riskType)}`}>
                                  {getRiskTypeText(product.riskType)}
                                </span>
                              </div>
                              {(product.minimumYear !== null || product.maximumYear !== null) && (
                                <div className="text-xs text-gray-500">
                                  Horizon: {product.minimumYear !== null ? `${product.minimumYear}` : '0'} - {product.maximumYear !== null ? `${product.maximumYear}` : '∞'} years
                                </div>
                              )}
                              <div className="text-xs text-gray-400">
                                {new Date(product.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTypeColor(product.riskType)}`}>
                            {getRiskTypeText(product.riskType)}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4 hidden md:table-cell">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {product.minimumYear !== null || product.maximumYear !== null ? (
                              <>
                                {product.minimumYear !== null ? `${product.minimumYear}` : '0'} - {product.maximumYear !== null ? `${product.maximumYear}` : '∞'} years
                              </>
                            ) : (
                              '—'
                            )}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell">
                          {product.fileName ? (
                            <a
                              href={product.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                            >
                              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden xl:inline">View PDF</span>
                              <span className="xl:hidden">PDF</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">No PDF</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 hidden xl:table-cell">
                          <div className="text-xs sm:text-sm text-gray-900">
                            <div>{product._count.productSuggestions} suggestions</div>
                            <div className="text-gray-500">{product._count.aiSettings} AI configs</div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 hidden sm:table-cell">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {new Date(product.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <button
                              onClick={() => handleView(product)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {products.length === 0 && !isLoading && (
                <div className="text-center py-8 sm:py-12 px-4">
                  <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-sm sm:text-base text-gray-500 mb-4">Get started by creating your first product</p>
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Add Product
                  </button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 px-4 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                      Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} products
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg lg:max-w-2xl xl:max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {modalMode === 'create' && 'Add New Product'}
                  {modalMode === 'edit' && 'Edit Product'}
                  {modalMode === 'view' && 'Product Details'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              {modalMode === 'view' ? (
                // View Mode
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                      <div className="text-gray-900">{selectedProduct?.name}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Short Name</label>
                      <div className="text-gray-900">{selectedProduct?.shortName || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <div className="text-gray-900">{selectedProduct?.description || '—'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Investment Horizon</label>
                      <div className="text-gray-900">{selectedProduct?.minimumYear !== null ? `${selectedProduct?.minimumYear} years` : '—'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Investment Horizon</label>
                      <div className="text-gray-900">{selectedProduct?.maximumYear !== null ? `${selectedProduct?.maximumYear} years` : '—'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Risk Type</label>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTypeColor(selectedProduct?.riskType || null)}`}>
                          {getRiskTypeText(selectedProduct?.riskType || null)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
                      <div className="text-gray-900">
                        {selectedProduct?.aiSettings?.find(ai => ai.isActive)?.model || selectedProduct?.aiSettings?.[0]?.model || '—'}
                      </div>
                    </div>
                    {/* <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vector ID</label>
                      <div className="text-gray-900">
                        {selectedProduct?.aiSettings?.find(ai => ai.isActive)?.vectorId || selectedProduct?.aiSettings?.[0]?.vectorId || '—'}
                      </div>
                    </div> */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Prompt</label>
                      <div className="text-gray-900 bg-gray-50 rounded-lg p-3 text-sm">
                        {selectedProduct?.aiSettings?.find(ai => ai.isActive)?.prompt || selectedProduct?.aiSettings?.[0]?.prompt || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PDF Document</label>
                      {selectedProduct?.fileName ? (
                        <a
                          href={selectedProduct.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="w-4 h-4" />
                          View PDF
                        </a>
                      ) : (
                        <div className="text-gray-500">No PDF uploaded</div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Suggestions</label>
                        <div className="text-2xl font-bold text-gray-900">{selectedProduct?._count.productSuggestions}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">AI Configurations</label>
                        <div className="text-2xl font-bold text-gray-900">{selectedProduct?._count.aiSettings}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Created Date</label>
                        <div className="text-gray-900">{selectedProduct ? new Date(selectedProduct.createdAt).toLocaleDateString() : '—'}</div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter product name"
                      />
                      {errors.name && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.name}</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Short Name
                      </label>
                      <input
                        type="text"
                        value={formData.shortName}
                        onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                        placeholder="Enter short name"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                        placeholder="Enter product description"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Investment Horizon (Years)
                      </label>
                      <input
                        type="number"
                        value={formData.minimumYear || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          minimumYear: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        min="0"
                        max="50"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base ${
                          errors.minimumYear ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="e.g., 0 (immediate)"
                      />
                      {errors.minimumYear && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.minimumYear}</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Investment Horizon (Years)
                      </label>
                      <input
                        type="number"
                        value={formData.maximumYear || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          maximumYear: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                        placeholder="e.g., 7"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Risk Type
                      </label>
                      <select
                        value={formData.riskType || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          riskType: (e.target.value as 'CONSERVATIVE' | 'RISK_AWARE' | 'OPPORTUNITY_ORIENTED') || null
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                      >
                        <option value="">Select Risk Type</option>
                        <option value="CONSERVATIVE">Konservativ</option>
                        <option value="RISK_AWARE">Ausgewogen</option>
                        <option value="OPPORTUNITY_ORIENTED">Gewinnorientiert</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Prompt *
                      </label>
                      <textarea
                        value={formData.aiPrompt}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          aiPrompt: e.target.value
                        }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base ${
                          errors.aiPrompt ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter AI prompt for product recommendations"
                        rows={4}
                      />
                      {errors.aiPrompt && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.aiPrompt}</div>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Message *
                      </label>
                      <textarea
                        value={formData.firstMessage}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          firstMessage: e.target.value
                        }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base ${
                          errors.firstMessage ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter first message for product recommendations"
                        rows={4}
                      />
                      {errors.firstMessage && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.firstMessage}</div>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product PDF
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6">
                        {uploadedFile ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                              <span className="text-xs sm:text-sm text-gray-900">PDF uploaded</span>
                              <a
                                href={uploadedFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                              >
                                View
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedFile(null);
                                setFormData(prev => ({ ...prev, fileName: null }));
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-xs sm:text-sm text-gray-600 mb-2">
                              Click to upload or drag and drop a PDF file
                            </div>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                              }}
                              className="hidden"
                              id="pdf-upload"
                            />
                            <label
                              htmlFor="pdf-upload"
                              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-xs sm:text-sm"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                                  Choose File
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                      {errors.fileName && <div className="text-red-600 text-xs sm:text-sm mt-1">{errors.fileName}</div>}
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="border-t pt-4 sm:pt-6 flex flex-col sm:flex-row items-center gap-3 sm:justify-end">
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
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {modalMode === 'create' ? 'Creating...' : 'Updating...'}
                        </>
                      ) : (
                        <>
                          {modalMode === 'create' ? 'Create Product' : 'Update Product'}
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

export default ProductsPage;
