'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Upload,
  FileText,
  X,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';

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

const EditProductPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          credentials: 'include',
        });

        const data = await response.json();

        if (data.success) {
          const product = data.data;
          const activeAiSetting = product.aiSettings.find((ai: { isActive: boolean }) => ai.isActive) || product.aiSettings[0];

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
        } else {
          if (response.status === 401) {
            router.push('/admin/signin');
          } else {
            setErrors({ general: data.error });
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setErrors({ general: 'Produkt konnte nicht geladen werden' });
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router]);

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
      setErrors(prev => ({ ...prev, fileName: 'Hochladen fehlgeschlagen' }));
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
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/products');
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
      setErrors({ general: 'Ein Fehler ist aufgetreten' });
    } finally {
      setIsSubmitting(false);
    }
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
            <span className="text-sm sm:text-base">Zurück zu Produkten</span>
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Produkt bearbeiten</h1>
          <p className="text-sm sm:text-base text-gray-600">Produktdetails und KI-Konfiguration aktualisieren</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8 max-w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800 text-sm">{errors.general}</div>
              </div>
            )}

            {/* Product Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Produktinformationen</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produktname *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="Produktnamen eingeben"
                  />
                  {errors.name && <div className="text-red-600 text-sm mt-1">{errors.name}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kurzname
                  </label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Kurznamen eingeben"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Produktbeschreibung eingeben"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Investment Details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Anlagedetails</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mindestanlagehorizont (Jahre)
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
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${errors.minimumYear ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="z.B. 0 (sofort)"
                  />
                  {errors.minimumYear && <div className="text-red-600 text-sm mt-1">{errors.minimumYear}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximaler Anlagehorizont (Jahre)
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="z.B. 7"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Risikotyp
                  </label>
                  <select
                    value={formData.riskType || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      riskType: (e.target.value as 'CONSERVATIVE' | 'RISK_AWARE' | 'OPPORTUNITY_ORIENTED') || null
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Risikotyp auswählen</option>
                    <option value="CONSERVATIVE">Konservativ</option>
                    <option value="RISK_AWARE">Ausgewogen</option>
                    <option value="OPPORTUNITY_ORIENTED">Gewinnorientiert</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Configuration */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">KI-Konfiguration</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produkt-Prompt *
                  </label>
                  <textarea
                    value={formData.aiPrompt}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aiPrompt: e.target.value
                    }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${errors.aiPrompt ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="KI-Prompt für Produktempfehlungen eingeben"
                    rows={4}
                  />
                  {errors.aiPrompt && <div className="text-red-600 text-sm mt-1">{errors.aiPrompt}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Erste Nachricht *
                  </label>
                  <textarea
                    value={formData.firstMessage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      firstMessage: e.target.value
                    }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${errors.firstMessage ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="Erste Nachricht für Produktempfehlungen eingeben"
                    rows={4}
                  />
                  {errors.firstMessage && <div className="text-red-600 text-sm mt-1">{errors.firstMessage}</div>}
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Produktdokument</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {uploadedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-900">PDF hochgeladen</span>
                      <a
                        href={uploadedFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Ansehen
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
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 mb-2">
                      Klicken zum Hochladen oder PDF-Datei hierher ziehen
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
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Wird hochgeladen...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Datei auswählen
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
              {errors.fileName && <div className="text-red-600 text-sm mt-1">{errors.fileName}</div>}
            </div>

            {/* Form Actions */}
            <div className="border-t pt-6 flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aktualisieren...
                  </>
                ) : (
                  'Produkt aktualisieren'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;
