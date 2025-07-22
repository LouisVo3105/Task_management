import { useEffect, useState } from "react";
import authFetch from "../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;

export function useCreateTask({ onClose, onCreated, indicatorId, open }) {
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

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await authFetch(`${BASE_URL}/api/departments`);
        const data = await res.json();
        setDepartments(data.data || []);
      } catch {
        setDepartments([]);
      }
    };
    if (open) fetchDepartments();
  }, [open]);

  useEffect(() => {
    if (open) {
      const fetchSupporters = async () => {
        try {
          const res = await authFetch(`${BASE_URL}/api/users/leaders`);
          const data = await res.json();
          setSupporters(data.data || []);
        } catch {
          setSupporters([]);
        }
      };
      fetchSupporters();
    }
  }, [open]);

  useEffect(() => {
    if (!departmentId) {
      setLeaders([]);
      setLeaderId("");
      setSupporterIds([]);
      return;
    }
    const fetchLeaders = async () => {
      try {
        const resLeader = await authFetch(`${BASE_URL}/api/departments/${departmentId}/leaders`);
        const dataLeader = await resLeader.json();
        setLeaders(dataLeader.data || []);
      } catch {
        setLeaders([]);
      }
    };
    fetchLeaders();
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
      const res = await authFetch(`${BASE_URL}/api/tasks`, {
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

  return {
    title,
    setTitle,
    content,
    setContent,
    endDate,
    setEndDate,
    notes,
    setNotes,
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
    loading,
    error,
    fileObj,
    setFileObj,
    fileName,
    setFileName,
    handleFileChange,
    handleCreate
  };
} 