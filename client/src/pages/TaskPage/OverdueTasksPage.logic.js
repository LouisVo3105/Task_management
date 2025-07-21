import { useState, useEffect } from "react";
import { authFetch } from "../../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL

export default function useOverdueTasksPageLogic() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const [loadingWarnings, setLoadingWarnings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneError, setCloneError] = useState("");
  const [cloneSuccess, setCloneSuccess] = useState("");

  const fetchTasks = async (page = 1) => {
    setLoading(true);
    try {
      const res = await authFetch(`${BASE_URL}/api/tasks/overdue?page=${page}&limit=10`);
      const data = await res.json();
      if (data.data && data.data.docs) {
        setTasks(data.data.docs);
        setTotalPages(data.data.totalPages || 1);
        setTotalDocs(data.data.totalDocs || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Clone nhiệm vụ quá hạn
  const cloneOverdueTask = async (taskId, newDeadline) => {
    setCloneLoading(true);
    setCloneError("");
    setCloneSuccess("");
    try {
      const res = await authFetch(`${BASE_URL}/api/overdue-tasks/${taskId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newDeadline }),
      });
      const data = await res.json();
      if (res.ok) {
        setCloneSuccess("Tạo lại nhiệm vụ thành công!");
        fetchTasks(page); // reload danh sách
      } else {
        setCloneError(data.message || "Tạo lại nhiệm vụ thất bại");
      }
    } catch {
      setCloneError("Lỗi kết nối máy chủ");
    }
    setCloneLoading(false);
  };

  // Lấy danh sách nhân viên bị cảnh cáo
  const fetchWarnings = async (params = {}) => {
    setLoadingWarnings(true);
    try {
      const query = new URLSearchParams(params).toString();
      const res = await authFetch(`${BASE_URL}/api/overdue-tasks/warnings${query ? `?${query}` : ""}`);
      const data = await res.json();
      setWarnings(Array.isArray(data.data) ? data.data : (data.data?.docs || []));
    } finally {
      setLoadingWarnings(false);
    }
  };

  // Export file cảnh cáo
  const exportWarnings = async (type = "excel", params = {}) => {
    setExporting(true);
    try {
      const query = new URLSearchParams({ ...params, type }).toString();
      const res = await authFetch(`${BASE_URL}/api/overdue-tasks/warnings/export?${query}`);
      if (!res.ok) throw new Error("Không thể export file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'excel' ? 'warnings.xlsx' : 'warnings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => { fetchTasks(page); }, [page]);

  return {
    tasks, loading, page, totalPages, totalDocs,
    setPage,
    fetchTasks,
    // clone
    cloneOverdueTask, cloneLoading, cloneError, cloneSuccess,
    // warnings
    warnings, loadingWarnings, fetchWarnings,
    // export
    exportWarnings, exporting,
  };
} 