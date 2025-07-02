import React, { createContext, useContext, useState } from 'react';

const API_URL = 'http://localhost:3056/api';
const LOGOUT_API_URL = 'http://localhost:3056/api/auth/logout';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Đăng nhập
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      console.log('LOGIN: sending', { username, password });
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      console.log('LOGIN: response', res.status);
      if (!res.ok) throw new Error('Đăng nhập thất bại');
      const data = await res.json();
      console.log('LOGIN: data', data);
      setAccessToken(data.data.accessToken);
      setRefreshToken(data.data.refreshToken);
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      await fetchUserInfo(data.data.accessToken);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('LOGIN: error', err);
      return false;
    }
  };

  // Lấy thông tin user
  const fetchUserInfo = async (token = accessToken) => {
    if (!token) return;
    setLoading(true);
    try {
      console.log('FETCH USER INFO: sending', token);
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('FETCH USER INFO: response', res.status);
      if (!res.ok) throw new Error('Không lấy được thông tin user');
      const data = await res.json();
      const userData = data.data ? data.data : data;
      console.log('FETCH USER INFO: data', userData);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('FETCH USER INFO: error', err);
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      if (accessToken) {
        console.log('LOGOUT: sending', accessToken);
        const res = await fetch(LOGOUT_API_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log('LOGOUT: response', res.status);
      }
    } catch (err) {
      console.error('LOGOUT: error', err);
    }
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  // Khởi tạo từ localStorage nếu có
  const init = () => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setAccessToken(token);
      setUser(JSON.parse(userData));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      refreshToken,
      loading,
      error,
      login,
      logout,
      fetchUserInfo,
      init,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 