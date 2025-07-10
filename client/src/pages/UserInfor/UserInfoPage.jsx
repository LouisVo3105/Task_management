import React from "react";
import { useAuth } from '../../utils/useAuth';
import { mapPositionLabel } from '../../utils/positionLabel';

const UserInfo = () => {
  const { user } = useAuth();

  if (!user) return <div>Không có thông tin người dùng.</div>;

  return (
    <div>
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
        <p className="font-sans antialiased text-base text-inherit font-semibold mb-1">Thông Tin Người Dùng</p>
        <p className="font-sans antialiased text-sm text-stone-600">Thông tin tài khoản của bạn:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-8 gap-6">
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Họ tên</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{user.fullName}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Email</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{user.email}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Giới tính</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{user.gender}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Chức vụ</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{mapPositionLabel(user.position)}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Phòng ban</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{typeof user.department === 'object' && user.department !== null ? user.department.name : user.department}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Số điện thoại</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{user.phoneNumber}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Quyền</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{user.role}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Trạng thái</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{user.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</div>
          </div>
          <div className="space-y-1">
            <label className="block mb-1 text-sm font-semibold antialiased text-stone-800">Trực thuộc</label>
            <div className="py-2 px-2.5 bg-gray-100 rounded-lg">{user.directSupervisor ? user.directSupervisor.fullName : 'Không có'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;

//

//