import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize user immediately from cached localStorage so there is zero flash or logout
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    // If we already have token and user cached, don't block the UI with full-screen loading
    return !(token && savedUser);
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/auth/me');
      if (res.data && res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      }
    } catch (error) {
      console.warn('Auth validation warning (server may be restarting):', error?.message);
      // ONLY log out if the backend explicitly rejected the token with 401 Unauthorized
      // DO NOT log out on network errors, server restarts (502/503/ECONNREFUSED), or timeouts!
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.data));
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.data.token}`;
    setUser(res.data.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminGlobalProperty');
    localStorage.removeItem('superAdminToken');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
