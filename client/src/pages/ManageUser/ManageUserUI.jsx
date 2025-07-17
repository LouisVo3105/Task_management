import React from 'react';
import {
  Card, Typography, Input, Spinner, Select, Option
} from '@material-tailwind/react';
import { mapPositionLabel } from '../../utils/positionLabel';

export default function ManageUserUI({
  users,
  filteredUsers,
  loading,
  error,
  openDialog,
  setOpenDialog,
  editUser,
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
  departments,
  departmentUsers,
  searchName,
  setSearchName,
  searchDepartment,
  setSearchDepartment,
  searchGender,
  setSearchGender,
  sortNameOrder,
  setSortNameOrder,
}) {
  return (
    <div className="p-6">
      <Typography variant="h4" className="mb-4">Quản lý người dùng</Typography>
      {error && <Typography color="red" className="mb-2">{error}</Typography>}
      {/* Filter & Sort UI */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Tìm kiếm tên</label>
          <input
            className="border rounded px-2 py-1 min-w-[160px]"
            type="text"
            placeholder="Nhập tên..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Phòng ban</label>
          <select
            className="border rounded px-2 py-1 min-w-[140px]"
            value={searchDepartment}
            onChange={e => setSearchDepartment(e.target.value)}
          >
            <option value="">Tất cả</option>
            {departments && departments.map(dep => (
              <option key={dep._id} value={dep._id}>{dep.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Giới tính</label>
          <select
            className="border rounded px-2 py-1 min-w-[100px]"
            value={searchGender}
            onChange={e => setSearchGender(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Sắp xếp tên</label>
          <button
            className="border rounded px-2 py-1 min-w-[80px] bg-gray-100 hover:bg-gray-200"
            onClick={() => setSortNameOrder(sortNameOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortNameOrder === 'asc' ? 'A → Z' : 'Z → A'}
          </button>
        </div>
      </div>
      {loading ? (
        <>
          <div className="flex justify-end mb-4 gap-2">
            <div className="w-32 h-10 bg-gray-100 rounded animate-pulse" />
            <div className="w-32 h-10 bg-gray-100 rounded animate-pulse" />
            <div className="w-32 h-10 bg-gray-100 rounded animate-pulse" />
            <div className="w-40 h-10 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-60 bg-gray-100 rounded animate-pulse my-4" />
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4 gap-2">
            {canEdit && (
              <>
                <button
                  className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 mr-2"
                  onClick={() => setImportDialog(true)}
                >
                  Import
                </button>
                <button
                  className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 mr-2"
                  onClick={() => handleExport('csv')}
                >
                  Export CSV
                </button>
                <button
                  className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 mr-2"
                  onClick={() => handleExport('xlsx')}
                >
                  Export Excel
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
                {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? filteredUsers.map((u) => {
                  try {
                    if (!u || typeof u !== 'object' || !u._id) return null;
                    return (
                      <tr key={u._id} className="border-b">
                        <td className="p-2">{typeof u.username === 'string' ? u.username : ''}</td>
                        <td className="p-2">{typeof u.fullName === 'string' ? u.fullName : ''}</td>
                        <td className="p-2">{typeof u.email === 'string' ? u.email : ''}</td>
                        <td className="p-2">{typeof u.role === 'string' ? u.role : ''}</td>
                        <td className="p-2">{typeof u.department === 'object' && u.department !== null ? u.department.name : u.department}</td>
                        <td className="p-2">{typeof u.position === 'string' ? mapPositionLabel(u.position) : ''}</td>
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
                  } catch {
                    return null;
                  }
                }) : null}
              </tbody>
            </table>
          </Card>
        </>
      )}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="text-xl font-semibold mb-4">{editUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên đăng nhập</label>
                <input
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  disabled={!!editUser}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mật khẩu</label>
                <input
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required={!editUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên</label>
                <input
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vai trò</label>
                <select
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="role"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chức vụ</label>
                <input
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  placeholder="Giam doc, Pho giam doc, Truong phong, Nhan vien"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <input
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phòng ban</label>
                <select
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                >
                  <option value="">Chọn phòng ban</option>
                  {departments && departments.map(dep => (
                    <option key={dep._id} value={dep._id}>{dep.name}</option>
                  ))}
                </select>
              </div>
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
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Cấp trên</label>
                <div className="relative">
                  <select
                    className="w-full min-w-[200px] border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    name="directSupervisor"
                    value={typeof form.directSupervisor === 'object' && form.directSupervisor !== null
                      ? form.directSupervisor._id
                      : form.directSupervisor || ''}
                    onChange={e => setForm(f => ({ ...f, directSupervisor: e.target.value }))}
                    disabled={!form.department}
                  >
                    <option value="">Không</option>
                    {!form.department && (
                      <option value="" disabled>Vui lòng chọn phòng ban trước</option>
                    )}
                    {form.department && departmentUsers.length === 0 && (
                      <option value="" disabled>Không có nhân viên nào trong phòng ban này</option>
                    )}
                    {departmentUsers && departmentUsers.map(sv => (
                      <option key={sv._id} value={sv._id}>{sv.fullName}</option>
                    ))}
                  </select>
                  {form.department && departmentUsers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Phòng ban này chưa có nhân viên nào
                    </p>
                  )}
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
            <div className="text-xl font-semibold mb-4">Import người dùng</div>
            {/* Custom file input */}
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <span className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition text-sm font-medium">Chọn file CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={e => setImportFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <span className="text-gray-700 text-sm">
                {importFile ? importFile.name : 'Chưa chọn file'}
              </span>
            </label>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="rounded-md bg-gray-400 px-4 py-2 text-white hover:bg-gray-500 transition"
                onClick={() => { setImportDialog(false); setImportFile(null); setImportResult(null); }}
              >
                Đóng
              </button>
              <button
                className={`rounded-md px-4 py-2 text-white transition ${importLoading || !importFile ? 'bg-teal-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}
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
                {(() => {
                  const errors = importResult?.errors || importResult?.data?.errors || [];
                  return errors.length > 0 && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                      <div className="font-semibold text-red-700 mb-1">
                        Chi tiết lỗi ({errors.length}):
                      </div>
                      <ul className="text-xs max-h-40 overflow-auto list-disc pl-4">
                        {errors.map((err, idx) => (
                          <li key={idx} className="mb-1">
                            <div><b>Dòng dữ liệu:</b> {JSON.stringify(err.row)}</div>
                            <div><b>Lỗi:</b> {err.error}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 