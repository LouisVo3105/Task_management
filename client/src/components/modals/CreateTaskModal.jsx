import React, { useEffect, useState } from "react";
import {
  Button,
  Typography,
} from "@material-tailwind/react";
import ReactSelect from "react-select";

const CreateTaskModal = ({ open, onClose, onCreated, indicatorId }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [leaderId, setLeaderId] = useState("");
  const [leaders, setLeaders] = useState([]);
  const [supporterIds, setSupporterIds] = useState([]);
  const [supporters, setSupporters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState("");

  // Lấy danh sách phòng ban khi mở modal
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = sessionStorage.getItem("accessToken");
        const res = await fetch("http://localhost:3056/api/departments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setDepartments(data.data || []);
      } catch {
        setDepartments([]);
      }
    };
    if (open) fetchDepartments();
  }, [open]);

  // Khi chọn phòng ban, lấy leader và supporter
  useEffect(() => {
    if (!departmentId) {
      setLeaders([]);
      setSupporters([]);
      setLeaderId("");
      setSupporterIds([]);
      return;
    }
    const fetchLeadersAndSupporters = async () => {
      try {
        const token = sessionStorage.getItem("accessToken");
        // Lấy leader
        const resLeader = await fetch(`http://localhost:3056/api/departments/${departmentId}/leaders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataLeader = await resLeader.json();
        setLeaders(dataLeader.data || []);
        // Lấy supporters
        const resSupporter = await fetch(`http://localhost:3056/api/departments/${departmentId}/supporters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataSupporter = await resSupporter.json();
        setSupporters(dataSupporter.data || []);
      } catch {
        setLeaders([]);
        setSupporters([]);
      }
    };
    fetchLeadersAndSupporters();
  }, [departmentId]);

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
      formData.append('endDate', endDate);
      formData.append('indicatorId', indicatorId);
      formData.append('departmentId', departmentId);
      formData.append('leaderId', leaderId);
      formData.append('notes', notes);
      supporterIds.forEach(id => formData.append('supporterIds', id));
      if (fileObj) formData.append('file', fileObj);
      const res = await fetch("http://localhost:3056/api/tasks", {
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
        setDepartmentId("");
        setLeaderId("");
        setSupporterIds([]);
        setFileObj(null);
        setFileName("");
        onCreated && onCreated();
        onClose();
      } else {
        setError(data.message || "Tạo nhiệm vụ thất bại");
      }
    } catch (e) {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="text-xl font-semibold mb-4">Tạo nhiệm vụ mới</div>
        <div className="space-y-0">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Tiêu đề"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
            />
          </div>
          <div className="mb-3">
            <textarea
              placeholder="Nội dung nhiệm vụ"
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
            />
          </div>
          <div className="mb-3">
            <input
              type="date"
              placeholder="Ngày kết thúc"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
            />
          </div>
          <div className="mb-3">
            <ReactSelect
              options={departments.map(dep => ({ value: dep._id, label: dep.name }))}
              value={departments.find(dep => dep._id === departmentId) ? { value: departmentId, label: departments.find(dep => dep._id === departmentId).name } : null}
              onChange={opt => setDepartmentId(opt ? opt.value : "")}
              placeholder="Chọn phòng ban..."
              classNamePrefix="react-select"
              styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
            />
          </div>
          <div className="mb-3">
            <ReactSelect
              options={leaders.map(l => ({ value: l._id, label: l.fullName || l.username }))}
              value={leaders.find(l => l._id === leaderId) ? { value: leaderId, label: leaders.find(l => l._id === leaderId).fullName || leaders.find(l => l._id === leaderId).username } : null}
              onChange={opt => setLeaderId(opt ? opt.value : "")}
              placeholder="Chọn người chủ trì..."
              classNamePrefix="react-select"
              isDisabled={!departmentId}
              styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
            />
          </div>
          <div className="mb-3">
            <ReactSelect
              isMulti
              options={supporters.map(s => ({ value: s._id, label: s.fullName || s.username }))}
              value={supporters.filter(s => supporterIds.includes(s._id)).map(s => ({ value: s._id, label: s.fullName || s.username }))}
              onChange={opts => setSupporterIds(opts ? opts.map(o => o.value) : [])}
              placeholder="Chọn người hỗ trợ..."
              classNamePrefix="react-select"
              isDisabled={!departmentId}
              styles={{ menu: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: 40 }) }}
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Ghi chú"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:border-teal-600 focus:ring-1 focus:ring-teal-200 outline-none"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">File đính kèm (tùy chọn):</label>
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
            >
              Chọn file
            </label>
            <input
              id="file-upload"
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
          <Button className="bg-teal-600 text-white" onClick={handleCreate} disabled={loading || !title || !content || !endDate || !departmentId || !leaderId || supporterIds.length === 0}>
            {loading ? "Đang tạo..." : "Tạo nhiệm vụ"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal; 