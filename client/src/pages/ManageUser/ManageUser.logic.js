import { useState, useEffect } from 'react';
import { useAuth } from '../../utils/useAuth';
import { authFetch } from '../../utils/authFetch';
import { useSSEContext } from "@utils/SSEContext";

const API_URL = 'http://localhost:3056/api/users';
const DEPT_API_URL = 'http://localhost:3056/api/departments';

export function useManageUserLogic() {
  const { accessToken, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', email: '', role: 'user', position: '', phoneNumber: '', department: '', gender: '', directSupervisor: ''
  });
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_URL}/all?includeInactive=true`);
      if (!res.ok) throw new Error('Không lấy được danh sách user');
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  useSSEContext((event) => {
    if (["user_created", "user_updated", "user_deleted"].includes(event.type)) {
      fetchUsers();
    }
  });

  // Lấy danh sách phòng ban khi mở dialog
  useEffect(() => {
    if (openDialog) {
      authFetch(DEPT_API_URL)
        .then(res => res.json())
        .then(data => setDepartments(data.data || []));
    }
  }, [openDialog, accessToken]);

  const handleOpenDialog = (user = null) => {
    setEditUser(user);
    setForm(user ? { ...user, password: '' } : {
      username: '', password: '', fullName: '', email: '', role: 'user', position: '', phoneNumber: '', department: '', gender: '', directSupervisor: ''
    });
    setDepartmentUsers([]);
    
    // Nếu đang edit user và có phòng ban, load danh sách nhân viên của phòng ban đó
    if (user && user.department) {
      const deptId = typeof user.department === 'object' ? user.department._id : user.department;
      if (deptId) {
        authFetch(`${DEPT_API_URL}/${deptId}/supporters`)
          .then(res => res.json())
          .then(data => setDepartmentUsers(data.data || []))
          .catch(() => setDepartmentUsers([]));
      }
    }
    
    setOpenDialog(true);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Khi phòng ban thay đổi, lấy danh sách nhân viên của phòng ban đó
    if (name === 'department') {
      // Reset cấp trên khi phòng ban thay đổi
      setForm(prev => ({ ...prev, directSupervisor: '' }));
      if (value) {
        authFetch(`${DEPT_API_URL}/${value}/leaders`)
          .then(res => res.json())
          .then(data => setDepartmentUsers(data.data || []))
          .catch(() => setDepartmentUsers([]));
      } else {
        setDepartmentUsers([]);
      }
    }
  };

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
      const res = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(editUser ? 'Cập nhật user thất bại' : 'Tạo user thất bại');
      setOpenDialog(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSetActive = async (id, isActive) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`http://localhost:3056/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Cập nhật trạng thái user thất bại');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handlePermanentDelete = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`http://localhost:3056/api/users/permanent/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Xóa user vĩnh viễn thất bại');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await authFetch(`${API_URL}/import-csv`, {
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

  const handleExport = async (type) => {
    try {
      const res = await authFetch(`${API_URL}/export?type=${type}`, {
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

  const canEdit = user && (user.role === 'admin' || user.role === 'manager');

  return {
    users,
    loading,
    error,
    openDialog,
    setOpenDialog,
    editUser,
    setEditUser,
    form,
    setForm,
    handleOpenDialog,
    handleChange,
    handleSubmit,
    handleSetActive,
    handlePermanentDelete,
    importDialog,
    setImportDialog,
    importFile,
    setImportFile,
    importResult,
    setImportResult,
    importLoading,
    handleImportCSV,
    handleExport,
    canEdit,
    user,
    departments,
    departmentUsers,
  };
} 