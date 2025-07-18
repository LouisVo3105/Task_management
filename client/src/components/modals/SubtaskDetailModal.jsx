import React, { useEffect, useState } from "react";
import {
  Button,
  Typography,
} from "@material-tailwind/react";
import DetailList from "../DetailList/DetailList";
import SubmitTaskModal from "./SubmitTaskModal";
import ApproveTaskModal from "./ApproveTaskModal";
import StatusDot from "../StatusDot";
import { formatDate, formatDateTime } from "../../utils/formatDate";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL



const SubtaskDetailModal = ({ open, handleOpen, subtaskId, parentTaskId }) => {
  const [subtask, setSubtask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openSubmit, setOpenSubmit] = useState(false);
  const [openApprove, setOpenApprove] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Giả sử user lấy từ localStorage (hoặc context nếu có)
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const token = sessionStorage.getItem('accessToken');

  const fetchSubtask = async () => {
    if (!subtaskId) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/tasks/${subtaskId}`, {
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

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!open || !parentTaskId || !subtaskId) return;
      setLoadingSubmissions(true);
      try {
        const res = await fetch(`${BASE_URL}/api/tasks/${parentTaskId}/subtasks/${subtaskId}/submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setSubmissions(data.data || []);
        } else {
          setSubmissions([]);
        }
      } catch {
        setSubmissions([]);
      }
      setLoadingSubmissions(false);
    };
    fetchSubmissions();
  }, [open, parentTaskId, subtaskId]);

  const details = subtask ? [
    { label: "Mã nhiệm vụ con", value: subtask.code },
    { label: "Tiêu đề", value: subtask.title },
    { label: "Nội dung", value: subtask.content },
    { label: "Nhiệm vụ cha", value: subtask.parentTask?.title || "N/A" },
    { label: "Chỉ tiêu", value: subtask.indicator?.name || "N/A" },
    { label: "Người thực hiện", value: subtask.assignee?.fullName || "N/A" },
    { label: "Người giao", value: subtask.assigner?.fullName || "N/A" },
    { label: "Ngày hết hạn", value: formatDate(subtask.endDate) },
    { label: "Trạng thái", value: <StatusDot status={subtask.status} size="medium" /> },
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
            {/* Lịch sử nộp bài */}
            <div className="mt-6">
              <div className="font-semibold mb-2">Lịch sử nộp bài</div>
              {loadingSubmissions ? (
                <Typography>Đang tải lịch sử nộp...</Typography>
              ) : submissions.length === 0 ? (
                <Typography className="text-gray-500">Chưa có lịch sử nộp bài.</Typography>
              ) : (
                <div className="border rounded p-2 max-h-60 overflow-y-auto bg-gray-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-1 pr-2">Thời gian</th>
                        <th className="text-left py-1 pr-2">Ghi chú</th>
                        <th className="text-left py-1 pr-2">File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="py-1 pr-2 whitespace-nowrap">{formatDateTime(s.submittedAt)}</td>
                          <td className="py-1 pr-2">{s.note || <span className="text-gray-400">Không có</span>}</td>
                          <td className="py-1 pr-2">
                            {s.link ? (
                              <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Xem file</a>
                            ) : s.file ? (
                              (typeof s.file === 'string' && (s.file.startsWith('http') || s.file.startsWith('/') || s.file.includes('uploads'))) ? (
                                <a
                                  href={s.file.startsWith('http') ? s.file : `${BASE_URL}/${s.file.replace(/\\/g, "/")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={s.fileName || `nopbai_${idx + 1}`}
                                  className="text-teal-600 hover:underline"
                                >
                                  Tải file
                                </a>
                              ) : (
                                <span className="text-gray-400">Không có</span>
                              )
                            ) : (
                              <span className="text-gray-400">Không có</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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