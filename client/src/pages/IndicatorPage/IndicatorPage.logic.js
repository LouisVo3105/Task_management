import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from '../../utils/authFetch';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
import { useSSEContext } from "@utils/SSEContext";

const statusMap = {
  no_tasks: "Chưa có nhiệm vụ",
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành"
};

export function useIndicatorPageLogic() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchIndicators = async () => {
    setLoading(true);
    try {
      const res = await authFetch("http://localhost:3056/api/indicators");
      const data = await res.json();
      setIndicators(data.data?.docs || []);
    } catch {
      setIndicators([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIndicators();
  }, []);

  useSSEContext((event) => {
    if (["indicator_created", "indicator_updated", "indicator_deleted"].includes(event.type)) {
      fetchIndicators();
    }
  });

  // Phân quyền rõ ràng cho admin và manager
  const isAdmin = user && user.role === 'admin';
  const isManager = user && user.role === 'manager';

  const handleDelete = async (indicator) => {
    if (!window.confirm(`Bạn có chắc muốn xóa chỉ tiêu "${indicator.name}"?`)) return;
    try {
      const res = await authFetch(`http://localhost:3056/api/indicators/${indicator._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Xóa thất bại");
      }
      fetchIndicators();
    } catch (err) {
      alert(err.message);
    }
  };

  return {
    indicators,
    loading,
    openCreate,
    setOpenCreate,
    openEdit,
    setOpenEdit,
    editingIndicator,
    setEditingIndicator,
    navigate,
    user,
    isAdmin, // Trả về cho UI
    isManager, // Trả về cho UI
    fetchIndicators,
    handleDelete,
    statusMap,
  };
} 