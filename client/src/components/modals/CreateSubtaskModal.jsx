import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Typography,
  Select as MTSelect,
  Option,
} from "@material-tailwind/react";
import ReactSelect from "react-select";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL



const CreateSubtaskModal = ({ open, onClose, onCreated, parentTaskId, supporters = [] }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState("");
  const [departmentUsers, setDepartmentUsers] = useState([]);

  useEffect(() => {
    if (leaderId) {
      // Tìm leader trong supporters
      const leader = (supporters || []).find(u => u._id === leaderId);
      // Lấy departmentId từ leader
      const departmentId = leader?.department?._id || leader?.department;
      // Xác định leader là Giám đốc, Phó Giám đốc, admin nếu không có departmentId
      if (!departmentId) {
        // Lấy tất cả departmentId của supporter (lọc trùng)
        const allDepartmentIds = Array.from(
          new Set(
            (supporters || [])
              .map(u => u.department?._id || u.department)
              .filter(Boolean)
          )
        );
        if (allDepartmentIds.length > 0) {
          const fetchAll = async () => {
            try {
              const token = sessionStorage.getItem('accessToken');
              // Fetch song song tất cả phòng ban
              const results = await Promise.all(
                allDepartmentIds.map(depId =>
                  fetch(`${BASE_URL}/api/departments/${depId}/supporters`, {
                    headers: { Authorization: `Bearer ${token}` }
                  })
                    .then(res => res.json())
                    .then(data => (data.success && Array.isArray(data.data)) ? data.data : [])
                    .catch(() => [])
                )
              );
              // Gộp tất cả supporter lại, loại trùng theo _id
              const merged = Object.values(
                results.flat().reduce((acc, cur) => {
                  acc[cur._id] = cur;
                  return acc;
                }, {})
              );
              setDepartmentUsers(merged);
            } catch {
              setDepartmentUsers([]);
            }
            setAssigneeId("");
          };
          fetchAll();
        } else {
          setDepartmentUsers([]);
          setAssigneeId("");
        }
      } else {
        // Logic cũ: leader có phòng ban
        const fetchUsers = async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/departments/${departmentId}/supporters`, {
              headers: { Authorization: `Bearer ${sessionStorage.getItem('accessToken')}` }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              setDepartmentUsers(data.data);
            } else {
              setDepartmentUsers([]);
            }
          } catch {
            setDepartmentUsers([]);
          }
          setAssigneeId("");
        };
        fetchUsers();
      }
    } else {
      setDepartmentUsers([]);
      setAssigneeId("");
    }
  }, [leaderId, supporters]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setFileObj(file);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('endDate', endDate ? new Date(endDate).toISOString() : "");
      formData.append('assigneeId', assigneeId);
      formData.append('notes', notes);
      formData.append('leaderId', leaderId);
      if (fileObj) formData.append('file', fileObj);
      const res = await fetch(`${BASE_URL}/api/tasks/${parentTaskId}/subtasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setTitle("");
        setContent("");
        setEndDate("");
        setNotes("");
        setAssigneeId("");
        setFileObj(null);
        setFileName("");
        onCreated && onCreated();
        onClose();
      } else {
        setError(data.message || "Tạo nhiệm vụ con thất bại");
      }
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  if (!open) return null;

  // Options cho leader
  const leaderOptions = (supporters || []).map(u => ({ value: u._id, label: `${u.fullName} (${u.email})` }));
  const selectedLeader = leaderOptions.find(opt => opt.value === leaderId) || null;
  // Options cho assignee
  const assigneeOptions = (departmentUsers || []).map(u => ({ value: u._id, label: `${u.fullName} (${u.email})` }));
  const selectedAssignee = assigneeOptions.find(opt => opt.value === assigneeId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="text-xl font-semibold mb-4">Tạo nhiệm vụ con</div>
        <div className="space-y-4">
          {/* Tiêu đề */}
          <div>
            <div className="mb-1 font-medium text-sm">Tiêu đề:</div>
            <Input
              label="Nhập tiêu đề..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          {/* Nội dung */}
          <div>
            <div className="mb-1 font-medium text-sm">Nội dung:</div>
            <textarea
              placeholder="Nhập nội dung nhiệm vụ..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
            />
          </div>
          {/* Ngày kết thúc */}
          <div>
            <div className="mb-1 font-medium text-sm">Ngày kết thúc:</div>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
          {/* Ghi chú */}
          <div>
            <div className="mb-1 font-medium text-sm">Ghi chú:</div>
            <Input
              label="Nhập ghi chú..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          {/* Người chủ trì */}
          <div>
            <div className="mb-1 font-medium text-sm">Người chủ trì:</div>
            <ReactSelect
              options={leaderOptions}
              value={selectedLeader}
              onChange={opt => setLeaderId(opt ? opt.value : "")}
              placeholder="Chọn người chủ trì..."
              classNamePrefix="react-select"
              styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
            />
          </div>
          {/* Người thực hiện */}
          <div>
            <div className="mb-1 font-medium text-sm">Người thực hiện:</div>
            <ReactSelect
              options={assigneeOptions}
              value={selectedAssignee}
              onChange={opt => setAssigneeId(opt ? opt.value : "")}
              placeholder="Chọn người thực hiện..."
              classNamePrefix="react-select"
              isDisabled={!leaderId || assigneeOptions.length === 0}
              styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">File đính kèm (tùy chọn):</label>
            <label
              htmlFor="subtask-file-upload"
              className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
            >
              Chọn file
            </label>
            <input
              id="subtask-file-upload"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileName && <div className="text-xs text-green-600 mt-1">Đã chọn: {fileName}</div>}
          </div>
          {error && <Typography color="red" className="text-sm">{error}</Typography>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="text" color="gray" onClick={onClose}>Hủy</Button>
          <Button className="bg-teal-600 text-white" onClick={handleCreate} disabled={loading || !title || !content || !endDate || !assigneeId}>
            {loading ? "Đang tạo..." : "Tạo nhiệm vụ con"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSubtaskModal; 