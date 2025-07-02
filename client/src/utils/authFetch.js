export async function authFetch(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');
  let refreshToken = localStorage.getItem('refreshToken');

  // Thêm Authorization header nếu có accessToken
  const opts = {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  };

  let res = await fetch(url, opts);
  if (res.status !== 401) return res;

  // Nếu 401, thử refresh token
  if (!refreshToken) throw new Error('No refresh token');
  const refreshRes = await fetch('http://localhost:3056/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok || !refreshData.data?.accessToken) {
    // Xóa token, logout
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Refresh token failed, please login again');
  }
  // Lưu accessToken mới
  accessToken = refreshData.data.accessToken;
  localStorage.setItem('accessToken', accessToken);
  // Retry request với accessToken mới
  const retryOpts = {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  };
  return fetch(url, retryOpts);
} 