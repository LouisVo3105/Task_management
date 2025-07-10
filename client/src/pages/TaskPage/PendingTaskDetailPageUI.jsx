import React from "react";
import { Button, Typography } from "@material-tailwind/react";
import StatusDot from "../../components/StatusDot";
import { formatDate } from "../../utils/formatDate";

export default function PendingTaskDetailPageUI({ task, loading, handleFileDownload, navigate, handleApprove, handleReject }) {
  if (loading) {
    return <div className="p-6 text-center">Đang tải chi tiết nhiệm vụ...</div>;
  }
  if (!task) {
    return <div className="p-6 text-center text-red-500">Không tìm thấy thông tin nhiệm vụ.</div>;
  }
  // Xác định người thực hiện dựa trên loại nhiệm vụ
  const isMainTask = !task.parentTask; // Nhiệm vụ chính không có parentTask
  const assigneeName = isMainTask ? task.leader?.fullName : task.assignee?.fullName;

  const details = [
    { label: "Tiêu đề", value: task.title },
    { label: "Nội dung", value: task.content },
    { label: "Người thực hiện", value: assigneeName },
    // Chỉ hiển thị "Người chủ trì" nếu là nhiệm vụ con
    !isMainTask && { label: "Người chủ trì", value: task.leader?.fullName },
    { label: "Phòng ban", value: task.department?.name },
    { label: "Ngày hết hạn", value: formatDate(task.endDate) },
    { label: "Trạng thái", value: <StatusDot status={task.status} size="medium" /> },
    { label: "Ghi chú", value: task.notes },
    task.file && {
      label: "File đính kèm", value: (
        <button
          className="text-teal-600 hover:underline bg-transparent border-none cursor-pointer"
          onClick={() => handleFileDownload(task.file, task.fileName || 'file_dinh_kem')}
        >
          Tải file đính kèm
        </button>
      )
    },
  ].filter(Boolean);
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chi tiết nhiệm vụ chờ duyệt</h1>
        <Button variant="outlined" onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
        <table className="w-full text-left mb-4">
          <tbody>
            {details.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2 pr-4 font-medium whitespace-nowrap w-1/3">{item.label}</td>
                <td className="py-2">{item.value || <span className="text-gray-400">Chưa có</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {task.status === 'submitted' && (
          <div className="flex gap-4 justify-end mt-6">
            <Button color="green" onClick={handleApprove} className="bg-green-600 text-white">Duyệt</Button>
            <Button color="red" onClick={handleReject} className="bg-red-600 text-white">Từ chối</Button>
          </div>
        )}
      </div>
    </div>
  );
} 