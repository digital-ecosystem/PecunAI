'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Loader2,
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  TrendingUp
} from 'lucide-react';
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

const ViewProductPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          credentials: 'include',
        });

        const data = await response.json();

        if (data.success) {
          setProduct(data.data);
        } else {
          if (response.status === 401) {
            router.push('/admin/signin');
          } else {
            setError(data.error);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router]);

  // Risk type mapping
  const riskMap: Record<string, string> = {
    CONSERVATIVE: 'Konservativ',
    RISK_AWARE: 'Ausgewogen', 
    OPPORTUNITY_ORIENTED: 'Gewinnorientiert',
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <AdminHeader />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <AdminHeader />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
            <div className="text-red-800">{error || 'Product not found'}</div>
          </div>
        </div>
      </div>
    );
  }

  const activeAiSetting = product.aiSettings.find(ai => ai.isActive) || product.aiSettings[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <AdminHeader />
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/products')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm sm:text-base">Back to Products</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-sm sm:text-base text-gray-600">Product details and configuration</p>
            </div>
            <button
              onClick={() => router.push(`/admin/products/${productId}/edit`)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Product
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Product Suggestions</p>
                <p className="text-2xl font-bold text-gray-900">{product._count.productSuggestions}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Configurations</p>
                <p className="text-2xl font-bold text-gray-900">{product._count.aiSettings}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Date(product.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Product Name</label>
                  <div className="text-gray-900">{product.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Short Name</label>
                  <div className="text-gray-900">{product.shortName || '—'}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                  <div className="text-gray-900">{product.description || '—'}</div>
                </div>
              </div>
            </div>

            {/* Investment Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Minimum Investment Horizon</label>
                  <div className="text-gray-900">
                    {product.minimumYear !== null ? `${product.minimumYear} years` : '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Maximum Investment Horizon</label>
                  <div className="text-gray-900">
                    {product.maximumYear !== null ? `${product.maximumYear} years` : '—'}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Risk Type</label>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskTypeColor(product.riskType)}`}>
                      {getRiskTypeText(product.riskType)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Configuration */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">AI Model</label>
                  <div className="text-gray-900">{activeAiSetting?.model || '—'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Product Prompt</label>
                  <div className="text-gray-900 bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {activeAiSetting?.prompt || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">First Message</label>
                  <div className="text-gray-900 bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {activeAiSetting?.firstMessage || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Document</h2>
              {product.fileName ? (
                <a
                  href={product.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Product PDF</div>
                    <div className="text-sm text-gray-500">Click to view</div>
                  </div>
                </a>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <div className="text-sm">No PDF uploaded</div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Product ID</label>
                  <div className="text-xs text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">
                    {product.id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Created At</label>
                  <div className="text-gray-900">
                    {new Date(product.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Last Updated</label>
                  <div className="text-gray-900">
                    {new Date(product.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProductPage;
