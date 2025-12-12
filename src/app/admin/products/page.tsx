'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  ShieldAlert,
  Eye,
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
  riskType: 'KONSERVATIV' | 'AUSGEWOHGEN' | 'GEWINNORIENTIERT' | null;
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
  };
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

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

  // Handle delete
  const handleDelete = async (product: Product) => {
    if (!confirm(`Sind Sie sicher, dass Sie "${product.name}" löschen möchten?`)) {
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
      alert('Produkt konnte nicht gelöscht werden');
    }
  };

  // Risk type mapping to German
  const riskMap: Record<string, string> = {
    KONSERVATIV: 'Konservativ',
    AUSGEWOHGEN: 'Ausgewogen',
    GEWINNORIENTIERT: 'Gewinnorientiert',
  };

  // Risk type color helper
  const getRiskTypeColor = (riskType: string | null) => {
    switch (riskType) {
      case 'KONSERVATIV': return 'bg-green-100 text-green-800';
      case 'AUSGEWOHGEN': return 'bg-yellow-100 text-yellow-800';
      case 'GEWINNORIENTIERT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskTypeText = (riskType: string | null) => {
    return riskType ? riskMap[riskType] || 'Nicht festgelegt' : 'Nicht festgelegt';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AdminHeader />
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Produktübersicht</h1>
          <p className="text-sm sm:text-base text-gray-600">Verwalten Sie Ihren Produktkatalog und Konfigurationen</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Gesamtprodukte</p>
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
                  {products.filter(p => p.riskType === 'GEWINNORIENTIERT').length}
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
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Diesen Monat</p>
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
                  placeholder="Produkte suchen..."
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
                  <option value="all">Alle Risikotypen</option>
                  <option value="KONSERVATIV">Konservativ</option>
                  <option value="AUSGEWOHGEN">Ausgewogen</option>
                  <option value="GEWINNORIENTIERT">Gewinnorientiert</option>
                </select>
              </div>
            </div>

            {/* Add Product Button */}
            <button
              onClick={() => router.push('/admin/products/add')}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Produkt hinzufügen</span>
              <span className="sm:hidden">Hinzufügen</span>
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
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm">Produkt</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Risikotyp</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden md:table-cell">Anlagehorizont</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden lg:table-cell">PDF</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden xl:table-cell">Nutzung</th>
                      <th className="text-left p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm hidden sm:table-cell">Erstellt</th>
                      <th className="text-right p-3 sm:p-4 font-medium text-gray-700 text-xs sm:text-sm">Aktionen</th>
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
                                  Horizont: {product.minimumYear !== null ? `${product.minimumYear}` : '0'} - {product.maximumYear !== null ? `${product.maximumYear}` : '∞'} Jahre
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
                                {product.minimumYear !== null ? `${product.minimumYear}` : '0'} - {product.maximumYear !== null ? `${product.maximumYear}` : '∞'} Jahre
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
                              <span className="hidden xl:inline">PDF anzeigen</span>
                              <span className="xl:hidden">PDF</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">Kein PDF</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 hidden xl:table-cell">
                          <div className="text-xs sm:text-sm text-gray-900">
                            <div>{product._count.productSuggestions} Vorschläge</div>
                            <div className="text-gray-500">{product._count.aiSettings} KI-Konfigurationen</div>
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
                              onClick={() => router.push(`/admin/products/${product.id}`)}
                              className="p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
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
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Keine Produkte gefunden</h3>
                  <p className="text-sm sm:text-base text-gray-500 mb-4">Beginnen Sie mit der Erstellung Ihres ersten Produkts</p>
                  <button
                    onClick={() => router.push('/admin/products/add')}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Produkt hinzufügen
                  </button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 px-4 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                      Zeige {((currentPage - 1) * 10) + 1} bis {Math.min(currentPage * 10, totalCount)} von {totalCount} Produkten
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
                        {currentPage} von {totalPages}
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
    </div>
  );
};

export default ProductsPage;
