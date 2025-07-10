import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/useAuth";
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
import { authFetch } from '../../utils/authFetch';

const TABLE_HEAD = ["Tiêu đề", "Ngày kết thúc", "Trạng thái", "Hành động"];

export function useTaskPageLogic() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [openSubmitMain, setOpenSubmitMain] = useState(false);
  const [submitTaskId, setSubmitTaskId] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = new URLSearchParams(location.search);
  const indicatorId = query.get("indicatorId");

  const fetchTasks = async () => {
    if (!indicatorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = `http://localhost:3056/api/indicators/${indicatorId}/tasks`;
      const res = await authFetch(url);
      const data = await res.json();
      setTasks(Array.isArray(data.data?.tasks) ? data.data.tasks : []);
    } catch {
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!indicatorId) {
      if (!user || !user._id) {
        setTasks([]);
        setLoading(false);
        setPendingTasks([]);
        setLoadingPending(false);
        return;
      }
      setLoading(true);
      authFetch(`http://localhost:3056/api/tasks/incomplete/${user._id}`)
        .then(res => res.json())
        .then(data => { return data; })
        .then(data => {
          setTasks(Array.isArray(data.data?.docs) ? data.data.docs : []);
          setLoading(false);
        })
        .catch(() => {
          setTasks([]);
          setLoading(false);
        });
      // Sửa: luôn gọi API lấy nhiệm vụ chờ duyệt nếu đã đăng nhập
      setLoadingPending(true);
      authFetch(`http://localhost:3056/api/tasks/pending`)
        .then(res => res.json())
        .then(data => {
          setPendingTasks(Array.isArray(data.data?.docs) ? data.data.docs : []);
          setLoadingPending(false);
        })
        .catch(() => {
          setPendingTasks([]);
          setLoadingPending(false);
        });
      return;
    }
    fetchTasks();
  }, [indicatorId, user]);

  const isAdminOrManager = user && (user.role === 'admin' || user.role === 'manager');

  const handleSubmitTask = async ({ submitNote, submitLink, file }) => {
    try {
      const formData = new FormData();
      formData.append('status', 'submitted');
      formData.append('submitNote', submitNote);
      formData.append('submitLink', submitLink);
      if (file) {
        formData.append('file', file);
      }
      
      const res = await authFetch(`http://localhost:3056/api/tasks/${submitTaskId}/submit`, {
        method: 'PATCH',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        // Hiển thị error message từ backend
        setSubmitError(data.message || 'Có lỗi xảy ra khi nộp nhiệm vụ');
        return;
      }
      setOpenSubmitMain(false);
      setSubmitTaskId(null);
      setSubmitError("");
      fetchTasks();
    } catch {
      setSubmitError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    }
  };

  // Hàm duyệt nhiệm vụ (approve)
  const approveTask = async (taskId) => {
    try {
      const res = await authFetch(`http://localhost:3056/api/tasks/${taskId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Hiển thị error message từ backend
        alert(data.message || 'Duyệt thất bại');
        return;
      }
      // reload lại danh sách nhiệm vụ chờ duyệt
      // Gọi lại API lấy pendingTasks
      setLoadingPending(true);
      authFetch(`http://localhost:3056/api/tasks/pending`)
        .then(res => res.json())
        .then(data => {
          setPendingTasks(Array.isArray(data.data?.docs) ? data.data.docs : []);
          setLoadingPending(false);
        })
        .catch(() => {
          setPendingTasks([]);
          setLoadingPending(false);
        });
    } catch {
      alert("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    }
  };

  return {
    tasks,
    loading,
    openCreate,
    setOpenCreate,
    pendingTasks,
    loadingPending,
    openSubmitMain,
    setOpenSubmitMain,
    submitTaskId,
    setSubmitTaskId,
    submitError,
    setSubmitError,
    location,
    navigate,
    user,
    indicatorId,
    fetchTasks,
    isAdminOrManager,
    handleSubmitTask,
    approveTask,
    TABLE_HEAD,
  };
} 