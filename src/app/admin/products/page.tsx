'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  ShieldAlert,
  Eye,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Product {
  id: string;
  name: string;
  description: string | null;
  shortName: string | null;
  fileName: string | null;
  minimumYear: number | null;
  maximumYear: number | null;
  riskType: 'KONSERVATIV' | 'AUSGEWOGEN' | 'GEWINNORIENTIERT' | null;
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

/** The four risk filters, lifted verbatim from the former `<select>`'s options. */
const RISK_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Alle Risikotypen' },
  { value: 'KONSERVATIV', label: 'Konservativ' },
  { value: 'AUSGEWOGEN', label: 'Ausgewogen' },
  { value: 'GEWINNORIENTIERT', label: 'Gewinnorientiert' },
];

const ICON_BTN_CLASS =
  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary transition-colors hover:bg-surface-raised focus:outline-none focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

const COL_HEADER_CLASS = 'text-[9px] uppercase tracking-wider text-text-muted';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // The product whose delete confirmation is open — null when no dialog is up.
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);

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

  // Handle delete — the row button now opens the in-app confirmation dialog
  // instead of a native `window.confirm()`. Same trigger, same question.
  const handleDelete = (product: Product) => {
    setProductPendingDelete(product);
  };

  // Runs only on an explicit "Löschen" in that dialog — the branch the old
  // `confirm()` gated. Dialog closes first, exactly as the native prompt did
  // before the fetch began; the request and both result branches are untouched.
  const confirmDelete = async () => {
    const product = productPendingDelete;
    if (!product) return;
    setProductPendingDelete(null);

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
    AUSGEWOGEN: 'Ausgewogen',
    GEWINNORIENTIERT: 'Gewinnorientiert',
  };

  // Risk type color helper — the risk axis is not the review-status axis:
  // Konservativ shares the approved green, the two higher steps use the
  // dedicated risk tokens, and an unset type falls back to neutral.
  const getRiskTypeColor = (riskType: string | null) => {
    switch (riskType) {
      case 'KONSERVATIV': return 'bg-status-approved text-status-approved-fg';
      case 'AUSGEWOGEN': return 'bg-risk-balanced text-risk-balanced-fg';
      case 'GEWINNORIENTIERT': return 'bg-risk-growth text-risk-growth-fg';
      default: return 'bg-status-neutral text-status-neutral-fg';
    }
  };

  const getRiskTypeText = (riskType: string | null) => {
    return riskType ? riskMap[riskType] || 'Nicht festgelegt' : 'Nicht festgelegt';
  };

  const hasActiveFilters = searchTerm.trim() !== '' || riskFilter !== 'all';

  return (
    <AdminDashboardShell contentClassName="max-w-[1180px]">
      {/* KPI row — three flat, equal cards. This page carries three metrics, so it
          deliberately does not use the five-metric hero composition of the other
          admin surfaces. */}
      <div className="mb-8 flex flex-wrap gap-3">
        <StatCard
          label="Gesamtprodukte"
          value={totalCount}
          icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-surface-subtle text-accent-primary"
        />
        <StatCard
          label="Gewinnorientiert"
          value={products.filter(p => p.riskType === 'GEWINNORIENTIERT').length}
          icon={<ShieldAlert className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-risk-growth text-risk-growth-fg"
        />
        <StatCard
          label="Diesen Monat"
          value={products.filter(p => {
            const productDate = new Date(p.createdAt);
            const now = new Date();
            return productDate.getMonth() === now.getMonth() &&
              productDate.getFullYear() === now.getFullYear();
          }).length}
          icon={<Calendar className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-violet text-violet-fg"
        />
      </div>

      {/* Search · risk filter · add product */}
      <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
        <div className="relative flex-[2] min-w-[220px] max-lg:basis-full">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Produkte suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[14px] bg-surface-card py-2.5 pl-10 pr-3.5 text-xs text-text-primary shadow-soft outline-none placeholder:text-text-muted focus:shadow-focus-ring"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 max-lg:basis-full">
          {RISK_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRiskFilter(option.value)}
              aria-pressed={riskFilter === option.value}
              className={`rounded-xl px-3 py-2 text-[11px] transition-shadow max-lg:flex-1 max-lg:text-center ${riskFilter === option.value
                ? 'bg-accent-primary text-text-on-accent'
                : 'bg-surface-card text-text-primary shadow-soft hover:shadow-raised'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push('/admin/products/add')}
          className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-accent-primary px-4 py-2.5 text-xs font-semibold text-text-on-accent shadow-soft transition-colors hover:bg-accent-primary-hov max-lg:basis-full max-lg:justify-center"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Produkt hinzufügen</span>
          <span className="sm:hidden">Hinzufügen</span>
        </button>
      </div>

      {/* Products list */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-[14px] bg-surface-card px-5 py-12 shadow-soft">
          <Loader2 className="h-7 w-7 animate-spin text-accent-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center rounded-[14px] bg-surface-card px-5 py-8 text-center shadow-soft">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-subtle text-accent-primary">
            <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <div className="mb-1 text-[13px] font-semibold text-text-primary">Keine Produkte gefunden</div>
          {hasActiveFilters ? (
            <div className="max-w-[280px] text-[11px] text-text-muted">
              Versuchen Sie, Ihre Such- oder Filterkriterien anzupassen.
            </div>
          ) : (
            <>
              <div className="mb-4 max-w-[280px] text-[11px] text-text-muted">
                Beginnen Sie mit der Erstellung Ihres ersten Produkts
              </div>
              <button
                onClick={() => router.push('/admin/products/add')}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-xs font-semibold text-text-on-accent shadow-soft transition-colors hover:bg-accent-primary-hov"
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Produkt hinzufügen
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Column headers — seven labelled columns, hidden below lg where the
              rows reflow into two-column cards. */}
          <div className="mb-0.5 hidden items-center gap-4 px-[18px] lg:flex">
            <div className={`min-w-[220px] flex-[2.2] ${COL_HEADER_CLASS}`}>Produkt</div>
            <div className={`flex-[0.9] ${COL_HEADER_CLASS}`}>Risikotyp</div>
            <div className={`flex-[0.9] ${COL_HEADER_CLASS}`}>Anlagehorizont</div>
            <div className={`flex-[0.8] ${COL_HEADER_CLASS}`}>PDF</div>
            <div className={`flex-1 ${COL_HEADER_CLASS}`}>Nutzung</div>
            <div className={`flex-[0.8] ${COL_HEADER_CLASS}`}>Erstellt</div>
            <div className={`flex-[0.7] text-right ${COL_HEADER_CLASS}`}>Aktionen</div>
          </div>

          <div className="flex flex-col gap-2.5">
            {products.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-2 items-start gap-x-3.5 gap-y-2.5 rounded-[14px] bg-surface-card p-[18px] shadow-soft transition-shadow hover:shadow-raised lg:flex lg:items-center lg:gap-4"
              >
                <div className="col-span-2 min-w-0 lg:min-w-[220px] lg:flex-[2.2]">
                  <div className="text-sm font-semibold text-text-primary">{product.name}</div>
                  {product.shortName && (
                    <div className="mb-1 text-[10px] text-text-muted">{product.shortName}</div>
                  )}
                  {product.description && (
                    <div className="line-clamp-2 text-[11px] leading-relaxed text-text-muted" title={product.description}>
                      {product.description}
                    </div>
                  )}
                </div>

                <div className="lg:flex-[0.9]">
                  <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-medium ${getRiskTypeColor(product.riskType)}`}>
                    {getRiskTypeText(product.riskType)}
                  </span>
                </div>

                <div className="text-[11px] text-text-primary max-lg:text-right lg:flex-[0.9]">
                  {product.minimumYear !== null || product.maximumYear !== null ? (
                    <>
                      {product.minimumYear !== null ? `${product.minimumYear}` : '0'} - {product.maximumYear !== null ? `${product.maximumYear}` : '∞'} Jahre
                    </>
                  ) : (
                    '—'
                  )}
                </div>

                <div className="min-w-0 lg:flex-[0.8]">
                  {product.fileName ? (
                    <a
                      href={`/api/products/file/${product.fileName.replace(/^\/products\//, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-accent-primary transition-colors hover:text-accent-primary-hov"
                    >
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
                      <span className="hidden xl:inline">PDF anzeigen</span>
                      <span className="xl:hidden">PDF</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-text-muted">Kein PDF</span>
                  )}
                </div>

                <div className="col-span-2 rounded-[10px] text-[11px] leading-relaxed text-text-muted max-lg:order-6 max-lg:bg-surface-subtle max-lg:px-2.5 max-lg:py-2 lg:flex-1">
                  <div>
                    <span className="font-semibold tabular-nums text-text-primary">{product._count.productSuggestions}</span> Vorschläge
                  </div>
                  <div>
                    <span className="font-semibold tabular-nums text-text-primary">{product._count.aiSettings}</span> KI-Konfigurationen
                  </div>
                </div>

                <div className="text-[11px] tabular-nums text-text-muted max-lg:order-5 max-lg:text-right lg:flex-[0.8]">
                  {new Date(product.createdAt).toLocaleDateString()}
                </div>

                <div className="col-span-2 flex items-center gap-1.5 max-lg:order-7 max-lg:border-t max-lg:border-line-soft max-lg:pt-2.5 lg:flex-[0.7] lg:justify-end">
                  <button
                    onClick={() => router.push(`/admin/products/${product.id}`)}
                    className={ICON_BTN_CLASS}
                    title="View Details"
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                    className={ICON_BTN_CLASS}
                    title="Edit Product"
                  >
                    <Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className={`${ICON_BTN_CLASS} hover:bg-status-flagged hover:text-status-flagged-fg`}
                    title="Delete Product"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-2.5 flex items-center justify-center gap-2 rounded-[14px] bg-surface-card px-[18px] py-3 shadow-soft">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Vorherige Seite"
                className={ICON_BTN_CLASS}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <span className="px-2 text-[11px] font-medium tabular-nums text-text-primary">
                {currentPage} von {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                aria-label="Nächste Seite"
                className={ICON_BTN_CLASS}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation — replaces the native `window.confirm()` this page
          used to call inside `handleDelete`. Same question, same wording. */}
      {productPendingDelete && (
        <ConfirmDialog
          title="Produkt löschen"
          message={
            <>
              Sind Sie sicher, dass Sie{' '}
              <strong className="font-semibold">&bdquo;{productPendingDelete.name}&ldquo;</strong>{' '}
              löschen möchten?
            </>
          }
          confirmLabel="Löschen"
          onConfirm={confirmDelete}
          onCancel={() => setProductPendingDelete(null)}
        />
      )}
    </AdminDashboardShell>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  iconClassName,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClassName: string;
}) => (
  <div className="flex min-w-[180px] flex-1 items-center gap-3.5 rounded-[14px] bg-surface-card px-[18px] py-4 shadow-soft transition-shadow hover:shadow-raised max-sm:basis-full">
    <div className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="mb-[3px] truncate text-xs text-text-muted">{label}</div>
      <div className="text-[22px] font-semibold leading-none tabular-nums text-text-primary">{value}</div>
    </div>
  </div>
);

export default ProductsPage;
