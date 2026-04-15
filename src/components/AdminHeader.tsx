'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, Package, BarChart3, MessageSquare, TrendingUp } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const AdminHeader = () => {
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

  const navigationItems = [
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
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main header content */}
        <div className="flex flex-col space-y-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Title and description section */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-col space-y-1 sm:space-y-2">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {pathname === '/admin/dashboard' && 'Dashboard'}
                {pathname === '/admin/performance-reports' && 'Performance Report'}
                {pathname === '/admin/products' && 'Products Management'}
                {pathname === '/admin/main-product-prompt' && 'Main Product Prompts'}
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 truncate">
                {pathname === '/admin/dashboard' && 'Welcome back!'}
                {pathname === '/admin/performance-reports' && 'Unternehmensweite Leistungsübersicht'}
                {pathname === '/admin/products' && 'Manage your product catalog'}
                {pathname === '/admin/main-product-prompt' && 'Manage your AI model configurations'}
              </p>
            </div>
          </div>

          {/* User info and logout - shown on mobile */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs sm:text-sm font-medium">
                  {adminData?.firstName?.[0] || 'A'}
                </span>
              </div>
              <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[160px]">
                {adminData ? `${adminData.firstName} ${adminData.lastName}` : 'Loading...'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors text-xs sm:text-sm font-medium shadow-sm flex-shrink-0"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* User info and logout - shown on desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {adminData?.firstName?.[0] || 'A'}
                </span>
              </div>
              <span className="text-sm text-gray-700">
                {adminData ? `${adminData.firstName} ${adminData.lastName}` : 'Loading...'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-medium shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Navigation section */}
        <div className="border-t border-gray-100 pt-3 pb-4 lg:border-t-0 lg:pt-0 lg:pb-4">
          <nav className="flex space-x-1 sm:space-x-4 lg:space-x-6 overflow-x-auto scrollbar-hide">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex items-center gap-1.5 sm:gap-2 font-medium transition-colors whitespace-nowrap px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm lg:text-base ${
                    isActive
                      ? 'text-blue-600 bg-blue-50 border-2 border-blue-200 lg:bg-transparent lg:border-b-2 lg:border-t-0 lg:border-l-0 lg:border-r-0 lg:border-blue-600 lg:rounded-none lg:pb-1'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 lg:hover:bg-transparent'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;