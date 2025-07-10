import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/authFetch";

export default function usePendingTaskDetailPageLogic() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleFileDownload = (filePath, fileName = 'file_nop_bai') => {
    try {
      // Kiểm tra nếu filePath là string chứa file path thực tế
      if (typeof filePath === 'string' && (filePath.startsWith('http') || filePath.startsWith('/') || filePath.includes('uploads'))) {
        const downloadUrl = filePath.startsWith('http') ? filePath : `http://localhost:3056/${filePath.replace(/\\/g, "/")}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
      } else {
        // Fallback cho trường hợp base64 (nếu có)
        let fileInfo = filePath;
        if (typeof filePath === 'string' && filePath.startsWith('{')) {
          fileInfo = JSON.parse(filePath);
          filePath = fileInfo.dataURL;
          fileName = fileInfo.originalName || fileName;
        }
        if (filePath && filePath.includes('base64')) {
          const arr = filePath.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
        } else {
          alert('Không thể tải file. Định dạng không hợp lệ!');
        }
      }
    } catch (e) {
      alert('Không thể tải file. Định dạng không hợp lệ!');
    }
  };

  const handleApprove = async () => {
    if (!taskId) return;
    await authFetch(`http://localhost:3056/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    // Sau khi duyệt, reload lại task
    const res = await authFetch(`http://localhost:3056/api/tasks/${taskId}`);
    const data = await res.json();
    if (data.success) setTask(data.data);
  };

  const handleReject = async () => {
    if (!taskId) return;
    await authFetch(`http://localhost:3056/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' })
    });
    // Sau khi từ chối, reload lại task
    const res = await authFetch(`http://localhost:3056/api/tasks/${taskId}`);
    const data = await res.json();
    if (data.success) setTask(data.data);
  };

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`http://localhost:3056/api/tasks/${taskId}`);
        const data = await res.json();
        if (data.success) setTask(data.data);
        else setTask(null);
      } catch {
        setTask(null);
      }
      setLoading(false);
    };
    fetchTask();
  }, [taskId]);

  return {
    task,
    loading,
    handleFileDownload,
    navigate,
    handleApprove,
    handleReject,
  };
} 