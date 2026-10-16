import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';

const Navbar = () => {
  const { user, token, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDashboardRedirect = () => {
    setMobileMenuOpen(false);
    if (role === 'ADMIN') navigate('/admin');
    else if (role === 'DOCTOR') navigate('/doctor');
    else navigate('/patient');
  };

  const navLinks = [
    { href: '/#home', label: 'Home' },
    { href: '/#about', label: 'About' },
    { href: '/#features', label: 'Features' },
    { href: '/#doctors', label: 'Doctors' },
    { href: '/#faq', label: 'FAQ' },
    { href: '/#contact', label: 'Contact' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" onClick={() => setMobileMenuOpen(false)}>
          <Logo size="normal" />
        </Link>

        {/* Desktop Navigation Links (>= lg) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-blue-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop / Tablet Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDashboardRedirect}
                className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-xs sm:text-sm transition-colors border border-gray-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
              >
                Register
              </Link>
            </div>
          )}

          {/* Hamburger toggle for tablet (sm to lg) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-gray-900" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
        </div>

        {/* Mobile Hamburger Toggle (< sm) */}
        <div className="flex sm:hidden items-center gap-2">
          {token && (
            <button
              onClick={handleDashboardRedirect}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-medium text-xs flex items-center gap-1 shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-gray-900" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
        </div>

      </div>

      {/* Mobile / Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            {token ? (
              <>
                <button
                  onClick={handleDashboardRedirect}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Open {role} Dashboard</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow-sm hover:bg-blue-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
