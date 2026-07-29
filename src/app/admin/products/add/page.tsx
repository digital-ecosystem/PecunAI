'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  X,
  Loader2,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';

interface ProductFormData {
  name: string;
  description: string;
  shortName: string;
  fileName: string | null;
  minimumYear: number | null;
  maximumYear: number | null;
  riskType: 'KONSERVATIV' | 'AUSGEWOGEN' | 'GEWINNORIENTIERT' | null;
  aiModel: string;
  aiPrompt: string;
  firstMessage: string;
  vectorId: string;
}

const AddProductPage = () => {
  const router = useRouter();
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
      const response = await fetch('/api/admin/products', {
        method: 'POST',
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

  return (
    <AdminDashboardShell contentClassName="max-w-[1180px]">
      <button
        type="button"
        onClick={() => router.push('/admin/products')}
        className="mb-4 flex w-fit items-center gap-1.5 text-[12px] text-text-muted transition-colors hover:text-accent-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Zurück zu Produkten
      </button>

      <form onSubmit={handleSubmit}>
        <div className="rounded-[16px] bg-surface-card p-5 shadow-soft sm:p-6 lg:px-[30px] lg:py-7">
          {errors.general && (
            <div className="mb-6 rounded-[10px] border border-status-flagged-border bg-status-flagged p-4 text-sm text-status-flagged-fg">
              {errors.general}
            </div>
          )}

          {/* Product Information */}
          <div>
            <h2 className="mb-4 text-[15px] font-bold text-text-primary">Produktinformationen</h2>
            <div className="mb-[18px] flex flex-wrap gap-[18px]">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Produktname <span className="text-accent-primary">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full rounded-[10px] border ${errors.name ? 'border-status-flagged-border' : 'border-surface-raised'} bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring`}
                  placeholder="Produktnamen eingeben"
                />
                {errors.name && <div className="mt-1 text-xs text-status-flagged-fg">{errors.name}</div>}
              </div>

              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Kurzname
                </label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                  className="w-full rounded-[10px] border border-surface-raised bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring"
                  placeholder="Kurznamen eingeben"
                />
              </div>
            </div>

            <div className="mb-[18px] flex flex-wrap gap-[18px]">
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[70px] w-full resize-y rounded-[10px] border border-surface-raised bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring"
                  placeholder="Produktbeschreibung eingeben"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="mt-7 border-t border-surface-subtle pt-6">
            <h2 className="mb-4 text-[15px] font-bold text-text-primary">Anlagedetails</h2>
            <div className="mb-[18px] flex flex-wrap gap-[18px]">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
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
                  className={`w-full rounded-[10px] border ${errors.minimumYear ? 'border-status-flagged-border' : 'border-surface-raised'} bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring`}
                  placeholder="z.B. 0 (sofort)"
                />
                {errors.minimumYear && <div className="mt-1 text-xs text-status-flagged-fg">{errors.minimumYear}</div>}
              </div>

              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
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
                  max="1000"
                  className="w-full rounded-[10px] border border-surface-raised bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring"
                  placeholder="z.B. 7"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-[18px]">
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Risikotyp
                </label>
                <div className="relative">
                  <select
                    value={formData.riskType || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      riskType: (e.target.value as 'KONSERVATIV' | 'AUSGEWOGEN' | 'GEWINNORIENTIERT') || null
                    }))}
                    className="w-full appearance-none rounded-[10px] border border-surface-raised bg-surface-card px-3 py-2.5 pr-8 text-xs text-text-primary outline-none transition-colors focus:border-accent-primary focus:shadow-focus-ring"
                  >
                    <option value="">Risikotyp auswählen</option>
                    <option value="KONSERVATIV">Konservativ</option>
                    <option value="AUSGEWOGEN">Ausgewogen</option>
                    <option value="GEWINNORIENTIERT">Gewinnorientiert</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
                </div>
              </div>
            </div>
          </div>

          {/* AI Configuration */}
          <div className="mt-7 border-t border-surface-subtle pt-6">
            <h2 className="mb-4 text-[15px] font-bold text-text-primary">KI-Konfiguration</h2>
            <div className="mb-[18px] flex flex-wrap gap-[18px]">
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Produkt-Prompt <span className="text-accent-primary">*</span>
                </label>
                <textarea
                  value={formData.aiPrompt}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    aiPrompt: e.target.value
                  }))}
                  className={`min-h-[90px] w-full resize-y rounded-[10px] border ${errors.aiPrompt ? 'border-status-flagged-border' : 'border-surface-raised'} bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring`}
                  placeholder="KI-Prompt für Produktempfehlungen eingeben"
                  rows={4}
                />
                {errors.aiPrompt && <div className="mt-1 text-xs text-status-flagged-fg">{errors.aiPrompt}</div>}
              </div>
            </div>

            <div className="flex flex-wrap gap-[18px]">
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-semibold text-text-primary">
                  Erste Nachricht <span className="text-accent-primary">*</span>
                </label>
                <textarea
                  value={formData.firstMessage}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    firstMessage: e.target.value
                  }))}
                  className={`min-h-[90px] w-full resize-y rounded-[10px] border ${errors.firstMessage ? 'border-status-flagged-border' : 'border-surface-raised'} bg-surface-card px-3 py-2.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:shadow-focus-ring`}
                  placeholder="Erste Nachricht für Produktempfehlungen eingeben"
                  rows={4}
                />
                {errors.firstMessage && <div className="mt-1 text-xs text-status-flagged-fg">{errors.firstMessage}</div>}
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="mt-7 border-t border-surface-subtle pt-6">
            <h2 className="mb-4 text-[15px] font-bold text-text-primary">Produktdokument</h2>
            {uploadedFile ? (
              <div className="flex items-center gap-3 rounded-[12px] border border-surface-raised px-3.5 py-3">
                <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] bg-surface-subtle text-accent-primary">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="flex-1 text-xs font-semibold text-text-primary">
                  PDF hochgeladen{' '}
                  <a
                    href={uploadedFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent-primary hover:text-accent-primary-hov"
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
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text-primary transition-colors hover:bg-status-flagged hover:text-status-flagged-fg"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-surface-raised px-5 py-9 text-center">
                <Upload className="h-5 w-5 text-text-muted" strokeWidth={1.75} />
                <div className="text-xs text-text-muted">
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
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-accent-primary px-4 py-[9px] text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hov"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Datei auswählen
                    </>
                  )}
                </label>
              </div>
            )}
            {errors.fileName && <div className="mt-1 text-xs text-status-flagged-fg">{errors.fileName}</div>}
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5 max-sm:flex-col-reverse">
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="rounded-[10px] bg-surface-subtle px-5 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface-raised max-sm:w-full"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-accent-primary px-5 py-2.5 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hov disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                Erstellen...
              </>
            ) : (
              'Produkt erstellen'
            )}
          </button>
        </div>
      </form>
    </AdminDashboardShell>
  );
};

export default AddProductPage;
