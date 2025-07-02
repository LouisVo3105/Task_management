import React, { useEffect, useState } from "react";
import { Card, Typography, Spinner } from "@material-tailwind/react";
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

Chart.register(ArcElement, Tooltip, Legend);

const API_URL = 'http://localhost:3056/api';

const statusMap = {
  pending: 'Đang thực hiện',
  submitted: 'Chờ duyệt',
  approved: 'Đã hoàn thành',
};

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lấy user hiện tại
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUser(data.data);
    };
    fetchUser();
  }, []);

  // Lấy tất cả nhiệm vụ của user (giả sử có API, nếu không sẽ lấy incomplete + pending + approved)
  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    Promise.all([
      fetch(`${API_URL}/tasks/incomplete/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/tasks/pending/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/tasks/completed/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([incomplete, pending, completed]) => {
      console.log('incomplete:', incomplete);
      console.log('pending:', pending);
      console.log('completed:', completed);
      // Gộp tất cả nhiệm vụ, loại trùng
      const allTasks = [
        ...(incomplete.data?.docs || []),
        ...(pending.data?.docs || []),
        ...(completed.data?.docs || []),
      ];
      const uniqueTasks = Array.from(new Map(allTasks.map(t => [t._id, t])).values());
      console.log('allTasks:', allTasks);
      console.log('uniqueTasks:', uniqueTasks);
      setTasks(uniqueTasks);
      setLoading(false);
    });
  }, [user]);

  // Thống kê
  const total = tasks.length;
  const numPending = tasks.filter(t => t.status === 'pending').length;
  const numSubmitted = tasks.filter(t => t.status === 'submitted').length;
  const numApproved = tasks.filter(t => t.status === 'approved').length;

  // Pie chart data
  const chartData = {
    labels: ['Đang thực hiện', 'Chờ duyệt', 'Đã hoàn thành'],
    datasets: [
      {
        data: [numPending, numSubmitted, numApproved],
        backgroundColor: [
          'rgba(20, 184, 166, 0.7)', // teal
          'rgba(251, 191, 36, 0.7)', // yellow
          'rgba(34, 197, 94, 0.7)', // green
        ],
        borderWidth: 1,
      },
    ],
  };

  // Danh sách nhiệm vụ gần nhất
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
    .slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Typography variant="h3" className="mb-4">Dashboard Cá Nhân</Typography>
      {user && <Typography className="mb-6">Chào mừng, <span className="font-bold text-teal-600">{user.fullName}</span>!</Typography>}
      {loading ? (
        <Spinner className="mx-auto" />
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Typography variant="h6">Tổng nhiệm vụ</Typography>
              <Typography className="text-2xl font-bold text-teal-600">{total}</Typography>
            </Card>
            <Card className="p-4 text-center">
              <Typography variant="h6">Đang thực hiện</Typography>
              <Typography className="text-2xl font-bold text-yellow-600">{numPending}</Typography>
            </Card>
            <Card className="p-4 text-center">
              <Typography variant="h6">Chờ duyệt</Typography>
              <Typography className="text-2xl font-bold text-amber-500">{numSubmitted}</Typography>
            </Card>
            <Card className="p-4 text-center">
              <Typography variant="h6">Đã hoàn thành</Typography>
              <Typography className="text-2xl font-bold text-green-600">{numApproved}</Typography>
            </Card>
          </div>

          {/* Progress Chart */}
          <div className="mb-8 flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-1/2">
              <Typography variant="h6" className="mb-2">Tiến độ hoàn thành nhiệm vụ</Typography>
              <Pie data={chartData} />
            </div>
            <div className="w-full md:w-1/2">
              {/* Danh sách nhiệm vụ gần nhất */}
              <Typography variant="h6" className="mb-2">Nhiệm vụ gần nhất</Typography>
              <Card className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr>
                      <th className="p-2">Tên nhiệm vụ</th>
                      <th className="p-2">Trạng thái</th>
                      <th className="p-2">Hạn hoàn thành</th>
                      <th className="p-2">Chỉ tiêu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.length === 0 ? (
                      <tr><td colSpan={4} className="p-2 text-center text-gray-400">Không có nhiệm vụ nào.</td></tr>
                    ) : recentTasks.map(task => (
                      <tr key={task._id}>
                        <td className="p-2">{task.title}</td>
                        <td className="p-2">{statusMap[task.status] || task.status}</td>
                        <td className="p-2">{task.endDate ? new Date(task.endDate).toLocaleDateString() : ''}</td>
                        <td className="p-2">{typeof task.indicator === 'string' ? task.indicator : (task.indicator?.name || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
