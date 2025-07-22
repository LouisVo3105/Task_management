import React from "react";
import { Card, Typography } from "@material-tailwind/react";
import CreateIndicatorModal from "../../components/CreateIndicatorModal/CreateIndicatorModal";
import EditIndicatorModal from "../../components/EditIndicatorModal/EditIndicatorModal";
import { formatDate } from "../../utils/formatDate";
import { useAuth } from "../../utils/useAuth";
import StatusDot from "../../components/StatusDot";

const TABLE_HEAD = ["Tên Chỉ Tiêu", "Ngày giao", "Deadline", "Trạng Thái", "% Hoàn thành", "Số NV hoàn thành/Tổng", ""];

export default function IndicatorPageUI({
  indicators,
  loading,
  openCreate,
  setOpenCreate,
  openEdit,
  setOpenEdit,
  editingIndicator,
  setEditingIndicator,
  navigate,
  user,
  isAdmin,
  fetchIndicators,
  handleDelete,
}) {
  const { participatedIndicators } = useAuth();
  // Cho phép admin và manager đều xem chi tiết
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
        {isAdmin && (
          <button
            className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
            onClick={() => setOpenCreate(true)}
          >
            Tạo chỉ tiêu
          </button>
        )}
      </div>
      {loading ? (
        <div className="h-40 bg-gray-100 rounded animate-pulse my-4" />
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
                {isAdmin && (
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {indicators.map((item, index) => {
                const isLast = index === indicators.length - 1;
                const classes = isLast ? "p-4" : "p-4 border-b border-blue-gray-50";
                // Kiểm tra quyền xem chi tiết cho từng indicator
                const canViewDetail =
                  user && (
                    user.role === 'admin' ||
                    user.role === 'manager' ||
                    user.position === 'Giam doc' ||
                    user.position === 'Pho giam doc' ||
                    user.position === 'Truong phong' ||
                    (participatedIndicators && participatedIndicators.some(i => i._id === item._id))
                  );
                return (
                  <tr key={item._id} className="text-xl">
                    <td className={classes}><a className="text-teal-600 text-bold">{item.name}</a></td>
                    <td className={classes}>{formatDate(item.createdAt)}</td>
                    <td className={classes}>{formatDate(item.endDate)}</td>
                    <td className={classes}>
                      <StatusDot status={item.status?.overallStatus} size="small" />
                    </td>
                    <td className={classes}>{item.status?.percentage ?? 0}%</td>
                    <td className={classes}>{item.status?.completed ?? 0}/{item.status?.total ?? 0}</td>
                    <td className={classes}>
                      {canViewDetail && (
                        <button
                          className="text-teal-600 hover:underline font-medium"
                          onClick={() => navigate(`/tasks?indicatorId=${item._id}`)}
                        >
                          Chi tiết
                        </button>
                      )}
                    </td>
                    {isAdmin && (
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