import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('neurodetect_role') || null);
  const [token, setToken] = useState(localStorage.getItem('neurodetect_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          const res = await authAPI.getCurrentUser();
          setUser(res.data);
          setRole(res.data.role);
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [token]);

  const login = async (email, password, selectedRole) => {
    const response = await authAPI.login({ email, password, role: selectedRole });
    const { access_token, role: userRole, name, user_id } = response.data;

    localStorage.setItem('neurodetect_token', access_token);
    localStorage.setItem('neurodetect_role', userRole);
    localStorage.setItem('neurodetect_user', JSON.stringify({ name, user_id }));

    setToken(access_token);
    setRole(userRole);
    
    // Fetch full profile
    try {
      const userRes = await authAPI.getCurrentUser();
      setUser(userRes.data);
    } catch (e) {
      setUser({ id: user_id, email, role: userRole, name });
    }

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('neurodetect_token');
    localStorage.removeItem('neurodetect_role');
    localStorage.removeItem('neurodetect_user');
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
