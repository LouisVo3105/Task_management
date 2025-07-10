import React from "react";

const StatusDot = ({ status, size = "small" }) => {
  const statusConfig = {
    pending: { color: "bg-yellow-500", text: "Đang thực hiện" },
    submitted: { color: "bg-blue-500", text: "Đã nộp" },
    approved: { color: "bg-green-500", text: "Đã duyệt" },
    rejected: { color: "bg-red-500", text: "Từ chối" },
    in_progress: { color: "bg-cyan-500", text: "Đang làm" },
    completed: { color: "bg-purple-500", text: "Hoàn thành" },
    overdue: { color: "bg-red-500", text: "Quá deadline" },
  };

  const config = statusConfig[status] || { color: "bg-gray-500", text: status || "Không xác định" };

  const sizeClasses = {
    small: "w-2 h-2",
    medium: "w-3 h-3",
    large: "w-4 h-4"
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${config.color} ${sizeClasses[size]} rounded-full`} title={config.text}></div>
      <span className="text-sm">{config.text}</span>
    </div>
  );
};

export default StatusDot; 