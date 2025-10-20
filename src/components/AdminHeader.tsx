'use client';

import React from 'react';
import { LogOut, Package, BarChart3 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

const AdminHeader = () => {
  const router = useRouter();
  const pathname = usePathname();

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
      name: 'Products',
      href: '/admin/products',
      icon: Package,
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {pathname === '/admin/dashboard' ? 'Dashboard' : 'Products Management'}
              </h1>
              <p className="text-gray-600">
                {pathname === '/admin/dashboard' ? 'Welcome back!' : 'Manage your product catalog'}
              </p>
            </div>
            <nav className="flex space-x-6">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center gap-2 font-medium transition-colors ${
                      isActive
                        ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {process.env.NEXT_PUBLIC_ADMIN_EMAIL ? process.env.NEXT_PUBLIC_ADMIN_EMAIL[0] : 'A'}
                </span>
              </div>
              <span className="text-sm text-gray-700">
                {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com'}
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
      </div>
    </div>
  );
};

export default AdminHeader;