import React, { useEffect, useState } from "react";
import ReactSelect from "react-select";
import { authFetch } from "../../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL



const EditTaskModal = ({ open, onClose, task, onUpdated }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [endDate, setEndDate] = useState("");
  const [indicatorId, setIndicatorId] = useState("");
  const [notes, setNotes] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentFile, setCurrentFile] = useState("");
  const [fileObj, setFileObj] = useState(null);

  // New fields for department/leader/supporters
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [leaderId, setLeaderId] = useState("");
  const [leaders, setLeaders] = useState([]);
  const [supporterIds, setSupporterIds] = useState([]);
  const [supporters, setSupporters] = useState([]);

  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load indicators, departments on open
  useEffect(() => {
    if (!open) return;
    // indicators
    authFetch(`${BASE_URL}/api/indicators`)
      .then(res => res.json())
      .then(data => setIndicators(data.data?.docs || []));
    // departments
    authFetch(`${BASE_URL}/api/departments`)
      .then(res => res.json())
      .then(data => setDepartments(data.data || []));
  }, [open]);

  // Set default values from task
  useEffect(() => {
    if (!open || !task) return;
    setTitle(task.title || "");
    setContent(task.content || "");
    setEndDate(task.endDate ? task.endDate.slice(0, 10) : "");
    setIndicatorId(task.indicator?._id || "");
    setNotes(task.notes || "");
    setCurrentFile(task.file || "");
    setFileBase64("");
    setFileName("");
    setFileObj(null); // Reset fileObj
    setDepartmentId(task.department?._id || "");
    setLeaderId(task.leader?._id || "");
    setSupporterIds(Array.isArray(task.supporters) ? task.supporters.map(s => s._id) : []);
  }, [open, task]);

  // Load leaders/supporters when departmentId changes
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
        const resLeader = await fetch(`${BASE_URL}/api/departments/${departmentId}/leaders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataLeader = await resLeader.json();
        setLeaders(dataLeader.data || []);
        // Lấy supporters
        const resSupporter = await fetch(`${BASE_URL}/api/departments/${departmentId}/supporters`, {
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

  // Khi đổi department, nếu leader/supporter không còn hợp lệ thì reset
  useEffect(() => {
    if (leaders.length > 0 && leaderId && !leaders.some(l => l._id === leaderId)) {
      setLeaderId("");
    }
    if (supporters.length > 0 && supporterIds.length > 0) {
      setSupporterIds(supporterIds.filter(id => supporters.some(s => s._id === id)));
    }
  }, [leaders, supporters]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setFileObj(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const res = await fetch(`${BASE_URL}/api/tasks/${task._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Cập nhật thất bại");
        return;
      }
      onUpdated();
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">Cập nhật nhiệm vụ</h2>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
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
                <label className="block mb-1 font-medium">Nội dung nhiệm vụ</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                  rows={3}
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
                <label className="block mb-1 font-medium">Ghi chú</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <label className="block mb-1 font-medium">Phòng ban</label>
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
                <label className="block mb-1 font-medium">Người chủ trì</label>
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
                <label className="block mb-1 font-medium">Người hỗ trợ</label>
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
                <label className="block mb-1 font-medium">File đính kèm (tùy chọn):</label>
                {currentFile && (
                  <div className="text-sm text-gray-600 mb-2">
                    File hiện tại: {currentFile.includes('originalName') ?
                      JSON.parse(currentFile).originalName : 'File đính kèm'}
                  </div>
                )}
                <label
                  htmlFor="edit-task-file-upload"
                  className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
                >
                  Chọn file mới
                </label>
                <input
                  id="edit-task-file-upload"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {fileName && <div className="text-xs text-green-600 mt-1">Đã chọn: {fileName}</div>}
              </div>
            </div>
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