import React, { useEffect, useState } from 'react';
import { useAuth } from '../../utils/useAuth';
import {
  Card, Typography, Button, Input, Dialog, DialogHeader, DialogBody, DialogFooter, Select, Option, IconButton, Spinner
} from '@material-tailwind/react';

const API_URL = 'http://localhost:3056/api/users';

function ManageUser() {
  const { accessToken, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', email: '', role: 'user', position: '', phoneNumber: '', department: '', gender: '', directSupervisor: ''
  });

  // Import CSV states
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // Lấy danh sách user
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/all?includeInactive=true`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Không lấy được danh sách user');
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // Xử lý mở dialog tạo/sửa user
  const handleOpenDialog = (user = null) => {
    setEditUser(user);
    setForm(user ? { ...user, password: '' } : {
      username: '', password: '', fullName: '', email: '', role: 'user', position: '', phoneNumber: '', department: '', gender: '', directSupervisor: ''
    });
    setOpenDialog(true);
  };

  // Xử lý thay đổi form
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Tạo hoặc cập nhật user
  const handleSubmit = async () => {
    if ((form.role === 'user' || form.role === 'manager') && (!form.directSupervisor || form.directSupervisor === '')) {
      setError('Bạn phải chọn cấp trên trực tiếp cho vai trò này!');
      return;
    }
    let submitForm = { ...form };
    if (submitForm.directSupervisor && typeof submitForm.directSupervisor === 'object') {
      submitForm.directSupervisor = submitForm.directSupervisor._id;
    }
    setLoading(true);
    setError(null);
    try {
      const method = editUser ? 'PUT' : 'POST';
      const url = editUser ? `http://localhost:3056/api/users/${editUser._id}` : `${API_URL}/create`;
      const body = { ...submitForm };
      if (!body.password) delete body.password;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });
      const respData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(editUser ? 'Cập nhật user thất bại' : 'Tạo user thất bại');
      setOpenDialog(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Thêm hàm cập nhật trạng thái isActive
  const handleSetActive = async (id, isActive) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3056/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ isActive }),
      });
      const respData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Cập nhật trạng thái user thất bại');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Thêm hàm xóa triệt để
  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa vĩnh viễn user này?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3056/api/users/permanent/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const respData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('Xóa user vĩnh viễn thất bại');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Import CSV handler
  const handleImportCSV = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch(`${API_URL}/import-csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success) fetchUsers();
    } catch (err) {
      setImportResult({ success: false, message: 'Lỗi import file' });
    }
    setImportLoading(false);
  };

  // Export user list
  const handleExport = async (type) => {
    try {
      const res = await fetch(`${API_URL}/export?type=${type}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Không thể export file');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'xlsx' ? 'users.xlsx' : 'users.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Lỗi export file: ' + err.message);
    }
  };

  // Chỉ admin/manager mới được thêm/xóa/sửa user
  const canEdit = user && (user.role === 'admin' || user.role === 'manager');

  return (
    <div className="p-6">
      <Typography variant="h4" className="mb-4">Quản lý người dùng</Typography>
      {error && <Typography color="red" className="mb-2">{error}</Typography>}
      {loading && <Spinner className="mx-auto" />}
      <div className="flex justify-end mb-4">
        {canEdit && (
          <>
            {/* Export buttons */}
            <button
              className="block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 mr-2"
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </button>
            <button
              className="block rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 mr-2"
              onClick={() => handleExport('xlsx')}
            >
              Export Excel
            </button>
            <button
              className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 mr-2"
              onClick={() => setImportDialog(true)}
            >
              Import CSV
            </button>
            <button
              className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
              onClick={() => handleOpenDialog()}
            >
              Thêm người dùng
            </button>
          </>
        )}
      </div>
      <Card className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr>
              <th className="p-2">Tên đăng nhập</th>
              <th className="p-2">Họ tên</th>
              <th className="p-2">Email</th>
              <th className="p-2">Vai trò</th>
              <th className="p-2">Phòng ban</th>
              <th className="p-2">Chức vụ</th>
              <th className="p-2">SĐT</th>
              <th className="p-2">Giới tính</th>
              <th className="p-2">Quản lý trực tiếp</th>
              {canEdit && <th className="p-2">Hành động</th>}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(users) && users.length > 0 ? users.map((u) => {
              try {
                if (!u || typeof u !== 'object' || !u._id) return null;
                return (
                  <tr key={u._id} className="border-b">
                    <td className="p-2">{typeof u.username === 'string' ? u.username : ''}</td>
                    <td className="p-2">{typeof u.fullName === 'string' ? u.fullName : ''}</td>
                    <td className="p-2">{typeof u.email === 'string' ? u.email : ''}</td>
                    <td className="p-2">{typeof u.role === 'string' ? u.role : ''}</td>
                    <td className="p-2">{typeof u.department === 'string' ? u.department : ''}</td>
                    <td className="p-2">{typeof u.position === 'string' ? u.position : ''}</td>
                    <td className="p-2">{typeof u.phoneNumber === 'string' ? u.phoneNumber : ''}</td>
                    <td className="p-2">{typeof u.gender === 'string' ? u.gender : ''}</td>
                    <td className="p-2">{
                      !u.directSupervisor ? '' :
                        (typeof u.directSupervisor === 'object' && u.directSupervisor !== null && u.directSupervisor.fullName)
                          ? u.directSupervisor.fullName
                          : (typeof u.directSupervisor === 'string'
                            ? (users.find(sv => sv._id === u.directSupervisor)?.fullName || u.directSupervisor)
                            : '')
                    }</td>
                    {canEdit && (
                      <td className="p-2 flex gap-2">
                        {u.isActive ? (
                          <>
                            <button
                              className="rounded-md bg-teal-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-teal-700"
                              onClick={() => handleOpenDialog(u)}
                            >
                              Cập nhật
                            </button>
                            <button
                              className="rounded-md bg-yellow-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-yellow-700"
                              onClick={() => handleSetActive(u._id, false)}
                            >
                              Vô hiệu hóa
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-green-700"
                              onClick={() => handleSetActive(u._id, true)}
                            >
                              Kích hoạt
                            </button>
                            <button
                              className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700"
                              onClick={() => handlePermanentDelete(u._id)}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              } catch (err) {
                console.error('Render user row error:', err, u);
                return null;
              }
            }) : null}
          </tbody>
        </table>
      </Card>
      {openDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="text-xl font-semibold mb-4">{editUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}</div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tên đăng nhập" name="username" value={form.username} onChange={handleChange} disabled={!!editUser} required />
              <Input label="Mật khẩu" name="password" type="password" value={form.password} onChange={handleChange} required={!editUser} />
              <Input label="Họ tên" name="fullName" value={form.fullName} onChange={handleChange} required />
              <Input label="Email" name="email" value={form.email} onChange={handleChange} required />
              <Select label="Vai trò" name="role" value={form.role} onChange={val => setForm(f => ({ ...f, role: val }))}>
                <Option value="user">User</Option>
                <Option value="manager">Manager</Option>
                <Option value="admin">Admin</Option>
              </Select>
              <Input label="Chức vụ" name="position" value={form.position} onChange={handleChange} />
              <Input label="Số điện thoại" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
              <Input label="Phòng ban" name="department" value={form.department} onChange={handleChange} />
              <div>
                <label className="block text-sm font-medium mb-1">Giới tính</label>
                <select
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="gender"
                  value={form.gender || ''}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <select
                    className="w-full min-w-[200px] border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    name="directSupervisor"
                    value={typeof form.directSupervisor === 'object' && form.directSupervisor !== null
                      ? form.directSupervisor._id
                      : form.directSupervisor || ''}
                    onChange={e => setForm(f => ({ ...f, directSupervisor: e.target.value }))}
                  >
                    <option value="">Không</option>
                    {users.map(sv => (
                      <option key={sv._id} value={sv._id}>{sv.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
                onClick={() => setOpenDialog(false)}
              >
                Hủy
              </button>
              <button
                className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
                onClick={handleSubmit}
              >
                {editUser ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import CSV Dialog */}
      {importDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="text-xl font-semibold mb-4">Import người dùng từ CSV</div>
            <input
              type="file"
              accept=".csv"
              onChange={e => setImportFile(e.target.files[0])}
              className="mb-4"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-md bg-gray-400 px-4 py-2 text-white"
                onClick={() => { setImportDialog(false); setImportFile(null); setImportResult(null); }}
              >
                Đóng
              </button>
              <button
                className="rounded-md bg-teal-600 px-4 py-2 text-white"
                onClick={handleImportCSV}
                disabled={importLoading || !importFile}
              >
                {importLoading ? 'Đang import...' : 'Import'}
              </button>
            </div>
            {importResult && (
              <div className="mt-4">
                <div className={importResult.success ? 'text-green-600' : 'text-red-600'}>
                  {importResult.message}
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary>Chi tiết lỗi ({importResult.errors.length})</summary>
                    <ul className="text-xs max-h-40 overflow-auto">
                      {importResult.errors.map((err, idx) => (
                        <li key={idx}>
                          <b>Dòng:</b> {JSON.stringify(err.row)}<br />
                          <b>Lỗi:</b> {err.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUser; 