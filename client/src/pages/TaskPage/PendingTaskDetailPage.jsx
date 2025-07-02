import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Typography } from "@material-tailwind/react";

const PendingTaskDetailPage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`http://localhost:3056/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setTask(data.data);
        else setTask(null);
      } catch (err) {
        setTask(null);
      }
      setLoading(false);
    };
    fetchTask();
  }, [taskId]);

  const details = task ? [
    { label: task.parentTask ? "Mã nhiệm vụ con" : "Mã nhiệm vụ", value: task.code },
    { label: "Tiêu đề", value: task.title },
    task.parentTask && { label: "Nhiệm vụ cha", value: task.parentTask.title || task.parentTask },
    { label: "Chỉ tiêu", value: task.indicator?.name },
    { label: "Người thực hiện", value: task.assignee?.fullName },
    { label: "Người giao", value: task.assigner?.fullName },
    { label: "Ngày hết hạn", value: task.endDate ? new Date(task.endDate).toLocaleDateString() : undefined },
    { label: "Trạng thái", value: task.status },
    { label: "Ghi chú", value: task.notes },
    task.submitLink && { label: "Link nộp bài", value: <a href={task.submitLink} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">{task.submitLink}</a> },
    task.submitNote && { label: "Ghi chú nộp bài", value: task.submitNote },
  ].filter(Boolean) : [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chi tiết nhiệm vụ chờ duyệt</h1>
        <Button variant="outlined" onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
      {loading ? (
        <Typography>Đang tải...</Typography>
      ) : task ? (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <table className="w-full text-left mb-4">
            <tbody>
              {details.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-4 font-medium whitespace-nowrap w-1/3">{item.label}</td>
                  <td className="py-2">{item.value || <span className="text-gray-400">Chưa có</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {task.status === 'submitted' && (
            <div className="flex gap-4 mt-6 justify-end">
              <button
                className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
                onClick={async () => {
                  await fetch(`http://localhost:3056/api/tasks/${task._id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                    },
                    body: JSON.stringify({ status: 'approved' }),
                  });
                  navigate(-1);
                }}
              >
                Duyệt
              </button>
              <button
                className="block rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                onClick={async () => {
                  await fetch(`http://localhost:3056/api/tasks/${task._id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                    },
                    body: JSON.stringify({ status: 'pending' }),
                  });
                  navigate(-1);
                }}
              >
                Từ chối
              </button>
            </div>
          )}
        </div>
      ) : (
        <Typography color="red">Không thể tải chi tiết nhiệm vụ.</Typography>
      )}
    </div>
  );
};

export default PendingTaskDetailPage; 