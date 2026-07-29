'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, LogOut, MessageSquare, Package, TrendingUp, Users } from 'lucide-react';
import DashboardShell, {
  DashboardProfilePill,
  type DashboardNavItem,
} from '@/components/ui/DashboardShell';

/**
 * Admin chrome. Replaces the former `AdminHeader` on every admin surface:
 * it owns the one shared admin nav array, the `/api/admin/me` identity fetch,
 * logout, and the pathname → title/subtitle map — exactly the four things
 * `AdminHeader` owned — and renders them through the shared `DashboardShell`.
 *
 * Chrome only: it renders `children` untouched and holds no page state.
 *
 *   <AdminDashboardShell>
 *     ...page content...
 *   </AdminDashboardShell>
 */

interface AdminData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** Lifted verbatim from `AdminHeader`'s `navigationItems`. */
export const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: BarChart3,
  },
  {
    name: 'Performance',
    href: '/admin/performance-reports',
    icon: TrendingUp,
  },
  {
    name: 'Products',
    href: '/admin/products',
    icon: Package,
  },
  {
    name: 'Main Prompts',
    href: '/admin/main-product-prompt',
    icon: MessageSquare,
  },
  {
    name: 'Agents',
    href: '/admin/agents',
    icon: Users,
  },
];

/** Same pathname → copy map `AdminHeader` rendered, strings unchanged. */
const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/performance-reports': 'Performance Report',
  '/admin/products': 'Products Management',
  '/admin/main-product-prompt': 'Main Product Prompts',
  '/admin/agents': 'Agents',
};

const PAGE_SUBTITLES: Record<string, string> = {
  '/admin/dashboard': 'Welcome back!',
  '/admin/performance-reports': 'Unternehmensweite Leistungsübersicht',
  '/admin/products': 'Manage your product catalog',
  '/admin/main-product-prompt': 'Manage your AI model configurations',
  '/admin/agents': 'Agenten verwalten und zuweisen',
};

export default function AdminDashboardShell({
  children,
  contentClassName,
}: {
  children: React.ReactNode;
  /** Passed through to `DashboardShell`'s centred content column. */
  contentClassName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminData, setAdminData] = useState<AdminData | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await fetch('/api/admin/me');
        const data = await response.json();
        if (data.success && data.admin) {
          setAdminData(data.admin);
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      }
    };

    fetchAdminData();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });
      await response.json();
      router.push('/admin/signin');
    } catch (error) {
      console.log('error : ', error);
    }
  };

  const currentPath = pathname ?? '';

  const footerItems: DashboardNavItem[] = [
    { name: 'Logout', icon: LogOut, tone: 'danger', onClick: handleLogout },
  ];

  return (
    <DashboardShell
      title={PAGE_TITLES[currentPath] ?? ''}
      subtitle={PAGE_SUBTITLES[currentPath]}
      navItems={ADMIN_NAV_ITEMS}
      footerItems={footerItems}
      contentClassName={contentClassName}
      headerRight={
        <DashboardProfilePill
          name={adminData ? `${adminData.firstName} ${adminData.lastName}` : 'Loading...'}
          role="Admin"
          initial={adminData?.firstName?.[0] || 'A'}
          className="max-sm:w-full"
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
