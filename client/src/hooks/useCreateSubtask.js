import { useEffect, useState } from "react";
import authFetch from "../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;

export function useCreateSubtask({ onClose, onCreated, parentTaskId, supporters = [] }) {
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
      const leader = (supporters || []).find(u => u._id === leaderId);
      const departmentId = leader?.department?._id || leader?.department;
      if (!departmentId) {
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
              // Fetch all departments in parallel
              const results = await Promise.all(
                allDepartmentIds.map(depId =>
                  authFetch(`${BASE_URL}/api/departments/${depId}/supporters`, {
                    headers: { }
                  })
                    .then(res => res.json())
                    .then(data => (data.success && Array.isArray(data.data)) ? data.data : [])
                    .catch(() => [])
                )
              );
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
        const fetchUsers = async () => {
          try {
            const res = await authFetch(`${BASE_URL}/api/departments/${departmentId}/supporters`, {
              headers: { }
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
      const res = await authFetch(`${BASE_URL}/api/tasks/${parentTaskId}/subtasks`, {
        method: "POST",
        headers: {}, // Let browser set Content-Type for FormData
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

  return {
    title,
    setTitle,
    content,
    setContent,
    endDate,
    setEndDate,
    notes,
    setNotes,
    leaderId,
    setLeaderId,
    assigneeId,
    setAssigneeId,
    loading,
    error,
    fileObj,
    setFileObj,
    fileName,
    setFileName,
    departmentUsers,
    setDepartmentUsers,
    handleFileChange,
    handleCreate
  };
} 