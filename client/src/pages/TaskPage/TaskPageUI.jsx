import React from "react";
import { Card, Typography, Button } from "@material-tailwind/react";
import CreateTaskModal from "../../components/modals/CreateTaskModal";
import SubmitTaskMainModal from "../../components/modals/SubmitTaskMainModal";
import StatusDot from "../../components/StatusDot";
import { formatDate } from "../../utils/formatDate";
import TaskProcessManager from "../../components/TaskProcessManager";

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
      <div className="p-6 min-h-[650px]">
        <h1 className="text-2xl font-bold mb-4">Nhiệm vụ chưa hoàn thành của bạn</h1>
        {loading ? (
          <div className="overflow-x-auto">
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
                {[...Array(15)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-3/4" /></td>
                    <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/2" /></td>
                    <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/2" /></td>
                    <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/3" /></td>
                    <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/2" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="my-2" style={{ height: '8px' }} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 min-h-[200px] flex items-center justify-center">Bạn không có nhiệm vụ nào chưa hoàn thành.</div>
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
              <div className="h-40 bg-gray-100 rounded animate-pulse my-4" />
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

        {/* Quản lý thực hiện nhiệm vụ */}
        {isAdminOrManager && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">Quản lý thực hiện nhiệm vụ</h2>
            {loading ? (
              <div className="h-40 bg-gray-100 rounded animate-pulse my-4" />
            ) : (
              <TaskProcessManager />
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

  // Tối ưu hiển thị: chỉ hiển thị nhiệm vụ clone nếu đã có clone, nếu chưa có clone thì hiển thị nhiệm vụ gốc
  const rootTasks = tasks.filter(t => t.isRoot);
  const cloneTasks = tasks.filter(t => !t.isRoot);
  const rootTaskIdsWithClone = new Set(cloneTasks.map(t => t.parentTask?.toString()));
  const displayTasks = [
    ...cloneTasks,
    ...rootTasks.filter(t => !rootTaskIdsWithClone.has(t._id.toString()))
  ];

  return (
    <div className="p-6 min-h-[650px]">
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-max table-auto text-left">
            <thead>
              <tr>
                {TABLE_HEAD_WITH_DEPT.map((head) => (
                  <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                    <Typography variant="small" color="blue-gray" className="font-normal leading-none opacity-70">{head}</Typography>
                  </th>
                ))}
                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Loại</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(15)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-3/4" /></td>
                  <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/2" /></td>
                  <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/2" /></td>
                  <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/3" /></td>
                  <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/2" /></td>
                  <td className="p-4 border-b border-blue-gray-50"><div className="h-6 bg-gray-200 rounded w-1/2" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="my-2" style={{ height: '8px' }} />
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 min-h-[200px] flex items-center justify-center">Chỉ tiêu này chưa có nhiệm vụ nào.</div>
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
                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Loại</th>
              </tr>
            </thead>
            <tbody>
              {displayTasks.map((item) => {
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
                          Nộp báo cáo
                        </Button>
                      )}
                      {isAdminOrManager && (item.status === 'submitted' || item.status === 'approved') && (
                        <TaskStatusBadge status={item.status} />
                      )}
                    </td>
                    <td className="p-4 border-b border-blue-gray-50">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${item.isRoot ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.isRoot ? 'Nhiệm vụ gốc' : 'Đã tạo lại'}
                      </span>
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