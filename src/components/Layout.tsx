import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth-store';
import { ListTodo, Calendar, Book, LogOut, Settings, Menu, X, ChevronLeft, CheckSquare } from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import UserPreferences from './UserPreferences';

function Layout() {
  const { signOut } = useAuthStore();
  const { t } = useTranslation();
  const [showPreferences, setShowPreferences] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/tasks':
        return t('nav.tasks');
      case '/calendar':
        return t('nav.calendar');
      case '/journal':
        return t('nav.journal');
      default:
        return t('appName');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-sm z-50 fixed top-0 left-0 right-0">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={toggleMenu}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
            <span className="text-sm font-medium text-gray-600">菜单</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">{getPageTitle()}</h1>
          <div className="w-16" /> {/* Spacer for balance */}
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40
            w-64 bg-white shadow-lg
            transition-transform duration-300 ease-in-out
            md:translate-x-0 md:static
            ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between md:justify-start gap-3">
                <h1 className="text-xl font-bold text-gray-800">{t('appName')}</h1>
                <button
                  onClick={closeMenu}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="space-y-1 px-3">
                <NavLink
                  to="/tasks"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 ${
                      isActive ? 'bg-purple-50 text-purple-700' : ''
                    }`
                  }
                >
                  <ListTodo className="w-5 h-5 mr-3" />
                  <span className="font-medium">{t('nav.tasks')}</span>
                </NavLink>
                <NavLink
                  to="/calendar"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 ${
                      isActive ? 'bg-purple-50 text-purple-700' : ''
                    }`
                  }
                >
                  <Calendar className="w-5 h-5 mr-3" />
                  <span className="font-medium">{t('nav.calendar')}</span>
                </NavLink>
                <NavLink
                  to="/journal"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 ${
                      isActive ? 'bg-purple-50 text-purple-700' : ''
                    }`
                  }
                >
                  <Book className="w-5 h-5 mr-3" />
                  <span className="font-medium">{t('nav.journal')}</span>
                </NavLink>
              </div>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  setShowPreferences(true);
                  closeMenu();
                }}
                className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5 mr-3" />
                <span className="font-medium">个人偏好设置</span>
              </button>
              <LanguageToggle />
              <button
                onClick={() => signOut()}
                className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">{t('common.signOut')}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={closeMenu}
          />
        )}

        {/* Main Content */}
        <main className="flex-1">
          <div className="px-4 pt-16 pb-6 md:py-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* User Preferences Modal */}
      <UserPreferences
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </div>
  );
}

export default Layout;