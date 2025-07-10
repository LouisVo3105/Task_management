import React from "react";
import { Card, Typography, Button } from "@material-tailwind/react";
import CreateTaskModal from "../../components/modals/CreateTaskModal";
import SubmitTaskMainModal from "../../components/modals/SubmitTaskMainModal";
import StatusDot from "../../components/StatusDot";
import { formatDate } from "../../utils/formatDate";

// Component hiển thị trạng thái nhiệm vụ
const TaskStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { text: "Đang thực hiện", color: "bg-yellow-100 text-yellow-800" },
    submitted: { text: "Đã nộp", color: "bg-blue-100 text-blue-800" },
    approved: { text: "Đã duyệt", color: "bg-green-100 text-green-800" },
    rejected: { text: "Bị từ chối", color: "bg-red-100 text-red-800" },
    completed: { text: "Hoàn thành", color: "bg-purple-100 text-purple-800" },
  };

  const config = statusConfig[status] || { text: status, color: "bg-gray-100 text-gray-800" };

  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${config.color}`}>
      {config.text}
    </span>
  );
};

export default function TaskPageUI({
  tasks,
  loading,
  openCreate,
  setOpenCreate,
  pendingTasks,
  loadingPending,
  openSubmitMain,
  setOpenSubmitMain,
  setSubmitTaskId,
  submitError,
  setSubmitError,
  navigate,
  user,
  indicatorId,
  fetchTasks,
  isAdminOrManager,
  handleSubmitTask,
  TABLE_HEAD,
  approveTask,
}) {
  if (!indicatorId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Nhiệm vụ chưa hoàn thành của bạn</h1>
        {loading ? (
          <div className="text-center py-8">Đang tải dữ liệu...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Bạn không có nhiệm vụ nào chưa hoàn thành.</div>
        ) : (
          <Card className="h-full w-full overflow-scroll">
            <table className="w-full min-w-max table-auto text-left">
              <thead>
                <tr>
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Tiêu đề</th>
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Ngày giao</th>
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Ngày kết thúc</th>
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Trạng thái</th>
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((item) => {
                  return (
                    <tr key={item._id}>
                      <td className="p-4 border-b border-blue-gray-50">{item.title}</td>
                      <td className="p-4 border-b border-blue-gray-50">{formatDate(item.createdAt)}</td>
                      <td className="p-4 border-b border-blue-gray-50">{formatDate(item.endDate)}</td>
                      <td className="p-4 border-b border-blue-gray-50">
                        <StatusDot status={item.status} size="medium" />
                      </td>
                      <td className="p-4 border-b border-blue-gray-50 space-x-2">
                        <Button variant="text" size="sm" onClick={() => navigate(`/tasks/${item._id}`)}>
                          Xem chi tiết
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {isAdminOrManager && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">Nhiệm vụ chờ duyệt</h2>
            {loadingPending ? (
              <div className="text-center py-8">Đang tải dữ liệu...</div>
            ) : pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Không có nhiệm vụ nào chờ duyệt.</div>
            ) : (
              <Card className="h-full w-full overflow-scroll">
                <table className="w-full min-w-max table-auto text-left">
                  <thead>
                    <tr>
                      {TABLE_HEAD.map((head) => (
                        <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                          <Typography variant="small" color="blue-gray" className="font-normal leading-none opacity-70">{head}</Typography>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTasks.map((item) => {
                      return (
                        <tr key={item._id}>
                          <td className="p-4 border-b border-blue-gray-50">{item.title}</td>
                          <td className="p-4 border-b border-blue-gray-50">{formatDate(item.endDate)}</td>
                          <td className="p-4 border-b border-blue-gray-50">
                            <StatusDot status={item.status} size="medium" />
                          </td>
                          <td className="p-4 border-b border-blue-gray-50 space-x-2">
                            <Button variant="text" size="sm" onClick={() => navigate(`/pending-tasks/${item._id}`)}>
                              Xem chi tiết
                            </Button>
                            {/* Nút duyệt nhiệm vụ chính: user là indicatorCreator */}
                            {item.type === 'main' && user && user._id === item.indicatorCreator && (
                              <Button variant="outlined" size="sm" color="green" onClick={() => approveTask(item._id)}>
                                Duyệt nhiệm vụ chính
                              </Button>
                            )}
                            {/* Nút duyệt nhiệm vụ con: user là leader */}
                            {item.type === 'sub' && user && user._id === item.leader && (
                              <Button variant="outlined" size="sm" color="green" onClick={() => approveTask(item._id)}>
                                Duyệt nhiệm vụ con
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  // Định nghĩa lại TABLE_HEAD_WITH_DEPT đúng thứ tự và tên cột
  const TABLE_HEAD_WITH_DEPT = [
    "Tiêu đề",
    "Phòng ban",
    "Ngày giao",
    "Ngày kết thúc",
    "Trạng thái",
    "Hành động"
  ];

  return (
    <div className="p-6">
      <CreateTaskModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchTasks} indicatorId={indicatorId} />
      <SubmitTaskMainModal
        open={openSubmitMain}
        onClose={() => setOpenSubmitMain(false)}
        error={submitError}
        onSubmit={handleSubmitTask}
      />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Danh sách nhiệm vụ</h1>
        <div className="flex items-center gap-2">
          <Button variant="outlined" onClick={() => navigate('/indicators')}>
            Quay lại
          </Button>
          {isAdminOrManager && (
            <button
              className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
              onClick={() => setOpenCreate(true)}
            >
              Tạo nhiệm vụ
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải dữ liệu...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Chỉ tiêu này chưa có nhiệm vụ nào.</div>
      ) : (
        <Card className="h-full w-full overflow-scroll">
          <table className="w-full min-w-max table-auto text-left">
            <thead>
              <tr>
                {TABLE_HEAD_WITH_DEPT.map((head) => (
                  <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                    <Typography variant="small" color="blue-gray" className="font-normal leading-none opacity-70">{head}</Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((item) => {
                return (
                  <tr key={item._id}>
                    <td className="p-4 border-b border-blue-gray-50">{item.title}</td>
                    <td className="p-4 border-b border-blue-gray-50">{item.department?.name || ""}</td>
                    <td className="p-4 border-b border-blue-gray-50">{formatDate(item.createdAt)}</td>
                    <td className="p-4 border-b border-blue-gray-50">{formatDate(item.endDate)}</td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <StatusDot status={item.status} size="medium" />
                    </td>
                    <td className="p-4 border-b border-blue-gray-50 space-x-2">
                      <Button variant="text" size="sm" onClick={() => navigate(`/tasks/${item._id}`)}>
                        Xem chi tiết
                      </Button>
                      {isAdminOrManager && item.status !== 'submitted' && item.status !== 'approved' && item.status !== 'rejected' && (
                        <Button variant="outlined" size="sm" onClick={() => {
                          setSubmitTaskId(item._id);
                          setSubmitError("");
                          setOpenSubmitMain(true);
                        }}>
                          Submit
                        </Button>
                      )}
                      {isAdminOrManager && (item.status === 'submitted' || item.status === 'approved') && (
                        <TaskStatusBadge status={item.status} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
} 