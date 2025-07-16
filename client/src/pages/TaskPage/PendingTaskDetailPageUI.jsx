import React from "react";
import { Button, Typography } from "@material-tailwind/react";
import StatusDot from "../../components/StatusDot";
import { formatDate } from "../../utils/formatDate";
import { useState } from "react";
import { Input, Dialog, DialogHeader, DialogBody, DialogFooter } from "@material-tailwind/react";
import IndicatorComments from "../../components/IndicatorComments";

export default function PendingTaskDetailPageUI({ task, loading, handleFileDownload, navigate, handleApproveSubmission, handleRejectSubmission }) {
  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState('approve');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [comment, setComment] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

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
  // Render bảng lịch sử nộp bài nếu có submissions
  const submissions = Array.isArray(task.submissions) ? task.submissions : [];

  return (
    <div className="w-full px-6 mx-auto">
      <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold">Chi tiết nhiệm vụ chờ duyệt</h1>
        <Button variant="outlined" onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto w-full">
        {/* Thông tin chi tiết */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex-1 min-w-[320px]">
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
          {/* Nút Duyệt/Từ chối cho submission đang chờ */}
          {submissions.some(s => s.approvalStatus === 'pending') && (
            <div className="flex gap-4 mt-4">
              <Button size="md" color="green" onClick={() => {
                const s = submissions.find(s => s.approvalStatus === 'pending');
                setSelectedSubmission(s); setModalType('approve'); setOpenModal(true);
              }}>Duyệt</Button>
              <Button size="md" color="red" onClick={() => {
                const s = submissions.find(s => s.approvalStatus === 'pending');
                setSelectedSubmission(s); setModalType('reject'); setOpenModal(true);
              }}>Từ chối</Button>
            </div>
          )}
        </div>
        {/* Bảng lịch sử nộp bài */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 flex-1 min-w-[320px]">
          <h3 className="text-base font-semibold mb-2">Lịch sử nộp bài</h3>
          {submissions.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-4">Thời gian</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2 pr-4">Ghi chú</th>
                  <th className="py-2 pr-4">File</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, idx) => (
                  <tr key={s._id || idx} className="border-t">
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDate(s.submittedAt)}</td>
                    <td className="py-2 pr-4">
                      {s.approvalStatus === 'approved' && <span className="text-green-600">Đã duyệt</span>}
                      {s.approvalStatus === 'rejected' && <span className="text-red-600">Bị từ chối</span>}
                      {s.approvalStatus === 'pending' && <span className="text-yellow-600">Đang chờ</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {s.approvalStatus === 'rejected' && s.approvalComment ? (
                        <span className="text-red-600">{s.approvalComment}</span>
                      ) : s.approvalStatus === 'approved' ? (
                        <span className="text-green-600">Đã duyệt</span>
                      ) : (s.note || <span className="text-gray-400">Chưa có</span>)}
                    </td>
                    <td className="py-2 pr-4">
                      {s.file ? (
                        (typeof s.file === 'string' && (s.file.startsWith('http') || s.file.startsWith('/') || s.file.includes('uploads'))) ? (
                          <a
                            href={s.file.startsWith('http') ? s.file : `http://localhost:3056/${s.file.replace(/\\/g, "/")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={s.fileName || `nopbai_${idx + 1}`}
                            className="text-teal-600 hover:underline"
                          >
                            Tải file
                          </a>
                        ) : (
                          <span className="text-gray-400">Không có file</span>
                        )
                      ) : s.link ? (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:underline"
                        >
                          Tải file
                        </a>
                      ) : (
                        <span className="text-gray-400">Không có</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-400">Chưa có lịch sử nộp bài</div>
          )}
        </div>
      </div>
      {/* Không gian bình luận chỉ tiêu */}
      {task.indicator && (
        <div className="mt-8 max-w-6xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Bình luận chỉ tiêu</h2>
          <IndicatorComments indicatorId={task.indicator._id || task.indicator} />
        </div>
      )}
      {/* Modal nhập nhận xét/lý do */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-semibold">
                {modalType === 'approve' ? 'Duyệt submission' : 'Từ chối submission'}
              </div>
              <button
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold absolute top-3 right-4"
                onClick={() => { setOpenModal(false); setComment(""); }}
              >
                ×
              </button>
            </div>
            <div className="mb-4">
              <Input
                label={modalType === 'approve' ? 'Nhận xét (bắt buộc)' : 'Lý do từ chối (bắt buộc)'}
                value={comment}
                onChange={e => setComment(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="text" color="gray" onClick={() => { setOpenModal(false); setComment(""); }}>Hủy</Button>
              <Button
                color={modalType === 'approve' ? 'green' : 'red'}
                onClick={async () => {
                  if (!selectedSubmission || !comment) return;
                  setModalLoading(true);
                  if (modalType === 'approve') {
                    await handleApproveSubmission(selectedSubmission._id, comment);
                  } else {
                    await handleRejectSubmission(selectedSubmission._id, comment);
                  }
                  setModalLoading(false);
                  setOpenModal(false);
                  setComment("");
                }}
                disabled={!comment || modalLoading}
              >
                {modalLoading ? 'Đang xử lý...' : (modalType === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 