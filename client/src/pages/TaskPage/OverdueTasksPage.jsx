import React, { useState, useEffect } from "react";
import { Card, Typography, Button } from "@material-tailwind/react";
import { authFetch } from "../../utils/authFetch";
import { formatDate } from "../../utils/formatDate";
import StatusDot from "../../components/StatusDot";

const TABLE_HEAD = ["Tiêu đề", "Ngày hết hạn", "Số ngày quá deadline", "Trạng thái", "Người thực hiện", "Hành động"];

export default function OverdueTasksPage() {
  const [overdueTasks, setOverdueTasks] = useState({ docs: [], totalDocs: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const fetchOverdueTasks = async (page = 1) => {
    setLoading(true);
    try {
      const response = await authFetch(`http://localhost:3056/api/tasks/overdue?page=${page}&limit=${limit}`);
      const data = await response.json();
      if (data.success) {
        setOverdueTasks(data.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy nhiệm vụ quá deadline:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueTasks(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const getDaysOverdueText = (days) => {
    if (days === 1) return "1 ngày";
    return `${days} ngày`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-red-600">Nhiệm vụ Quá Deadline</h1>
          <p className="text-gray-600 mt-2">
            Tổng cộng: {overdueTasks.totalDocs} nhiệm vụ quá deadline
          </p>
        </div>
        <Button variant="outlined" onClick={() => window.history.back()}>
          Quay lại
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải dữ liệu...</div>
      ) : overdueTasks.docs?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Không có nhiệm vụ nào quá deadline.
        </div>
      ) : (
        <Card className="h-full w-full overflow-scroll">
          <table className="w-full min-w-max table-auto text-left">
            <thead>
              <tr>
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                    <Typography variant="small" color="blue-gray" className="font-normal leading-none opacity-70">
                      {head}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overdueTasks.docs?.map((task) => (
                <tr key={task._id} className="border-b border-blue-gray-50 hover:bg-red-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.content && (
                        <div className="text-sm text-gray-600 mt-1">{task.content}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-red-600 font-medium">
                      {formatDate(task.endDate)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-red-600 font-bold">
                      {getDaysOverdueText(task.daysOverdue || 0)}
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusDot status={task.status} size="medium" />
                  </td>
                  <td className="p-4">
                    {task.type === 'main' ? task.leader?.fullName : task.assignee?.fullName}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="text"
                      size="sm"
                      color="blue"
                      onClick={() => window.location.href = `/tasks/${task._id}`}
                    >
                      Xem chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pagination */}
      {overdueTasks.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <Button
              variant="outlined"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Trước
            </Button>
            <span className="px-4 py-2 text-sm">
              Trang {currentPage} / {overdueTasks.totalPages}
            </span>
            <Button
              variant="outlined"
              size="sm"
              disabled={currentPage === overdueTasks.totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 