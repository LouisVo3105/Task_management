import React from "react";
import { Button, Typography } from "@material-tailwind/react";

const PendingTaskDetailModal = ({ open, onClose, task }) => {
  console.log('PendingTaskDetailModal render', { open, task });
  if (!open || !task) return null;

  const details = [
    { label: task.parentTask ? "Mã nhiệm vụ con" : "Mã nhiệm vụ", value: task.code },
    { label: "Tiêu đề", value: task.title },
    task.parentTask && { label: "Nhiệm vụ cha", value: task.parentTask.title || task.parentTask },
    { label: "Chỉ tiêu", value: task.indicator?.name },
    { label: "Người thực hiện", value: task.assignee?.fullName },
    { label: "Người giao", value: task.assigner?.fullName },
    { label: "Ngày hết hạn", value: task.endDate ? new Date(task.endDate).toLocaleDateString() : undefined },
    { label: "Trạng thái", value: task.status },
    { label: "Ghi chú", value: task.notes },
    task.submitLink && { label: "Link nộp bài", value: <a href={task.submitLink} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">{task.submitLink}</a> },
    task.submitNote && { label: "Ghi chú nộp bài", value: task.submitNote },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 border border-gray-200">
        <div className="text-xl font-semibold mb-4">Chi tiết nhiệm vụ chờ duyệt</div>
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
        <div className="flex justify-end">
          <Button variant="text" color="gray" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </div>
  );
};

export default PendingTaskDetailModal; 