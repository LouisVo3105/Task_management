import { useEffect, useState } from "react";
import { useAuth } from "../../utils/useAuth";
import { authFetch } from "../../utils/authFetch";

const statusMap = {
  pending: { text: "Đang chờ", color: "text-yellow-600" },
  approved: { text: "Đã duyệt", color: "text-green-600" },
  submitted: { text: "Đã nộp", color: "text-blue-600" },
  in_progress: { text: "Đang làm", color: "text-cyan-600" },
  rejected: { text: "Bị từ chối", color: "text-red-600" },
  completed: { text: "Hoàn thành", color: "text-purple-600" },
};
const TABLE_HEAD = ["Tiêu đề", "Ngày kết thúc", "Trạng thái", "Hành động"];

export default function usePendingTasksPageLogic() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingTasks = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`http://localhost:3056/api/tasks/pending/${user._id}`);
      const data = await res.json();
      // Lọc nhiệm vụ có trạng thái submitted
      const submittedTasks = Array.isArray(data.data) ? data.data.filter(task => task.status === 'submitted') : [];
      setTasks(submittedTasks);
    } catch {
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      fetchPendingTasks();
    }
  }, [user]);

  const handleApprove = async (taskId) => {
    try {
      await authFetch(`http://localhost:3056/api/tasks/${taskId}/approve`, { method: 'PATCH' });
      fetchPendingTasks();
    } catch { }
  };

  const handleReject = async (taskId) => {
    try {
      await authFetch(`http://localhost:3056/api/tasks/${taskId}/reject`, { method: 'PATCH' });
      fetchPendingTasks();
    } catch { }
  };

  return {
    user,
    tasks,
    loading,
    handleApprove,
    handleReject,
    TABLE_HEAD,
    statusMap,
  };
} 