import React, { useState, memo } from "react";
import StatusDot from "./StatusDot";

const statusColor = {
  approved: "bg-green-500",
  rejected: "bg-red-500",
  pending: "bg-yellow-400",
  inprogress: "bg-blue-400"
};

const statusLabel = {
  approved: "Đã duyệt",
  rejected: "Từ chối",
  pending: "Chờ xử lý",
  inprogress: "Đang thực hiện"
};

const Badge = ({ children, color = "bg-gray-200", className = "" }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color} ${className}`}>{children}</span>
);

function UserTaskAccordion({ user }) {
  const [open, setOpen] = useState(false);
  const [mainOpen, setMainOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  return (
    <div className="bg-white">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-50 transition"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base text-blue-900">{user.fullName}</span>
          <Badge color="bg-blue-100 text-blue-700 border border-blue-300">{user.position}</Badge>
          {user.department?.name && (
            <Badge color="bg-gray-100 text-gray-700 border border-gray-300">{user.department.name}</Badge>
          )}
        </div>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="bg-gray-50 px-3 pb-3 animate-fade-in">
          {/* Nhiệm vụ chính */}
          <div className="mt-2">
            <div
              className="flex items-center gap-2 cursor-pointer hover:underline text-blue-700 font-semibold"
              onClick={() => setMainOpen((o) => !o)}
            >
              <span>•</span>
              <span>Nhiệm vụ chính ({user.mainTasks?.length || 0})</span>
              <span className="text-xs text-gray-400">{mainOpen ? "▲" : "▼"}</span>
            </div>
            {mainOpen && (
              <div className="overflow-x-auto mt-1">
                <table className="w-full text-sm border rounded shadow bg-white">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="p-1 font-bold">Tiêu đề</th>
                      <th className="p-1">Phòng ban</th>
                      <th className="p-1">Trạng thái</th>
                      <th className="p-1">Ngày kết thúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.mainTasks?.map((task) => (
                      <tr key={task._id} className="hover:bg-blue-50 transition">
                        <td className="font-semibold text-blue-800">{task.title}</td>
                        <td>{task.department?.name}</td>
                        <td>
                          <StatusDot status={task.status} />
                          <Badge color={`${statusColor[task.status] || 'bg-gray-300'} text-white ml-1`}>{statusLabel[task.status] || task.status}</Badge>
                        </td>
                        <td className="text-right">{new Date(task.endDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Nhiệm vụ con */}
          <div className="mt-3">
            <div
              className="flex items-center gap-2 cursor-pointer hover:underline text-green-700 font-semibold"
              onClick={() => setSubOpen((o) => !o)}
            >
              <span>•</span>
              <span>Nhiệm vụ con ({user.subTasks?.length || 0})</span>
              <span className="text-xs text-gray-400">{subOpen ? "▲" : "▼"}</span>
            </div>
            {subOpen && (
              <div className="overflow-x-auto mt-1">
                <table className="w-full text-sm border rounded shadow bg-white">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="p-1 font-bold">Tiêu đề</th>
                      <th className="p-1">Phòng ban</th>
                      <th className="p-1">Nhiệm vụ chính</th>
                      <th className="p-1">Trạng thái</th>
                      <th className="p-1">Ngày kết thúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.subTasks?.map((sub) => (
                      <tr key={sub._id} className="hover:bg-green-50 transition">
                        <td className="font-semibold text-green-800">{sub.title}</td>
                        <td>{sub.department?.name}</td>
                        <td>{sub.parentTask?.title}</td>
                        <td>
                          <StatusDot status={sub.status} />
                          <Badge color={`${statusColor[sub.status] || 'bg-gray-300'} text-white ml-1`}>{statusLabel[sub.status] || sub.status}</Badge>
                        </td>
                        <td className="text-right">{new Date(sub.endDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(UserTaskAccordion); 