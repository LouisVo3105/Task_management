import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Typography, Button } from "@material-tailwind/react";
import { useAuth } from "../../utils/useAuth";
import CreateTaskModal from "../../components/modals/CreateTaskModal";
import SubmitTaskMainModal from "../../components/modals/SubmitTaskMainModal";
// Giả sử bạn sẽ tạo modal này ở bước tiếp theo
// import UpdateTaskStatusModal from "../../components/modals/UpdateTaskStatusModal"; 

const TABLE_HEAD = ["Mã NV", "Tiêu đề", "Ngày kết thúc", "Trạng thái", "Hành động"];

// Map để dịch trạng thái sang tiếng Việt và gán màu sắc
const statusMap = {
  pending: { text: "Đang thực hiện", color: "text-yellow-600" },
  approved: { text: "Đã duyệt", color: "text-green-600" },
  submitted: { text: "Đã nộp", color: "text-blue-600" },
  in_progress: { text: "Đang làm", color: "text-cyan-600" },
  rejected: { text: "Bị từ chối", color: "text-red-600" },
  completed: { text: "Hoàn thành", color: "text-purple-600" },
};

const TaskPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [openSubmitMain, setOpenSubmitMain] = useState(false);
  const [submitTaskId, setSubmitTaskId] = useState(null);
  const [submitError, setSubmitError] = useState("");
  // State cho modal (sẽ dùng ở bước sau)
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedTask, setSelectedTask] = useState(null);

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
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      console.log('Dữ liệu nhiệm vụ theo chỉ tiêu trả về:', data);
      setTasks(Array.isArray(data.data?.tasks) ? data.data.tasks : []);
    } catch {
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!indicatorId) {
      // Nếu không có indicatorId, lấy nhiệm vụ chưa hoàn thành của user hiện tại
      if (!user || !user._id) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`http://localhost:3056/api/tasks/incomplete/${user._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
        .then(res => res.json())
        .then(data => {
          console.log('Dữ liệu nhiệm vụ chưa hoàn thành trả về:', data);
          setTasks(Array.isArray(data.data?.docs) ? data.data.docs : []);
          setLoading(false);
        })
        .catch(() => {
          setTasks([]);
          setLoading(false);
        });
      // Nếu là admin/manager, lấy thêm nhiệm vụ chờ duyệt
      if (isAdminOrManager && user && user._id) {
        setLoadingPending(true);
        fetch(`http://localhost:3056/api/tasks/pending/${user._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        })
          .then(res => res.json())
          .then(data => {
            console.log('Dữ liệu nhiệm vụ chờ duyệt trả về:', data);
            setPendingTasks(Array.isArray(data.data?.docs) ? data.data.docs.filter(t => t.status === 'submitted') : []);
            setLoadingPending(false);
          })
          .catch(() => {
            setPendingTasks([]);
            setLoadingPending(false);
          });
      }
      return;
    }
    // Nếu có indicatorId, lấy nhiệm vụ theo chỉ tiêu
    fetchTasks();
  }, [indicatorId, user]);

  const isAdminOrManager = user && (user.role === 'admin' || user.role === 'manager');

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
                  {TABLE_HEAD.map((head) => (
                    <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                      <Typography variant="small" color="blue-gray" className="font-normal leading-none opacity-70">{head}</Typography>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((item) => {
                  const statusInfo = statusMap[item.status] || { text: item.status, color: 'text-gray-800' };
                  return (
                    <tr key={item._id}>
                      <td className="p-4 border-b border-blue-gray-50">{item.code}</td>
                      <td className="p-4 border-b border-blue-gray-50">{item.title}</td>
                      <td className="p-4 border-b border-blue-gray-50">{item.endDate ? new Date(item.endDate).toLocaleDateString() : ""}</td>
                      <td className={`p-4 border-b border-blue-gray-50 font-semibold ${statusInfo.color}`}>{statusInfo.text}</td>
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
                      const statusInfo = statusMap[item.status] || { text: item.status, color: 'text-gray-800' };
                      return (
                        <tr key={item._id}>
                          <td className="p-4 border-b border-blue-gray-50">{item.code}</td>
                          <td className="p-4 border-b border-blue-gray-50">{item.title}</td>
                          <td className="p-4 border-b border-blue-gray-50">{item.endDate ? new Date(item.endDate).toLocaleDateString() : ""}</td>
                          <td className={`p-4 border-b border-blue-gray-50 font-semibold ${statusInfo.color}`}>{statusInfo.text}</td>
                          <td className="p-4 border-b border-blue-gray-50 space-x-2">
                            <Button variant="text" size="sm" onClick={() => navigate(`/pending-tasks/${item._id}`)}>
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
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <CreateTaskModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchTasks} indicatorId={indicatorId} />
      <SubmitTaskMainModal
        open={openSubmitMain}
        onClose={() => setOpenSubmitMain(false)}
        error={submitError}
        onSubmit={async ({ submitNote, submitLink }) => {
          try {
            const payload = { submitNote, submitLink };
            console.log('Dữ liệu gửi lên server:', payload);
            const res = await fetch(`http://localhost:3056/api/tasks/${submitTaskId}/submit`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
              setSubmitError(data.message || 'Có lỗi xảy ra khi nộp nhiệm vụ');
              console.log('Lỗi submit nhiệm vụ chính:', data);
              throw new Error(data.message || 'Có lỗi xảy ra khi nộp nhiệm vụ');
            }
            setOpenSubmitMain(false);
            setSubmitTaskId(null);
            setSubmitError("");
            fetchTasks();
          } catch (err) {
            console.log('Lỗi submit nhiệm vụ chính:', err.message);
            // Có thể hiển thị lỗi cho người dùng ở đây
          }
        }}
      />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Danh sách nhiệm vụ</h1>
        {isAdminOrManager && (
          <button
            className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            onClick={() => setOpenCreate(true)}
          >
            Tạo nhiệm vụ
          </button>
        )}
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
                {TABLE_HEAD.map((head) => (
                  <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                    <Typography variant="small" color="blue-gray" className="font-normal leading-none opacity-70">{head}</Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((item) => {
                const statusInfo = statusMap[item.status] || { text: item.status, color: 'text-gray-800' };
                return (
                  <tr key={item._id}>
                    <td className="p-4 border-b border-blue-gray-50">{item.code}</td>
                    <td className="p-4 border-b border-blue-gray-50">{item.title}</td>
                    <td className="p-4 border-b border-blue-gray-50">{item.endDate ? new Date(item.endDate).toLocaleDateString() : ""}</td>
                    <td className={`p-4 border-b border-blue-gray-50 font-semibold ${statusInfo.color}`}>
                      {statusInfo.text}
                    </td>
                    <td className="p-4 border-b border-blue-gray-50 space-x-2">
                      <Button variant="text" size="sm" onClick={() => navigate(`/tasks/${item._id}`)}>
                        Xem chi tiết
                      </Button>
                      {isAdminOrManager && item.status !== 'submitted' && item.status !== 'approved' && (
                        <Button variant="outlined" size="sm" onClick={() => {
                          setSubmitTaskId(item._id);
                          setSubmitError("");
                          setOpenSubmitMain(true);
                        }}>
                          Submit
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
  );
};

export default TaskPage;
