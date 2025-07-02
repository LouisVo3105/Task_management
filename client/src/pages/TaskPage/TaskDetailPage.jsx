import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Typography, Button } from "@material-tailwind/react";
import DetailList from "../../components/DetailList/DetailList";
import EditTaskModal from "../../components/modals/EditTaskModal";
import { authFetch } from "../../utils/authFetch";
import CreateSubtaskModal from "../../components/modals/CreateSubtaskModal";

const SUBTASK_TABLE_HEAD = ["Mã NV con", "Tiêu đề", "Người thực hiện", "Ngày hết hạn", "Trạng thái", "Hành động"];

const TaskDetailPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitNote, setSubmitNote] = useState("");
  const [submitLink, setSubmitLink] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openCreateSubtask, setOpenCreateSubtask] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      // Fetch main task details
      const taskRes = await fetch(`http://localhost:3056/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const taskData = await taskRes.json();
      console.log('Dữ liệu chi tiết nhiệm vụ trả về:', taskData);
      setTask(taskData.data);
    } catch {
      console.error("Failed to fetch task details:");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [taskId]);

  if (loading) {
    return <div className="p-6 text-center">Đang tải chi tiết nhiệm vụ...</div>;
  }

  if (!task) {
    return <div className="p-6 text-center text-red-500">Không tìm thấy thông tin nhiệm vụ.</div>;
  }

  const isSubtask = !!task?.parentTask;
  const details = isSubtask ? [
    { label: "Mã nhiệm vụ con", value: task.code },
    { label: "Tiêu đề", value: task.title },
    { label: "Nhiệm vụ cha", value: task.parentTask?.title },
    { label: "Chỉ tiêu", value: task.indicator?.name },
    { label: "Người thực hiện", value: task.assignee?.fullName },
    { label: "Người giao", value: task.assigner?.fullName },
    { label: "Ngày hết hạn", value: task.endDate ? new Date(task.endDate).toLocaleDateString() : undefined },
    { label: "Trạng thái", value: task.status },
    { label: "Ghi chú", value: task.notes },
    task.submitLink && { label: "Link báo cáo", value: <a href={task.submitLink} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">{task.submitLink}</a> },
    task.submitNote && { label: "Ghi chú", value: task.submitNote },
  ].filter(Boolean) : [
    { label: "Mã nhiệm vụ", value: task.code },
    { label: "Tiêu đề", value: task.title },
    { label: "Chỉ tiêu", value: task.indicator?.name },
    { label: "Người giao", value: task.assigner?.fullName },
    { label: "Người quản lý", value: Array.isArray(task.managers) ? task.managers.map(m => m.fullName).join(', ') : undefined },
    { label: "Ngày kết thúc", value: task.endDate ? new Date(task.endDate).toLocaleDateString() : undefined },
    { label: "Trạng thái", value: task.status },
    { label: "Ghi chú", value: task.notes },
    task.submitLink && { label: "Link báo cáo", value: <a href={task.submitLink} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">{task.submitLink}</a> },
    task.submitNote && { label: "Ghi chú", value: task.submitNote },
  ].filter(Boolean);

  // Giả sử user hiện tại là admin/manager và là người quản lý nhiệm vụ (bạn có thể thay đổi logic này nếu có useAuth)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrManager = user && (user.role === 'admin' || user.role === 'manager');
  const isManagerOfTask = isAdminOrManager && (task?.managers?.some(m => m._id === user._id) || task?.assigner?._id === user._id);
  const canEditOrDelete = isManagerOfTask;

  const handleDelete = async (taskToDelete) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhiệm vụ '${taskToDelete.title}'?`)) return;
    setDeleteLoading(true);
    try {
      const res = await authFetch(`http://localhost:3056/api/tasks/${taskToDelete._id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Xóa thất bại");
      }
      if (taskToDelete._id === task._id) {
        navigate(-1); // Nếu xóa chính nhiệm vụ này thì quay lại
      } else {
        fetchData(); // Nếu xóa subtask thì reload lại
      }
    } catch (err) {
      alert(err.message);
    }
    setDeleteLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <EditTaskModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        task={editingTask}
        onUpdated={fetchData}
      />
      <CreateSubtaskModal
        open={openCreateSubtask}
        onClose={() => setOpenCreateSubtask(false)}
        onCreated={fetchData}
        parentTaskId={task._id}
        indicatorId={task.indicator?._id}
        managers={task.managers || []}
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isSubtask ? 'Chi tiết nhiệm vụ con' : 'Chi tiết nhiệm vụ chính'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outlined" onClick={() => navigate(-1)}>Quay lại</Button>
          {canEditOrDelete && (
            <>
              <button
                className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none ml-2"
                onClick={() => { setEditingTask(task); setOpenEdit(true); }}
                type="button"
              >
                Sửa
              </button>
              <button
                className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none ml-2"
                onClick={() => handleDelete(task)}
                disabled={deleteLoading}
                type="button"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </>
          )}
        </div>
      </div>
      <DetailList items={details} />
      {canEditOrDelete && !isSubtask && (
        <div className="flex justify-end mt-6">
          <button
            className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            onClick={() => setOpenCreateSubtask(true)}
            type="button"
          >
            Thêm nhiệm vụ con
          </button>
        </div>
      )}
      {isSubtask && task.status !== 'submitted' && task.status !== 'approved' && (
        <form
          className="mt-6 bg-gray-50 rounded-lg p-4 border"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitLoading(true);
            setSubmitError("");
            try {
              const res = await fetch(`http://localhost:3056/api/tasks/${task._id}/submit`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({ submitNote, submitLink }),
              });
              const data = await res.json();
              if (!res.ok) {
                setSubmitError(data.message || 'Có lỗi xảy ra khi nộp nhiệm vụ');
              } else {
                window.location.reload();
              }
            } catch {
              setSubmitError('Có lỗi xảy ra khi nộp nhiệm vụ');
            }
            setSubmitLoading(false);
          }}
        >
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Link báo cáo</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={submitLink}
              onChange={e => setSubmitLink(e.target.value)}
              required
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={submitNote}
              onChange={e => setSubmitNote(e.target.value)}
              required
            />
          </div>
          {submitError && <div className="text-red-600 mb-2">{submitError}</div>}
          <div className="flex justify-end">
            <Button
              className="bg-teal-600 text-white"
              type="submit"
              disabled={submitLoading}
            >
              {submitLoading ? 'Đang nộp...' : 'Submit'}
            </Button>
          </div>
        </form>
      )}
      {!isSubtask && Array.isArray(task?.subTasks) && task.subTasks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Danh sách nhiệm vụ con</h2>
          </div>
          <table className="w-full text-left mb-4">
            <thead>
              <tr>
                <th className="py-2 pr-4">Mã NV con</th>
                <th className="py-2 pr-4">Tiêu đề</th>
                <th className="py-2 pr-4">Người thực hiện</th>
                <th className="py-2 pr-4">Ngày hết hạn</th>
                <th className="py-2 pr-4">Trạng thái</th>
                {canEditOrDelete && <th className="py-2 pr-4">Hành động</th>}
              </tr>
            </thead>
            <tbody>
              {task.subTasks.map((st) => (
                <tr key={st._id}>
                  <td className="py-2 pr-4">{st.code}</td>
                  <td className="py-2 pr-4">{st.title}</td>
                  <td className="py-2 pr-4">{st.assignee?.fullName}</td>
                  <td className="py-2 pr-4">{st.endDate ? new Date(st.endDate).toLocaleDateString() : ''}</td>
                  <td className="py-2 pr-4">{st.status}</td>
                  {canEditOrDelete && (
                    <td className="py-2 pr-4 flex gap-2">
                      <button
                        className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        onClick={() => { setEditingTask(st); setOpenEdit(true); }}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        onClick={() => handleDelete(st)}
                        disabled={deleteLoading}
                        type="button"
                      >
                        {deleteLoading ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TaskDetailPage; 