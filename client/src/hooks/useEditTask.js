import { useEffect, useState } from "react";
import authFetch from "../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;

export function useEditTask({ onClose, task, onUpdated, open }) {
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

  // Check if this is a subtask
  const isSubtask = !!task?.parentTask && task.isRoot === false;

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
    
    if (isSubtask) {
      // For subtasks, use assignee instead of supporters
      setSupporterIds(task.assignee?._id ? [task.assignee._id] : []);
    } else {
      // For main tasks, use supporters
      setSupporterIds(Array.isArray(task.supporters) ? task.supporters.map(s => s._id) : []);
    }
  }, [open, task, isSubtask]);

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
        // Lấy leader
        const resLeader = await authFetch(`${BASE_URL}/api/departments/${departmentId}/leaders`);
        const dataLeader = await resLeader.json();
        setLeaders(dataLeader.data || []);
        
        if (isSubtask) {
          // For subtasks, fetch assignees (supporters from department)
          const resSupporter = await authFetch(`${BASE_URL}/api/departments/${departmentId}/supporters`);
          const dataSupporter = await resSupporter.json();
          setSupporters(dataSupporter.data || []);
        } else {
          // For main tasks, fetch supporters
          const resSupporter = await authFetch(`${BASE_URL}/api/departments/${departmentId}/supporters`);
          const dataSupporter = await resSupporter.json();
          setSupporters(dataSupporter.data || []);
        }
      } catch {
        setLeaders([]);
        setSupporters([]);
      }
    };
    fetchLeadersAndSupporters();
  }, [departmentId, isSubtask]);

  // Khi đổi department, nếu leader/supporter không còn hợp lệ thì reset
  useEffect(() => {
    if (leaders.length > 0 && leaderId && !leaders.some(l => l._id === leaderId)) {
      setLeaderId("");
    }
    if (supporters.length > 0 && supporterIds.length > 0) {
      if (isSubtask) {
        // For subtasks, only keep the first assignee if valid
        const validAssignee = supporterIds[0] && supporters.some(s => s._id === supporterIds[0]);
        setSupporterIds(validAssignee ? [supporterIds[0]] : []);
      } else {
        // For main tasks, filter out invalid supporters
        setSupporterIds(supporterIds.filter(id => supporters.some(s => s._id === id)));
      }
    }
  }, [leaders, supporters, isSubtask]);

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
      
      if (isSubtask) {
        // For subtasks, use assigneeId instead of supporterIds
        if (supporterIds.length > 0) {
          formData.append('assigneeId', supporterIds[0]);
        }
      } else {
        // For main tasks, use supporterIds
        supporterIds.forEach(id => formData.append('supporterIds', id));
      }
      
      if (fileObj) formData.append('file', fileObj);
      const res = await authFetch(`${BASE_URL}/api/tasks/${task._id}`, {
        method: "PUT",
        headers: {}, // Let browser set Content-Type for FormData
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

  return {
    title,
    setTitle,
    content,
    setContent,
    endDate,
    setEndDate,
    indicatorId,
    setIndicatorId,
    notes,
    setNotes,
    fileBase64,
    setFileBase64,
    fileName,
    setFileName,
    currentFile,
    setCurrentFile,
    fileObj,
    setFileObj,
    departmentId,
    setDepartmentId,
    departments,
    setDepartments,
    leaderId,
    setLeaderId,
    leaders,
    setLeaders,
    supporterIds,
    setSupporterIds,
    supporters,
    setSupporters,
    indicators,
    setIndicators,
    loading,
    error,
    handleFileChange,
    handleSubmit
  };
} 