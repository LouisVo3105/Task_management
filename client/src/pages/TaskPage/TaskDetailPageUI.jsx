import React from "react";
import { Card, Typography, Button } from "@material-tailwind/react";
import DetailList from "../../components/DetailList/DetailList";
import EditTaskModal from "../../components/modals/EditTaskModal";
import CreateSubtaskModal from "../../components/modals/CreateSubtaskModal";
import SubmitTaskModal from '../../components/modals/SubmitTaskModal';
import StatusDot from "../../components/StatusDot";
import { formatDate, formatDateTime } from "../../utils/formatDate";

export default function TaskDetailPageUI({
  task, loading, openEdit, setOpenEdit, editingTask, setEditingTask, deleteLoading, openCreateSubtask, setOpenCreateSubtask, submissions, fetchData, navigate, handleDeleteTask
}) {
  const [openSubmit, setOpenSubmit] = React.useState(false);
  if (loading) {
    return <div className="p-6 text-center">Đang tải chi tiết nhiệm vụ...</div>;
  }
  if (!task) {
    return <div className="p-6 text-center text-red-500">Không tìm thấy thông tin nhiệm vụ.</div>;
  }
  const isSubtask = !!task?.parentTask;
  const details = [
    { label: "Mã nhiệm vụ", value: task._id },
    { label: "Tiêu đề", value: task.title },
    { label: "Nội dung", value: task.content },
    { label: "Chỉ tiêu", value: task.indicator?.name },
    { label: "Phòng ban", value: task.department?.name },
    { label: "Người chủ trì", value: task.leader?.fullName },
    { label: "Ngày kết thúc", value: formatDate(task.endDate) },
    { label: "Trạng thái", value: <StatusDot status={task.status} size="medium" /> },
    { label: "Ghi chú", value: task.notes },
    Array.isArray(task.supporters) && task.supporters.length > 0 && { label: "Người hỗ trợ", value: task.supporters.map(s => s.fullName).join(', ') },
    // Thêm lại trường file đính kèm đúng định dạng:
    {
      label: "File đính kèm",
      value: (task.file && typeof task.file === 'string') ? (
        <a
          href={`http://localhost:3056/${task.file.replace(/\\/g, "/")}`}
          target="_blank"
          rel="noopener noreferrer"
          download={task.fileName || 'file_nop_bai'}
          className="text-teal-500 hover:underline"
        >
          {task.fileName || 'Tải file đính kèm'}
        </a>
      ) : (
        <span className="text-gray-400">Không có file đính kèm</span>
      )
    },
  ].filter(Boolean);
  // Giả sử user hiện tại là admin/manager và là người quản lý nhiệm vụ (bạn có thể thay đổi logic này nếu có useAuth)
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const canEditOrDelete = user && (
    user.role === 'admin' ||
    user.role === 'director' ||
    (task.leader && user._id === task.leader._id)
  );
  const isTaskLocked = task.status === 'submitted' || task.status === 'approved';

  return (
    <div className="max-w-2xl mx-auto p-6">
      <EditTaskModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        task={editingTask}
        onUpdated={() => {
          setOpenEdit(false);
          fetchData();
        }}
      />
      <CreateSubtaskModal
        open={openCreateSubtask}
        onClose={() => setOpenCreateSubtask(false)}
        onCreated={() => {
          setOpenCreateSubtask(false);
          fetchData();
        }}
        parentTaskId={task._id}
        indicatorId={task.indicator?._id}
        managers={task.managers || []}
        supporters={task.supporters || []}
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isSubtask ? 'Chi tiết nhiệm vụ con' : 'Chi tiết nhiệm vụ chính'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outlined" onClick={() => navigate(-1)}>Quay lại</Button>
          {canEditOrDelete && !isTaskLocked && (
            <>
              <button
                className="rounded-md bg-teal-600 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-teal-700 ml-2"
                onClick={() => { setEditingTask(task); setOpenEdit(true); }}
                type="button"
              >
                Sửa
              </button>
              <button
                className="rounded-md bg-red-600 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-red-700 ml-2"
                onClick={() => handleDeleteTask(task)}
                type="button"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </>
          )}
        </div>
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
      </div>
      {isSubtask && task.status !== 'submitted' && task.status !== 'approved' && (
        <div className="flex justify-end mt-6">
          <button
            className="rounded-md bg-teal-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            onClick={() => setOpenSubmit(true)}
            type="button"
          >
            Nộp nhiệm vụ
          </button>
          <SubmitTaskModal
            open={openSubmit}
            onClose={() => setOpenSubmit(false)}
            onSubmitted={fetchData}
            taskId={task._id}
          />
        </div>
      )}
      {/* Bảng lịch sử nộp bài */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-2">Lịch sử nộp bài</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-4">Thời gian</th>
              <th className="py-2 pr-4">Ghi chú</th>
              <th className="py-2 pr-4">File</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(submissions) && submissions.length > 0 ? (
              submissions.map((s, idx) => (
                <tr key={s._id || idx} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(s.submittedAt)}</td>
                  <td className="py-2 pr-4">{s.note || <span className="text-gray-400">Không có</span>}</td>
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
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-400">Chưa có lịch sử nộp bài</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Bảng nhiệm vụ con */}
      {!isSubtask && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Danh sách nhiệm vụ con</h2>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
              onClick={() => setOpenCreateSubtask(true)}
              type="button"
            >
              Thêm nhiệm vụ con
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2 pr-4">Tiêu đề</th>
                <th className="py-2 pr-4">Người thực hiện</th>
                <th className="py-2 pr-4">Ngày hết hạn</th>
                <th className="py-2 pr-4">Trạng thái</th>
                <th className="py-2 pr-4">Chi tiết</th>
                <th className="py-2 pr-4">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(task.subTasks) && task.subTasks.length > 0 ? (
                task.subTasks.map((sub, idx) => (
                  <tr key={sub._id || idx} className="border-t">
                    <td className="py-2 pr-4">{sub.title}</td>
                    <td className="py-2 pr-4">{sub.assignee?.fullName || ''}</td>
                    <td className="py-2 pr-4">{formatDate(sub.endDate)}</td>
                    <td className="py-2 pr-4">
                      <StatusDot status={sub.status} size="medium" />
                    </td>
                    <td className="py-2 pr-4">
                      <Button
                        variant="text"
                        size="sm"
                        color="blue"
                        onClick={() => navigate(`/tasks/${sub._id}`)}
                      >
                        Xem chi tiết
                      </Button>
                    </td>
                    <td className="py-2 pr-4 space-x-2 flex">
                      <button
                        className="rounded-md bg-teal-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-green-700"
                        onClick={() => { setEditingTask(sub); setOpenEdit(true); }}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700"
                        onClick={() => handleDeleteTask(sub)}
                        type="button"
                        disabled={deleteLoading}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">Chưa có nhiệm vụ con</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 