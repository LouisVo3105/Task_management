import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Typography,
  Select as MTSelect,
  Option,
} from "@material-tailwind/react";
import ReactSelect from "react-select";

const CreateSubtaskModal = ({ open, onClose, onCreated, parentTaskId, indicatorId, managers }) => {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [assignerId, setAssignerId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch("http://localhost:3056/api/users/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data.data?.docs || data.data || []);
      } catch {
        setUsers([]);
      }
    };
    if (open) fetchUsers();
  }, [open]);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:3056/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          title,
          endDate,
          indicatorId,
          notes,
          assignerId,
          assigneeId,
          parentTaskId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCode("");
        setTitle("");
        setEndDate("");
        setNotes("");
        setAssignerId("");
        setAssigneeId("");
        onCreated && onCreated();
        onClose();
      } else {
        setError(data.message || "Tạo nhiệm vụ con thất bại");
      }
    } catch (e) {
      setError("Lỗi kết nối máy chủ");
    }
    setLoading(false);
  };

  if (!open) return null;

  // Chuẩn bị options cho react-select (nếu muốn dùng cho assignee)
  const assigneeOptions = users.map(u => ({ value: u._id, label: `${u.fullName} (${u.email})` }));
  const selectedAssignee = assigneeOptions.find(opt => opt.value === assigneeId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="text-xl font-semibold mb-4">Tạo nhiệm vụ con</div>
        <div className="space-y-4">
          <Input label="Mã nhiệm vụ con" value={code} onChange={e => setCode(e.target.value)} required />
          <Input label="Tiêu đề" value={title} onChange={e => setTitle(e.target.value)} required />
          <Input label="Ngày kết thúc" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          <Input label="Ghi chú" value={notes} onChange={e => setNotes(e.target.value)} />
          <MTSelect label="Người giao" value={assignerId} onChange={setAssignerId} required>
            {managers.map(u => (
              <Option key={u._id} value={u._id}>{u.fullName} ({u.email})</Option>
            ))}
          </MTSelect>
          <div>
            <div className="mb-1 font-medium text-sm">Người thực hiện:</div>
            <ReactSelect
              options={assigneeOptions}
              value={selectedAssignee}
              onChange={opt => setAssigneeId(opt ? opt.value : "")}
              placeholder="Chọn người thực hiện..."
              classNamePrefix="react-select"
              styles={{
                menu: base => ({ ...base, zIndex: 9999 }),
                control: base => ({ ...base, minHeight: 40 }),
              }}
            />
          </div>
          {error && <Typography color="red" className="text-sm">{error}</Typography>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button className="bg-teal-600 text-white" onClick={handleCreate} disabled={loading || !code || !title || !endDate || !assignerId || !assigneeId}>
            {loading ? "Đang tạo..." : "Tạo nhiệm vụ con"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSubtaskModal; 