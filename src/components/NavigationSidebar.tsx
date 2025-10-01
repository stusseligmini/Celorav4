'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthFlow } from '../hooks/useAuthFlow';

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

export function NavigationSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthFlow();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile or desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Default to collapsed on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  // Ensure we have the user data - safely handle potential undefined user in production
  if (!user) {
    // Return a minimal version that doesn't depend on user data
    return (
      <div className="fixed h-full left-0 top-0 z-50 bg-gray-900/70 backdrop-blur w-64 border-r border-cyan-400/20">
        <div className="p-4 flex items-center justify-between">
          <div className="text-2xl font-mono font-bold text-cyan-400">CELORA</div>
        </div>
        <div className="p-4 mb-6 border-b border-cyan-400/20">
          <div className="text-center text-cyan-primary/70">Loading user data...</div>
        </div>
      </div>
    );
  }
  
  // When sidebar is fully closed on mobile
  if (isMobile && !isMobileOpen) {
    return (
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-3 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-cyan-primary/30 text-cyan-primary hover:shadow-neon-sm"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    );
  }

  const navigationItems: NavigationItem[] = [
    {
      title: 'Dashboard',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      title: 'Wallets',
      path: '/wallets',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Wallet Backup',
      path: '/wallet/backup',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
    },
    {
      title: 'Virtual Cards',
      path: '/cards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      title: 'Transactions',
      path: '/transactions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      title: 'Analytics',
      path: '/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Security',
      path: '/security',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        />
      )}
    
      <div className={`fixed h-full left-0 top-0 z-50 bg-gray-900/70 backdrop-blur transition-all duration-300 
        ${collapsed ? 'w-20' : 'w-64'} 
        ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        border-r border-cyan-400/20`}>
        
        {/* Logo and collapse toggle */}
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <div className="text-2xl font-mono font-bold text-cyan-400">CELORA</div>
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <div className="text-2xl font-mono font-bold text-cyan-primary neon-text">C</div>
            </div>
          )}
          
          {isMobile ? (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-full transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 text-cyan-primary hover:bg-cyan-primary/15 rounded-full transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              )}
            </button>
          )}
        </div>

      {/* User profile */}
      <div className={`p-4 mb-6 border-b border-cyan-primary/20 ${collapsed ? 'text-center' : ''}`}>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-cyan-primary/20 rounded-full flex items-center justify-center border border-cyan-primary/30">
            <span className="text-cyan-primary text-lg font-mono neon-text">
              {user.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="text-center">
              <div className="text-sm font-medium text-white">
                {user.user_metadata?.full_name || 'User'}
              </div>
              <div className="text-xs text-gray-400">{user.email}</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="px-2 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.path || 
            (item.path !== '/' && pathname?.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} py-3 px-4 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-cyan-primary/20 text-cyan-primary border border-cyan-primary/30 shadow-neon-sm' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-cyan-primary hover:border hover:border-cyan-primary/30'
                }
              `}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              {!collapsed && (
                <span className="ml-3 font-mono text-sm">{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 ${collapsed ? 'text-center' : ''}`}>
        <div 
          className={`bg-gradient-to-r from-cyan-primary/10 to-purple-glow/10 border border-cyan-primary/20 rounded-lg p-4 mb-4 hover:shadow-neon-sm transition-all duration-300
            ${collapsed ? 'hidden' : 'block'}`}
        >
          <div className="text-xs text-cyan-primary mb-2 font-mono neon-text">PRO ACCOUNT</div>
          <div className="text-sm text-white mb-2">Advanced features unlocked</div>
          <div className="text-xs text-gray-400">Active until Jan 2024</div>
        </div>

        <button 
          onClick={() => router.push('/auth/signout')}
          className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} 
            py-3 px-4 rounded-lg transition-colors w-full text-gray-400 hover:bg-gray-800/50 hover:text-red-500 hover:border hover:border-red-500/30`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && (
            <span className="ml-3 font-mono text-sm">Logout</span>
          )}
        </button>
      </div>
    </div>
    </>
  );
}