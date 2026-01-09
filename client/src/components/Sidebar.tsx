'use client';

import { useAuthStore } from '@/store/authStore';
import { getMenuItemsForRole } from '@/lib/permissions';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  if (!user) return null;

  const menuItems = getMenuItemsForRole(user.role);

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(item => item !== path)
        : [...prev, path]
    );
  };

  const isActive = (path: string) => {
    if (pathname === path) return true;
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path + '/') && pathname !== '/dashboard';
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg h-full flex flex-col transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AS</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">AttendSync</h1>
                <p className="text-xs text-gray-500">Coaching Institute</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div>
              <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
              <p className="text-xs text-gray-600">
                {user.role === 'ADMIN' ? 'Administrator' : user.role === 'TEACHER' ? 'Teacher' : 'Student'}
              </p>
              {user.employeeId && (
                <p className="text-xs text-gray-500">ID: {user.employeeId}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {menuItems.map((item) => (
            <li key={item.path}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => !isCollapsed && toggleExpanded(item.path)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700'
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                      <span className="text-lg">{getIcon(item.icon)}</span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className={`transform transition-transform text-xs ${
                        expandedItems.includes(item.path) ? 'rotate-90' : ''
                      }`}>
                        ▶
                      </span>
                    )}
                  </button>
                  {!isCollapsed && expandedItems.includes(item.path) && (
                    <ul className="mt-1 ml-6 space-y-1">
                      {item.children?.map((child) => (
                        <li key={child.path}>
                          <Link
                            href={child.path}
                            className={`block px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                              isActive(child.path)
                                ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white shadow-md transform scale-105'
                                : 'text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-sm">{getIcon(child.icon)}</span>
                              <span>{child.label}</span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.path}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700'
                  }`}
                >
                  <span className="text-lg">{getIcon(item.icon)}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={`w-full px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center ${isCollapsed ? 'justify-center' : 'justify-center space-x-2'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

function getIcon(iconName: string): string {
  const icons: Record<string, string> = {
    dashboard: '📊',
    users: '👥',
    academic: '🎓',
    classroom: '🏫',
    student: '👨🎓',
    attendance: '📋',
    money: '💰',
    chart: '📈',
    settings: '⚙️',
    list: '📝',
    plus: '➕',
    building: '🏢',
    book: '📚',
    group: '👥',
    cog: '⚙️',
    user: '👤'
  };
  return icons[iconName] || '📄';
}