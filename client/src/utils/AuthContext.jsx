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
  const [participatedIndicators, setParticipatedIndicators] = useState([]);

  // Đăng nhập
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error('Đăng nhập thất bại');
      const data = await res.json();
      setAccessToken(data.data.accessToken);
      setRefreshToken(data.data.refreshToken);
      sessionStorage.setItem('accessToken', data.data.accessToken);
      sessionStorage.setItem('refreshToken', data.data.refreshToken);
      await fetchUserInfo(data.data.accessToken);
      await fetchParticipatedIndicators(data.data.accessToken);
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
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không lấy được thông tin user');
      const data = await res.json();
      const userData = data.data ? data.data : data;
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
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
        const res = await fetch(LOGOUT_API_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch (err) {
      console.error('LOGOUT: error', err);
    }
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  };

  // Khởi tạo từ localStorage nếu có
  const init = () => {
    const token = sessionStorage.getItem('accessToken');
    const userData = sessionStorage.getItem('user');
    if (token && userData) {
      setAccessToken(token);
      setUser(JSON.parse(userData));
    }
    fetchParticipatedIndicators(token);
  };

  const fetchParticipatedIndicators = async (token = accessToken) => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3056/api/indicators/participated', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Không lấy được danh sách chỉ tiêu');
      const data = await res.json();
      setParticipatedIndicators(data.data || []);
      sessionStorage.setItem('participatedIndicators', JSON.stringify(data.data || []));
    } catch (err) {
      console.error('FETCH PARTICIPATED INDICATORS: error', err);
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
      participatedIndicators,
      fetchParticipatedIndicators,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 