import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const parseJwt = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('support_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
        setUser({
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role || 'user',
        });
      } else {
        // Token expired or invalid
        localStorage.removeItem('support_token');
        setToken(null);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    const receivedToken = data.token;
    localStorage.setItem('support_token', receivedToken);
    setToken(receivedToken);

    const decoded = parseJwt(receivedToken);
    const currentUser = decoded ? {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'user',
    } : data.user;

    setUser(currentUser);

    // Audit log
    await api.audit.createLog({
      action: 'USER_LOGIN',
      user_email: currentUser.email,
      details: `User logged in with role: ${currentUser.role}`,
    });

    return currentUser;
  };

  const register = async (username, email, password, role = 'user') => {
    const data = await api.auth.register(username, email, password, role);
    const receivedToken = data.token;
    localStorage.setItem('support_token', receivedToken);
    setToken(receivedToken);

    const decoded = parseJwt(receivedToken);
    const currentUser = decoded ? {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'user',
    } : data.user;

    setUser(currentUser);

    // Audit log
    await api.audit.createLog({
      action: 'USER_REGISTER',
      user_email: currentUser.email,
      details: `New account created with role: ${currentUser.role}`,
    });

    return currentUser;
  };

  const logout = async () => {
    if (user?.email) {
      await api.audit.createLog({
        action: 'USER_LOGOUT',
        user_email: user.email,
        details: 'User explicitly logged out',
      });
    }
    localStorage.removeItem('support_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAdmin,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
