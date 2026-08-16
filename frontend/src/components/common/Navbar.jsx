import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';

const Navbar = () => {
  const { user, token, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleDashboardRedirect = () => {
    if (role === 'ADMIN') navigate('/admin');
    else if (role === 'DOCTOR') navigate('/doctor');
    else navigate('/patient');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/">
          <Logo size="normal" />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="/#home" className="hover:text-blue-600 transition-colors">Home</a>
          <a href="/#about" className="hover:text-blue-600 transition-colors">About</a>
          <a href="/#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="/#doctors" className="hover:text-blue-600 transition-colors">Doctors</a>
          <a href="/#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          <a href="/#contact" className="hover:text-blue-600 transition-colors">Contact</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDashboardRedirect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
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
                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm transition-colors border border-gray-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
