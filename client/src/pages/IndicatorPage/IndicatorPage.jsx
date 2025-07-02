import React, { useEffect, useState } from "react";
import { Card, Typography } from "@material-tailwind/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/useAuth";
import CreateIndicatorModal from "../../components/modals/CreateIndicatorModal";
import EditIndicatorModal from "../../components/modals/EditIndicatorModal";

const TABLE_HEAD = ["Tên Chỉ Tiêu", "Mã Chỉ Tiêu", "Trạng Thái", "% Hoàn thành", "Số NV hoàn thành/Tổng", ""];

const statusMap = {
  no_tasks: "Chưa có nhiệm vụ",
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành"
};

const IndicatorPage = () => {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchIndicators = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3056/api/indicators", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await res.json();
      setIndicators(data.data?.docs || []);
    } catch {
      setIndicators([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIndicators();
  }, []);

  const isAdminOrManager = user && (user.role === 'admin' || user.role === 'manager');

  const handleDelete = async (indicator) => {
    if (!window.confirm(`Bạn có chắc muốn xóa chỉ tiêu "${indicator.name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:3056/api/indicators/${indicator._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Xóa thất bại");
      }
      fetchIndicators();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6">
      <CreateIndicatorModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchIndicators} />
      <EditIndicatorModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        indicator={editingIndicator}
        onUpdated={fetchIndicators}
      />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Danh sách chỉ tiêu</h1>
        {isAdminOrManager && (
          <button
            className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            onClick={() => setOpenCreate(true)}
          >
            Tạo chỉ tiêu
          </button>
        )}
      </div>
      {loading ? (
        <div className="text-center py-8">Đang tải dữ liệu...</div>
      ) : indicators.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Không có chỉ tiêu nào.</div>
      ) : (
        <Card className="h-full w-full overflow-scroll">
          <table className="w-full min-w-max table-auto text-left">
            <thead>
              <tr>
                {TABLE_HEAD.map((head) => (
                  <th
                    key={head}
                    className="border-b border-blue-gray-100 bg-blue-gray-50 p-4"
                  >
                    <Typography
                      variant="small"
                      color="blue-gray"
                      className="font-normal leading-none opacity-70"
                    >
                      {head}
                    </Typography>
                  </th>
                ))}
                {isAdminOrManager && (
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {indicators.map((item, index) => {
                const isLast = index === indicators.length - 1;
                const classes = isLast ? "p-4" : "p-4 border-b border-blue-gray-50";
                return (
                  <tr key={item._id}>
                    <td className={classes}>{item.name}</td>
                    <td className={classes}>{item.code}</td>
                    <td className={classes}>{statusMap[item.status?.overallStatus] || "-"}</td>
                    <td className={classes}>{item.status?.percentage ?? 0}%</td>
                    <td className={classes}>{item.status?.completed ?? 0}/{item.status?.total ?? 0}</td>
                    <td className={classes}>
                      {isAdminOrManager && (
                        <button
                          className="text-teal-600 hover:underline font-medium"
                          onClick={() => navigate(`/tasks?indicatorId=${item._id}`)}
                        >
                          Chi tiết
                        </button>
                      )}
                    </td>
                    {isAdminOrManager && (
                      <td className={classes + " flex gap-2"}>
                        <button
                          className="text-blue-600 hover:underline font-medium"
                          onClick={() => {
                            setEditingIndicator(item);
                            setOpenEdit(true);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          className="text-red-600 hover:underline font-medium"
                          onClick={() => handleDelete(item)}
                        >
                          Xóa
                        </button>
                      </td>
                    )}
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

export default IndicatorPage;