'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Loader2,
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import AdminDashboardShell from '@/components/admin/AdminDashboardShell';
import StatusBadge from '@/components/ui/StatusBadge';

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
  }[];
}

/** Prototype's `.detail-card` / `.detail-card-title`. */
const CARD_CLASS = 'rounded-[16px] bg-surface-card px-6 py-[22px] shadow-soft';
const CARD_TITLE_CLASS = 'mb-4 text-[15px] font-bold text-text-primary';

/** Prototype's `.detail-field-label` / `.detail-field-value`. */
const FIELD_LABEL_CLASS = 'mb-1 text-[11px] text-text-muted';
const FIELD_VALUE_CLASS = 'text-[13px] leading-relaxed text-text-primary';

/** Prototype's `.detail-prompt-box` — prompt text gets the code-adjacent register. */
const PROMPT_BOX_CLASS =
  'max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-[10px] bg-surface-subtle px-4 py-3.5 font-mono text-[11.5px] leading-relaxed text-text-primary';

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
        setError('Produkt konnte nicht geladen werden');
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
    KONSERVATIV: 'Konservativ',
    AUSGEWOGEN: 'Ausgewogen',
    GEWINNORIENTIERT: 'Gewinnorientiert',
  };

  // Risk type is its own semantic axis, not a status: Konservativ shares the
  // approved green (the one sanctioned crossover), the two higher steps use the
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
    return riskType ? riskMap[riskType] || 'Not Set' : 'Not Set';
  };

  if (isLoading) {
    return (
      <AdminDashboardShell contentClassName="max-w-[1180px]">
        <div className="flex items-center justify-center rounded-[14px] bg-surface-card px-5 py-12 shadow-soft">
          <Loader2 className="h-7 w-7 animate-spin text-accent-primary" />
        </div>
      </AdminDashboardShell>
    );
  }

  if (error || !product) {
    return (
      <AdminDashboardShell contentClassName="max-w-[1180px]">
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[14px] border border-status-flagged-border bg-surface-card px-5 py-8 text-center shadow-soft">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-status-flagged text-status-flagged-fg">
            <AlertCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <div className="text-[13px] font-semibold text-status-flagged-fg">{error || 'Produkt nicht gefunden'}</div>
        </div>
      </AdminDashboardShell>
    );
  }

  const activeAiSetting = product.aiSettings.find(ai => ai.isActive) || product.aiSettings[0];

  return (
    <AdminDashboardShell
      contentClassName="max-w-[1180px]"
      title={product.name}
      subtitle="Produktdetails und Konfiguration"
    >
      {/* Back link + the page's one primary action. The prototype puts the edit
          button in the header row's right slot, which the shared shell reserves
          for the profile pill — so it pairs with the back link instead. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="flex w-fit items-center gap-1.5 text-[12px] text-text-muted transition-colors hover:text-accent-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Zurück zu Produkten
        </button>
        <button
          onClick={() => router.push(`/admin/products/${productId}/edit`)}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent-primary px-[18px] py-2.5 text-xs font-semibold text-text-on-accent shadow-soft transition-colors hover:bg-accent-primary-hov max-sm:w-full"
        >
          <Edit className="h-4 w-4" strokeWidth={1.75} />
          Produkt bearbeiten
        </button>
      </div>

      {/* Stat row — three flat, equal cards, value left of the icon chip. */}
      <div className="mb-5 flex flex-wrap gap-3">
        <DetailStatCard
          label="Produktvorschläge"
          value={product._count.productSuggestions}
          icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-surface-subtle text-accent-primary"
        />
        <DetailStatCard
          label="KI-Konfigurationen"
          value={product._count.aiSettings}
          icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-violet text-violet-fg"
        />
        <DetailStatCard
          label="Erstellt"
          value={new Date(product.createdAt).toLocaleDateString()}
          valueClassName="text-base"
          icon={<Calendar className="h-4 w-4" strokeWidth={1.75} />}
          iconClassName="bg-status-approved text-status-approved-fg"
        />
      </div>

      {/* Two columns: details 2fr, metadata 1fr, stacked below lg. */}
      <div className="flex flex-wrap items-start gap-4">
        {/* Product information */}
        <div className="flex min-w-[320px] flex-[2] flex-col gap-4 max-lg:min-w-0 max-lg:basis-full">
          {/* Basic Information */}
          <div className={CARD_CLASS}>
            <h2 className={CARD_TITLE_CLASS}>Basisinformationen</h2>
            <div className="mb-4 flex flex-wrap gap-6">
              <div className="min-w-[140px] flex-1">
                <div className={FIELD_LABEL_CLASS}>Produktname</div>
                <div className={FIELD_VALUE_CLASS}>{product.name}</div>
              </div>
              <div className="min-w-[140px] flex-1">
                <div className={FIELD_LABEL_CLASS}>Kurzname</div>
                <div className={FIELD_VALUE_CLASS}>{product.shortName || '—'}</div>
              </div>
            </div>
            <div className={FIELD_LABEL_CLASS}>Beschreibung</div>
            <div className={FIELD_VALUE_CLASS}>{product.description || '—'}</div>
          </div>

          {/* Investment Details */}
          <div className={CARD_CLASS}>
            <h2 className={CARD_TITLE_CLASS}>Anlagedetails</h2>
            <div className="mb-4 flex flex-wrap gap-6">
              <div className="min-w-[140px] flex-1">
                <div className={FIELD_LABEL_CLASS}>Mindestanlagehorizont</div>
                <div className={FIELD_VALUE_CLASS}>
                  {product.minimumYear !== null ? `${product.minimumYear} Jahre` : '—'}
                </div>
              </div>
              <div className="min-w-[140px] flex-1">
                <div className={FIELD_LABEL_CLASS}>Maximaler Anlagehorizont</div>
                <div className={FIELD_VALUE_CLASS}>
                  {product.maximumYear !== null ? `${product.maximumYear} Jahre` : '—'}
                </div>
              </div>
            </div>
            <div className={FIELD_LABEL_CLASS}>Risikotyp</div>
            <span className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-medium ${getRiskTypeColor(product.riskType)}`}>
              {getRiskTypeText(product.riskType)}
            </span>
          </div>

          {/* AI Configuration */}
          <div className={CARD_CLASS}>
            <h2 className={CARD_TITLE_CLASS}>KI-Konfiguration</h2>
            <div className={FIELD_LABEL_CLASS}>KI-Modell</div>
            <div className={`mb-4 ${FIELD_VALUE_CLASS}`}>{activeAiSetting?.model || '—'}</div>
            <div className={FIELD_LABEL_CLASS}>Produkt-Prompt</div>
            <div className={`mb-4 ${PROMPT_BOX_CLASS}`}>
              {activeAiSetting?.prompt || '—'}
            </div>
            <div className={FIELD_LABEL_CLASS}>Erste Nachricht</div>
            <div className={PROMPT_BOX_CLASS}>
              {activeAiSetting?.firstMessage || '—'}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex min-w-[260px] flex-1 flex-col gap-4 max-lg:min-w-0 max-lg:basis-full">
          {/* Document */}
          <div className={CARD_CLASS}>
            <h2 className={CARD_TITLE_CLASS}>Produktdokument</h2>
            {product.fileName ? (
              <a
                href={`/api/products/file/${product.fileName.replace(/^\/products\//, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[12px] border border-surface-raised px-3.5 py-3 transition-all hover:border-accent-primary hover:shadow-soft"
              >
                <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] bg-surface-subtle text-accent-primary">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-text-primary">Produkt-PDF</div>
                  <div className="text-[10px] text-text-muted">Klicken zum Anzeigen</div>
                </div>
              </a>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-subtle text-text-muted">
                  <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </div>
                <div className="text-[11px] text-text-muted">Kein PDF hochgeladen</div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className={CARD_CLASS}>
            <h2 className={CARD_TITLE_CLASS}>Metadaten</h2>
            <div className={FIELD_LABEL_CLASS}>Produkt-ID</div>
            <div className="mb-4 break-all rounded-md bg-surface-subtle px-2 py-1.5 font-mono text-[10.5px] text-text-primary">
              {product.id}
            </div>
            <div className={FIELD_LABEL_CLASS}>Erstellt am</div>
            <div className={`mb-4 ${FIELD_VALUE_CLASS}`}>
              {new Date(product.createdAt).toLocaleString()}
            </div>
            <div className={FIELD_LABEL_CLASS}>Zuletzt aktualisiert</div>
            <div className={`mb-4 ${FIELD_VALUE_CLASS}`}>
              {new Date(product.updatedAt).toLocaleString()}
            </div>
            <div className={FIELD_LABEL_CLASS}>Status</div>
            <StatusBadge
              tone={activeAiSetting?.isActive ? 'approved' : 'neutral'}
              label={activeAiSetting?.isActive ? 'Aktiv' : 'Inaktiv'}
            />
          </div>
        </div>
      </div>
    </AdminDashboardShell>
  );
};

/** Prototype's `.detail-stat-card` — label + value left, icon chip right. */
const DetailStatCard = ({
  label,
  value,
  /** Font size for the value. The date card renders one step down, as in the prototype. */
  valueClassName = 'text-xl',
  icon,
  iconClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  icon: React.ReactNode;
  iconClassName: string;
}) => (
  <div className="flex min-w-[180px] flex-1 items-center justify-between gap-3 rounded-[14px] bg-surface-card px-[18px] py-4 shadow-soft max-sm:basis-full">
    <div className="min-w-0">
      <div className="mb-[3px] truncate text-xs text-text-muted">{label}</div>
      <div className={`font-semibold tabular-nums text-text-primary ${valueClassName}`}>
        {value}
      </div>
    </div>
    <div className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
      {icon}
    </div>
  </div>
);

export default ViewProductPage;
