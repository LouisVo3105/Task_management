import { useState, useEffect } from "react";
import { authFetch } from "../../utils/authFetch";

export default function useOverdueTasksPageLogic() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  const fetchTasks = async (page = 1) => {
    setLoading(true);
    try {
      const res = await authFetch(`http://localhost:3056/api/tasks/overdue?page=${page}&limit=10`);
      const data = await res.json();
      if (data.docs) {
        setTasks(data.docs);
        setTotalPages(data.totalPages || 1);
        setTotalDocs(data.totalDocs || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(page); }, [page]);

  return {
    tasks, loading, page, totalPages, totalDocs,
    setPage,
    fetchTasks,
  };
} 