'use client';

import React from 'react';
import { LogOut, BarChart3, Link2, Copy, Check } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

interface PartnerHeaderProps {
  partnerName?: string;
  partnerEmail?: string;
  referralCode?: string;
}

const PartnerHeader = ({ partnerName, partnerEmail, referralCode }: PartnerHeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/partner/logout', {
        method: 'POST',
      });
      await response.json();
      router.push('/partner/signin');
    } catch (error) {
      console.log('error:', error);
    }
  };

  const copyReferralLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const referralLink = `${baseUrl}/?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/partner/dashboard',
      icon: BarChart3,
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
                {pathname === '/partner/dashboard' && 'Partner Dashboard'}
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 truncate">
                {pathname === '/partner/dashboard' && `Willkommen zurück, ${partnerName || 'Partner'}!`}
              </p>
            </div>
          </div>

          {/* User info and logout - shown on mobile */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs sm:text-sm font-medium">
                  {partnerName ? partnerName[0].toUpperCase() : 'P'}
                </span>
              </div>
              <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[160px]">
                {partnerEmail || 'partner@example.com'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors text-xs sm:text-sm font-medium shadow-sm flex-shrink-0"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>

          {/* User info and logout - shown on desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {partnerName ? partnerName[0].toUpperCase() : 'P'}
                </span>
              </div>
              <span className="text-sm text-gray-700">{partnerEmail || 'partner@example.com'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-medium shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
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
                      ? 'text-emerald-600 bg-emerald-50 border-2 border-emerald-200 lg:bg-transparent lg:border-b-2 lg:border-t-0 lg:border-l-0 lg:border-r-0 lg:border-emerald-600 lg:rounded-none lg:pb-1'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50 lg:hover:bg-transparent'
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

export default PartnerHeader;

