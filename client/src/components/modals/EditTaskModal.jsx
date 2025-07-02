import React, { useEffect, useState } from "react";
import Select from "react-select";
import { authFetch } from "../../utils/authFetch";

const EditTaskModal = ({ open, onClose, task, onUpdated }) => {
  const [title, setTitle] = useState("");
  const [endDate, setEndDate] = useState("");
  const [indicatorId, setIndicatorId] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [notes, setNotes] = useState("");
  const [indicators, setIndicators] = useState([]);
  const [users, setUsers] = useState([]);
  const [parentTasks, setParentTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSubtask = !!task?.parentTask;

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setEndDate(task.endDate ? task.endDate.slice(0, 10) : "");
      setIndicatorId(task.indicator?._id || "");
      setParentTaskId(task.parentTask?._id || "");
      setAssigneeId(task.assignee?._id || "");
      setNotes(task.notes || "");
    }
  }, [task]);

  useEffect(() => {
    if (!open) return;
    // Lấy danh sách chỉ tiêu
    authFetch("http://localhost:3056/api/indicators")
      .then(res => res.json())
      .then(data => setIndicators(data.data?.docs || []));
    // Lấy danh sách user
    authFetch("http://localhost:3056/api/users/all")
      .then(res => res.json())
      .then(data => setUsers(data.data || []));
  }, [open]);

  useEffect(() => {
    if (isSubtask && indicatorId) {
      // Lấy danh sách nhiệm vụ cha theo chỉ tiêu
      authFetch(`http://localhost:3056/api/indicators/${indicatorId}/tasks`)
        .then(res => res.json())
        .then(data => setParentTasks(data.data?.tasks?.filter(t => t._id !== task._id) || []));
    } else {
      setParentTasks([]);
    }
  }, [indicatorId, isSubtask, task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {};
      if (title !== task.title) body.title = title;
      if (endDate && endDate !== (task.endDate ? task.endDate.slice(0, 10) : "")) body.endDate = endDate;
      if (indicatorId && indicatorId !== (task.indicator?._id || "")) body.indicatorId = indicatorId;
      if (isSubtask && parentTaskId && parentTaskId !== (task.parentTask?._id || "")) body.parentTaskId = parentTaskId;
      if (isSubtask && assigneeId && assigneeId !== (task.assignee?._id || "")) body.assigneeId = assigneeId;
      if (notes !== (task.notes || "")) body.notes = notes;
      // Không cho phép cập nhật code
      const res = await authFetch(`http://localhost:3056/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Cập nhật thất bại");
      }
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">Cập nhật nhiệm vụ</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block mb-1 font-medium">Tên nhiệm vụ</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="block mb-1 font-medium">Ngày hết hạn</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="block mb-1 font-medium">Chỉ tiêu</label>
            <Select
              options={indicators.map(i => ({ value: i._id, label: `${i.code} - ${i.name}` }))}
              value={indicators.find(i => i._id === indicatorId) ? { value: indicatorId, label: indicators.find(i => i._id === indicatorId).name } : null}
              onChange={opt => setIndicatorId(opt?.value || "")}
              isClearable
            />
          </div>
          {isSubtask && (
            <>
              <div className="mb-3">
                <label className="block mb-1 font-medium">Nhiệm vụ cha</label>
                <Select
                  options={parentTasks.map(t => ({ value: t._id, label: t.title }))}
                  value={parentTasks.find(t => t._id === parentTaskId) ? { value: parentTaskId, label: parentTasks.find(t => t._id === parentTaskId).title } : null}
                  onChange={opt => setParentTaskId(opt?.value || "")}
                  isClearable
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">Người thực hiện</label>
                <Select
                  options={users.map(u => ({ value: u._id, label: u.fullName || u.username }))}
                  value={users.find(u => u._id === assigneeId) ? { value: assigneeId, label: users.find(u => u._id === assigneeId).fullName || users.find(u => u._id === assigneeId).username } : null}
                  onChange={opt => setAssigneeId(opt?.value || "")}
                  isClearable
                />
              </div>
            </>
          )}
          <div className="mb-3">
            <label className="block mb-1 font-medium">Ghi chú</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 py-2 px-4 text-xs font-bold uppercase text-white shadow-md transition-all hover:bg-teal-800 active:opacity-[0.85] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal; 