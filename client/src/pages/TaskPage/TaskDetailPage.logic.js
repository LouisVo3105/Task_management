import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";

export default function useTaskDetailPageLogic() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitNote, setSubmitNote] = useState("");
  const [submitLink, setSubmitLink] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [openCreateSubtask, setOpenCreateSubtask] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);



  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`http://localhost:3056/api/tasks/${taskId}`);
      const taskData = await res.json();
      setTask(taskData.data);
    } catch {
      setTask(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [taskId]);

  useEffect(() => {
    if (!task) return;
    if (task.parentTask?._id && task._id) {
      const fetchSubmissions = async () => {
        setLoadingSubmissions(true);
        try {
          const res = await authFetch(`http://localhost:3056/api/tasks/${task.parentTask._id}/subtasks/${task._id}/submissions`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setSubmissions(data.data);
          } else if (Array.isArray(task.submissions) && task.submissions.length > 0) {
            setSubmissions(task.submissions);
          } else {
            setSubmissions([]);
          }
        } catch {
          if (Array.isArray(task.submissions) && task.submissions.length > 0) {
            setSubmissions(task.submissions);
          } else {
            setSubmissions([]);
          }
        }
        setLoadingSubmissions(false);
      };
      fetchSubmissions();
    } else if (task && task._id) {
      const fetchMainTaskSubmissions = async () => {
        setLoadingSubmissions(true);
        try {
          const res = await authFetch(`http://localhost:3056/api/tasks/${task._id}/submissions`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setSubmissions(data.data);
          } else if (Array.isArray(task.submissions) && task.submissions.length > 0) {
            setSubmissions(task.submissions);
          } else {
            setSubmissions([]);
          }
        } catch {
          if (Array.isArray(task.submissions) && task.submissions.length > 0) {
            setSubmissions(task.submissions);
          } else {
            setSubmissions([]);
          }
        }
        setLoadingSubmissions(false);
      };
      fetchMainTaskSubmissions();
    }
    // eslint-disable-next-line
  }, [task]);

  const handleDeleteTask = async (taskToDelete) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) return;
    setDeleteLoading(true);
    try {
      const url = `http://localhost:3056/api/tasks/${taskToDelete._id}`;
      const res = await authFetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (taskToDelete.parentTask) {
          navigate(-1);
        } else {
          navigate('/tasks');
        }
      } else {
        alert('Xóa nhiệm vụ thất bại!');
      }
    } catch {
      alert('Lỗi kết nối máy chủ!');
    }
    setDeleteLoading(false);
  };

  // ...Các hàm handleFileDownload, handleDelete, v.v. sẽ được chuyển vào đây...

  return {
    task,
    loading,
    submitNote,
    setSubmitNote,
    submitLink,
    setSubmitLink,
    fileBase64,
    setFileBase64,
    fileName,
    setFileName,
    submitError,
    setSubmitError,
    submitLoading,
    setSubmitLoading,
    openEdit,
    setOpenEdit,
    editingTask,
    setEditingTask,
    deleteLoading,
    setDeleteLoading,
    openCreateSubtask,
    setOpenCreateSubtask,
    submissions,
    setSubmissions,
    loadingSubmissions,
    setLoadingSubmissions,
    fetchData,
    navigate,
    handleDeleteTask,
    // ...Các hàm handleFileDownload, handleDelete, v.v. sẽ được truyền xuống UI...
  };
} 