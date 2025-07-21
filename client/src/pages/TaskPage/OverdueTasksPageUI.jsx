import React, { useState } from "react";
import { Card, Typography, Button } from "@material-tailwind/react";
import StatusDot from "../../components/StatusDot";

const TABLE_HEAD = ["Tiêu đề", "Ngày hết hạn", "Số ngày quá deadline", "Trạng thái", "Người thực hiện", "Hành động"];

export default function OverdueTasksPageUI({
  tasks, loading, page, totalPages, totalDocs, setPage,
  cloneOverdueTask, cloneLoading, cloneError, cloneSuccess,
  warnings, loadingWarnings, fetchWarnings,
  exportWarnings, exporting,
}) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [cloneModal, setCloneModal] = useState({ open: false, taskId: null });
  const [newDeadline, setNewDeadline] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

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
            Tổng cộng: {totalDocs} nhiệm vụ quá deadline
          </p>
        </div>
        <Button variant="outlined" onClick={() => window.history.back()}>
          Quay lại
        </Button>
      </div>

      {loading ? (
        <div className="h-40 bg-gray-100 rounded animate-pulse my-4" />
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Không có nhiệm vụ nào quá deadline.
        </div>
      ) : (
        <>
          <Card className="h-full w-full overflow-scroll mb-6">
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
                  <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
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
                        {task.endDate && new Date(task.endDate).toLocaleDateString('vi-VN')}
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
                      {task.type === 'main' ? task.leader : task.assignee}
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
                    <td className="p-4">
                      {task.cloned === false && (
                        <Button
                          variant="outlined"
                          size="sm"
                          color="green"
                          onClick={() => setCloneModal({ open: true, taskId: task._id })}
                          disabled={cloneLoading}
                        >
                          Tạo lại
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Modal clone nhiệm vụ */}
          {cloneModal.open && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm pointer-events-auto">
                <div className="text-lg font-semibold mb-4">Tạo lại nhiệm vụ quá hạn</div>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Deadline mới</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={newDeadline}
                    onChange={e => setNewDeadline(e.target.value)}
                  />
                </div>
                {cloneError && <div className="text-red-500 mb-2">{cloneError}</div>}
                {cloneSuccess && <div className="text-green-600 mb-2">{cloneSuccess}</div>}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="text" color="gray" onClick={() => { setCloneModal({ open: false, taskId: null }); setNewDeadline(""); }}>Hủy</Button>
                  <Button
                    className="bg-teal-600 text-white"
                    onClick={async () => {
                      await cloneOverdueTask(cloneModal.taskId, newDeadline);
                      setCloneModal({ open: false, taskId: null });
                      setNewDeadline("");
                    }}
                    disabled={cloneLoading || !newDeadline}
                  >
                    {cloneLoading ? "Đang tạo lại..." : "Xác nhận"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab/Section cảnh cáo */}
      <div className="mt-10">
        <Button
          variant="outlined"
          color="red"
          onClick={() => {
            setShowWarnings(!showWarnings);
            if (!showWarnings) fetchWarnings();
          }}
        >
          {showWarnings ? "Ẩn danh sách cảnh cáo" : "Xem danh sách nhân viên bị cảnh cáo"}
        </Button>
        {showWarnings && (
          <div className="mt-6">
            {/* Filter section */}
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1">Quý</label>
                <select
                  className="border rounded px-2 py-1"
                  value={filterQuarter}
                  onChange={e => setFilterQuarter(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="1">Quý 1</option>
                  <option value="2">Quý 2</option>
                  <option value="3">Quý 3</option>
                  <option value="4">Quý 4</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Năm</label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-24"
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  min="2000"
                  max="2100"
                />
              </div>
              <Button
                variant="outlined"
                color=""
                size="sm"
                className="px-6 py-1 font-bold border border-black rounded-lg text-black bg-[#77BEF0] hover:bg-[#799EFF] hover:text-black transition"
                onClick={() => fetchWarnings({ quarter: filterQuarter, year: filterYear })}
              >
                Lọc
              </Button>
            </div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-lg font-semibold text-red-600">Danh sách nhân viên bị quá hạn nhiệm vụ</div>
              <div>
                <Button
                  variant="outlined"
                  size="sm"
                  color="blue"
                  onClick={() => exportWarnings("excel")}
                  disabled={exporting}
                  className="mr-2"
                >
                  Export Excel
                </Button>
                <Button
                  variant="outlined"
                  size="sm"
                  color="blue"
                  onClick={() => exportWarnings("csv")}
                  disabled={exporting}
                >
                  Export CSV
                </Button>
              </div>
            </div>
            {loadingWarnings ? (
              <div className="h-20 bg-gray-100 rounded animate-pulse my-4" />
            ) : warnings.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Không có nhân viên nào bị cảnh cáo.</div>
            ) : (
              <Card className="h-full w-full overflow-scroll">
                <table className="w-full min-w-max table-auto text-left">
                  <thead>
                    <tr>
                      <th className="p-2">Tên nhân viên</th>
                      <th className="p-2">Phòng ban</th>
                      <th className="p-2">Số nhiệm vụ quá hạn</th>
                      <th className="p-2">Danh sách nhiệm vụ quá hạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warnings.map((w, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 font-medium">{w.userName || w.name || w.fullnName}</td>
                        <td className="p-2">{w.department?.name || w.department || "-"}</td>
                        <td className="p-2 text-red-600 font-bold">{w.overdueTasks?.length || 0}</td>
                        <td className="p-2">
                          <ul className="list-disc pl-4">
                            {(w.overdueTasks || []).map((t, i) => (
                              <li key={i}>{t.taskName} ({t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : ""})</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <Button
              variant="outlined"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </Button>
            <span className="px-4 py-2 text-sm">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outlined"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 