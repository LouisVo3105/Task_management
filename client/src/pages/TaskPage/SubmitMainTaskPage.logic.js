import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL

export default function useSubmitMainTaskPageLogic() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [submitNote, setSubmitNote] = useState("");
  const [submitLink, setSubmitLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [task, setTask] = useState(null);
  const [taskLoading, setTaskLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      setTaskLoading(true);
      try {
        const res = await authFetch(`${BASE_URL}/api/tasks/${taskId}`);
        const data = await res.json();
        if (data.success) {
          setTask(data.data);
        }
      } catch (error) {
        console.error("Xuất hiện lỗi", error)
        setTask(null);
      }
      setTaskLoading(false);
    };
    fetchTask();
  }, [taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'submitted', submitNote, submitLink }),
      });
      if (!res.ok) throw new Error('Nộp nhiệm vụ thất bại');
      navigate('/tasks');
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
    setLoading(false);
  };

  return {
    taskId,
    navigate,
    submitNote,
    setSubmitNote,
    submitLink,
    setSubmitLink,
    loading,
    error,
    task,
    taskLoading,
    handleSubmit,
  };
} 