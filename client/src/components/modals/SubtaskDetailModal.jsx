import React, { useEffect, useState } from "react";
import {
  Button,
  Typography,
} from "@material-tailwind/react";
import DetailList from "../DetailList/DetailList";
import SubmitTaskModal from "./SubmitTaskModal";
import ApproveTaskModal from "./ApproveTaskModal";

const SubtaskDetailModal = ({ open, handleOpen, subtaskId }) => {
  const [subtask, setSubtask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openSubmit, setOpenSubmit] = useState(false);
  const [openApprove, setOpenApprove] = useState(false);

  // Giả sử user lấy từ localStorage (hoặc context nếu có)
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchSubtask = async () => {
    if (!subtaskId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:3056/api/tasks/${subtaskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubtask(data.data);
      } else {
        setSubtask(null);
      }
    } catch (error) {
      console.error("Failed to fetch subtask:", error);
      setSubtask(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchSubtask();
    // eslint-disable-next-line
  }, [subtaskId, open]);

  const details = subtask ? [
    { label: "Mã nhiệm vụ con", value: subtask.code },
    { label: "Tiêu đề", value: subtask.title },
    { label: "Nhiệm vụ cha", value: subtask.parentTask?.title || "N/A" },
    { label: "Chỉ tiêu", value: subtask.indicator?.name || "N/A" },
    { label: "Người thực hiện", value: subtask.assignee?.fullName || "N/A" },
    { label: "Người giao", value: subtask.assigner?.fullName || "N/A" },
    { label: "Ngày hết hạn", value: new Date(subtask.endDate).toLocaleDateString() },
    { label: "Trạng thái", value: subtask.status },
    { label: "Ghi chú", value: subtask.notes, fullWidth: true },
    { label: "Link nộp bài", value: subtask.submitLink ? <a href={subtask.submitLink} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">{subtask.submitLink}</a> : "Chưa có", fullWidth: true },
    { label: "Ghi chú nộp bài", value: subtask.submitNote, fullWidth: true },
  ] : [];

  if (!open) return null;

  // Điều kiện hiển thị nút Nộp
  const canSubmit = subtask && user && user._id === subtask.assignee?._id && subtask.status !== 'submitted' && subtask.status !== 'approved';
  // Điều kiện hiển thị nút Duyệt
  const isManager = user && (user.role === 'admin' || user.role === 'manager');
  const parentManagers = subtask?.parentTask?.managers || [];
  const isParentManager = parentManagers.some(m => m._id === user._id);
  const canApprove = subtask && isManager && isParentManager && subtask.status === 'submitted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="text-xl font-semibold mb-4">Chi tiết nhiệm vụ con</div>
        {loading ? (
          <Typography>Đang tải...</Typography>
        ) : subtask ? (
          <>
            <DetailList items={details} />
            <div className="flex justify-end gap-2 mt-6">
              {canSubmit && (
                <Button className="bg-teal-600 text-white" onClick={() => setOpenSubmit(true)}>Nộp</Button>
              )}
              {canApprove && (
                <Button className="bg-teal-600 text-white" onClick={() => setOpenApprove(true)}>Duyệt</Button>
              )}
              <Button variant="text" color="gray" onClick={handleOpen}>
                <span>Đóng</span>
              </Button>
            </div>
          </>
        ) : (
          <Typography color="red">Không thể tải chi tiết nhiệm vụ con.</Typography>
        )}
      </div>
      <SubmitTaskModal
        open={openSubmit}
        onClose={() => setOpenSubmit(false)}
        onSubmitted={fetchSubtask}
        taskId={subtaskId}
      />
      <ApproveTaskModal
        open={openApprove}
        onClose={() => setOpenApprove(false)}
        onApproved={fetchSubtask}
        taskId={subtaskId}
      />
    </div>
  );
};

export default SubtaskDetailModal; 