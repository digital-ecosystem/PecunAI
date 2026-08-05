'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Sparkles, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared off-canvas sidebar shell for every dashboard surface
 * (customer / advisor / admin). Chrome only — it owns no data and no business
 * logic; callers pass their own nav destinations and header content.
 *
 * The sidebar is hidden by default and opened via the hamburger at *every*
 * breakpoint (not a mobile-only drawer), matching the approved design.
 *
 * Consuming a new surface:
 *
 *   <DashboardShell
 *     title="Dashboard"
 *     subtitle={<>Willkommen zurück, <strong>{name}</strong>!</>}
 *     navItems={[{ name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 }]}
 *     footerItems={[{ name: 'Abmelden', icon: LogOut, tone: 'danger', onClick: handleLogout }]}
 *     headerRight={<DashboardProfilePill name={name} email={email} />}
 *   >
 *     ...page content...
 *   </DashboardShell>
 */

export type DashboardNavItem = {
  /** Visible label. */
  name: string;
  icon: LucideIcon;
  /** Route to push on click. Omit when the item is purely an action. */
  href?: string;
  /** Runs instead of `href` navigation when provided. */
  onClick?: () => void;
  /** `danger` renders the item in the flagged tone (e.g. logout). */
  tone?: 'default' | 'danger';
  /** Force the active state instead of deriving it from the pathname. */
  isActive?: boolean;
};

type DashboardShellProps = {
  /** Primary nav destinations, rendered at the top of the sidebar. */
  navItems: DashboardNavItem[];
  /** Pinned to the bottom of the sidebar (logout, help, ...). */
  footerItems?: DashboardNavItem[];
  /** Product name in the sidebar brand block. */
  brandLabel?: string;
  brandIcon?: LucideIcon;
  /** Page title in the header row. */
  title: React.ReactNode;
  /** Secondary line under the title. */
  subtitle?: React.ReactNode;
  /** Right-hand header slot — typically <DashboardProfilePill />. */
  headerRight?: React.ReactNode;
  /** Overrides the pathname used to derive the active nav item. */
  activeHref?: string;
  /** Max width of the centred content column. */
  contentClassName?: string;
  children: React.ReactNode;
};

const navToneClasses = (active: boolean, tone: DashboardNavItem['tone']) => {
  if (active) return 'bg-accent-primary text-text-on-accent font-medium';
  if (tone === 'danger') return 'text-status-flagged-fg hover:bg-status-flagged';
  return 'text-text-primary hover:bg-surface-selected';
};

export function DashboardProfilePill({
  name,
  email,
  role,
  initial,
  className,
}: {
  name?: React.ReactNode;
  email?: React.ReactNode;
  role?: React.ReactNode;
  /** Avatar character. Falls back to the first letter of name/email. */
  initial?: string;
  className?: string;
}) {
  const fallback =
    initial ??
    (typeof name === 'string' && name.trim()
      ? name.trim().charAt(0)
      : typeof email === 'string'
        ? email.charAt(0)
        : '');

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-2xl bg-surface-card p-1.5 pr-3.5 shadow-soft',
        className,
      )}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-primary text-sm font-semibold text-text-on-accent">
        {fallback.toUpperCase()}
      </div>
      <div className="min-w-0">
        {name ? (
          <div className="truncate text-xs font-semibold leading-snug text-text-primary">{name}</div>
        ) : null}
        {email ? (
          <div className="truncate text-[10px] leading-snug text-text-muted">{email}</div>
        ) : null}
        {role ? (
          <div className="truncate text-[10px] leading-snug text-text-muted">{role}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardShell({
  navItems,
  footerItems = [],
  brandLabel = 'Digital Onboarding Guide',
  brandIcon: BrandIcon = Sparkles,
  title,
  subtitle,
  headerRight,
  activeHref,
  contentClassName,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentPath = activeHref ?? pathname ?? '';

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen, closeSidebar]);

  const isItemActive = (item: DashboardNavItem) => {
    if (typeof item.isActive === 'boolean') return item.isActive;
    if (!item.href) return false;
    return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
  };

  const handleNavItem = (item: DashboardNavItem) => {
    closeSidebar();
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.href) router.push(item.href);
  };

  const renderNavItem = (item: DashboardNavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item);
    return (
      <button
        key={`${item.name}-${item.href ?? 'action'}`}
        type="button"
        onClick={() => handleNavItem(item)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors',
          navToneClasses(active, item.tone),
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
        <span className="truncate">{item.name}</span>
      </button>
    );
  };

  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-surface-subtle">
      {/* Scrim */}
      <div
        onClick={closeSidebar}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-30 bg-text-primary/30 transition-opacity duration-200',
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Sidebar */}
      <aside
        /* Keeps the off-canvas panel out of the tab order and the a11y tree while closed. */
        inert={!isSidebarOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[220px] max-w-[85vw] flex-shrink-0 flex-col overflow-y-auto bg-surface-card px-4 py-5 shadow-soft transition-transform duration-200 ease-out',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex min-w-0 items-center gap-2.5 px-1">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl bg-accent-primary text-text-on-accent">
            <BrandIcon className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1 text-[13px] font-bold leading-snug break-words text-text-primary">
            {brandLabel}
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Menü schließen"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-selected hover:text-text-primary"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">{navItems.map(renderNavItem)}</nav>

        <div className="flex-1" />

        {footerItems.length > 0 && (
          <div className="flex flex-col gap-1 pt-4">{footerItems.map(renderNavItem)}</div>
        )}
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex-1 overflow-x-hidden p-6">
        <div className={cn('mx-auto max-w-[1040px]', contentClassName)}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Menü öffnen"
                aria-expanded={isSidebarOpen}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-card text-text-primary shadow-soft transition-shadow hover:shadow-raised"
              >
                <Menu className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold leading-tight text-text-primary">{title}</h1>
                {subtitle ? (
                  <p className="mt-0.5 text-[13px] text-text-muted" suppressHydrationWarning>
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            {headerRight}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
