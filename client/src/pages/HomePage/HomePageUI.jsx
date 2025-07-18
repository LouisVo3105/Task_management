import React from "react";
import { Card, Typography, Spinner } from "@material-tailwind/react";
import { Bar } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../utils/authFetch';
import { formatDate } from '../../utils/formatDate';

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL


export default function HomePageUI({
  user,
  loading,
  total,
  numPending,
  numSubmitted,
  numApproved,
  columnChartData,
  columnChartOptions,
  recentTasks,
  statusMap,
  dashboard,
  overallStats,
  // filter search props
  searchTitle,
  setSearchTitle,
  searchDepartment,
  setSearchDepartment,
  searchLeader,
  setSearchLeader,
  searchIndicator,
  setSearchIndicator,
  searchStartDate,
  setSearchStartDate,
  searchEndDate,
  setSearchEndDate,
  handleSearchTasks,
  searchLoading,
  searchError,
  departments,
  indicators,
  searchResults,
  hasSearched,
}) {
  // State filter tháng/năm
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Bảo vệ dữ liệu bảng: luôn là mảng
  const indicatorProgress = Array.isArray(dashboard.indicatorProgress) ? dashboard.indicatorProgress : [];
  const departmentTaskSummary = Array.isArray(dashboard.departmentTaskSummary) ? dashboard.departmentTaskSummary : [];

  const isAdminOrDirector = user?.role === 'admin' || user?.position === 'Giam doc' || user?.position === 'Pho Giam doc';
  return (
    <div className="max-w-5xl mx-auto p-6">
      <Typography variant="h3" className="mb-4">Trang Chủ</Typography>

      {/* Thống kê quá deadline */}
      {isAdminOrDirector && overallStats && (overallStats.overdueTasks > 0) && (
        <Card className="p-4 mb-6 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h6" className="text-red-600 font-bold">
                ⚠️ Nhiệm vụ Quá Deadline
              </Typography>
              <Typography variant="body2" className="text-red-700 mt-1">
                Có {overallStats.overdueTasks} nhiệm vụ quá deadline cần xử lý
              </Typography>
            </div>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              onClick={() => window.location.href = '/overdue-tasks'}
            >
              Xem chi tiết
            </button>
          </div>
        </Card>
      )}

      {isAdminOrDirector && (
        <>
          {/* UI filter tìm kiếm nhiệm vụ */}
          <FilterTaskSearch
            searchTitle={searchTitle}
            setSearchTitle={setSearchTitle}
            searchDepartment={searchDepartment}
            setSearchDepartment={setSearchDepartment}
            searchLeader={searchLeader}
            setSearchLeader={setSearchLeader}
            searchIndicator={searchIndicator}
            setSearchIndicator={setSearchIndicator}
            searchStartDate={searchStartDate}
            setSearchStartDate={setSearchStartDate}
            searchEndDate={searchEndDate}
            setSearchEndDate={setSearchEndDate}
            indicators={indicators}
            handleSearchTasks={handleSearchTasks}
            searchLoading={searchLoading}
            searchError={searchError}
            departments={departments}
          />
          <div className="mb-8 space-y-8">
            {/* Bảng kết quả tìm kiếm đặt ngay dưới filter */}
            {hasSearched && (
              <SearchResultsTable searchResults={searchResults} statusMap={statusMap} />
            )}
            {searchLoading && (
              <div className="h-32 bg-gray-100 rounded animate-pulse my-4" />
            )}
            {/* 1. Bảng tiến độ hoàn thành chỉ tiêu */}
            <Card className="p-4">
              <Typography variant="h6" className="mb-2">Tiến độ hoàn thành từng chỉ tiêu</Typography>
              {/* Bar chart */}
              {dashboard.loadingDashboard ? (
                <div className="h-32 bg-gray-100 rounded animate-pulse mb-4" />
              ) : indicatorProgress.length > 0 && (
                <div className="mb-4">
                  <Bar
                    data={{
                      labels: indicatorProgress.map(row => row.indicatorName),
                      datasets: [
                        {
                          label: 'Tỷ lệ hoàn thành (%)',
                          data: indicatorProgress.map(row => row.percent),
                          backgroundColor: 'rgba(34,197,94,0.7)',
                          borderColor: 'rgba(34,197,94,1)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } },
                      },
                    }}
                  />
                </div>
              )}
              {dashboard.loadingDashboard ? (
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr>
                        <th className="p-2">Chỉ tiêu</th>
                        <th className="p-2">Tổng nhiệm vụ</th>
                        <th className="p-2">Đã hoàn thành</th>
                        <th className="p-2">Tỷ lệ (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicatorProgress.length === 0
                        ? (<tr><td colSpan={4} className="p-2 text-center text-gray-400">Không có dữ liệu.</td></tr>)
                        : indicatorProgress.map(row => (
                          <tr key={row.indicatorId}>
                            <td className="p-2">{row.indicatorName}</td>
                            <td className="p-2">{row.total}</td>
                            <td className="p-2">{row.completed}</td>
                            <td className="p-2">{row.percent}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            {/* 2. Bảng tiến độ hoàn thành phòng ban */}
            <Card className="p-4">
              <Typography variant="h6" className="mb-2">Tiến độ hoàn thành từng phòng ban</Typography>
              {dashboard.loadingDashboard ? (
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr>
                        <th className="p-2">Phòng ban</th>
                        <th className="p-2">Tổng nhiệm vụ</th>
                        <th className="p-2">Đã hoàn thành</th>
                        <th className="p-2">Tỷ lệ (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentTaskSummary.length === 0 ? (
                        <tr><td colSpan={4} className="p-2 text-center text-gray-400">Không có dữ liệu.</td></tr>
                      ) : departmentTaskSummary.map(row => (
                        <tr key={row.departmentId}>
                          <td className="p-2">{row.departmentName}</td>
                          <td className="p-2">{row.total}</td>
                          <td className="p-2">{row.completed}</td>
                          <td className="p-2">{row.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            {/* Bảng tổng hợp nhiệm vụ chính từng phòng ban */}
            <Card className="p-4">
              <div className="flex items-center gap-4 mb-2">
                <Typography variant="h6">Tổng hợp nhiệm vụ chính từng phòng ban</Typography>
                {/* Filter tháng/năm */}
                <select onChange={e => setMonth(Number(e.target.value))} value={month} className="border rounded px-2 py-1">
                  {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{`Tháng ${i + 1}`}</option>)}
                </select>
                <select onChange={e => setYear(Number(e.target.value))} value={year} className="border rounded px-2 py-1">
                  {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button
                  className="ml-2 px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700"
                  onClick={() => dashboard.fetchDashboardAnalytics(month, year)}
                >Lọc</button>
              </div>
              {dashboard.loadingDashboard ? (
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr>
                        <th className="p-2">Phòng ban</th>
                        <th className="p-2">Nhiệm vụ chưa hoàn thành còn hạn</th>
                        <th className="p-2">Nhiệm vụ đã hoàn thành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentTaskSummary.length === 0
                        ? (<tr><td colSpan={3} className="p-2 text-center text-gray-400">Không có dữ liệu.</td></tr>)
                        : departmentTaskSummary.map(dep => (
                          <tr key={dep && dep.departmentId ? dep.departmentId : Math.random()}>
                            <td className="p-2 align-top font-semibold">{dep && dep.departmentName ? dep.departmentName : 'Không rõ tên phòng ban'}</td>
                            <td className="p-2 align-top">
                              {Array.isArray(dep?.incompleteTasks) && dep.incompleteTasks.length > 0 ? (
                                <ul className="list-disc pl-4">
                                  {dep.incompleteTasks.map(task => (
                                    <li key={task && task.taskId ? task.taskId : Math.random()}>
                                      <span className="font-semibold">{task && task.title ? task.title : 'Không rõ tên nhiệm vụ'}</span>
                                      {task && typeof task.leader === 'object' && task.leader && task.leader.fullName ? (
                                        <span className="ml-2 text-sm text-red-600">(Chủ trì: {task.leader.fullName})</span>
                                      ) : null}
                                      {task && task.endDate ? (
                                        <span className="ml-2 text-xs text-gray-500">(Hạn: {formatDate(task.endDate)})</span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="p-2 align-top">
                              {Array.isArray(dep?.completedTasks) && dep.completedTasks.length > 0 ? (
                                <ul className="list-disc pl-4">
                                  {dep.completedTasks.map(task => (
                                    <li key={task && task.taskId ? task.taskId : Math.random()}>
                                      <span className="font-semibold">{task && task.title ? task.title : 'Không rõ tên nhiệm vụ'}</span>
                                      {task && typeof task.leader === 'object' && task.leader && task.leader.fullName ? (
                                        <span className="ml-2 text-sm text-green-700">(Chủ trì: {task.leader.fullName})</span>
                                      ) : null}
                                      {task && task.endDate ? (
                                        <span className="ml-2 text-xs text-gray-500">(Hoàn thành: {formatDate(task.endDate)})</span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
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
              <Card className="p-4 shadow-lg border-2 border-blue-400">
                <Typography variant="h6" className="mb-2">Tiến độ hoàn thành nhiệm vụ của bạn</Typography>
                {(columnChartData && columnChartData.datasets[0].data.some(v => typeof v === 'number')) ? (
                  <Bar data={columnChartData} options={columnChartOptions} />
                ) : (
                  <Typography className="text-gray-400">Không có dữ liệu để hiển thị biểu đồ.</Typography>
                )}
              </Card>
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
                        <td className="p-2">{task.endDate ? formatDate(task.endDate) : ''}</td>
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

// FilterTaskSearch component
function FilterTaskSearch({
  searchTitle,
  setSearchTitle,
  searchDepartment,
  setSearchDepartment,
  searchLeader,
  setSearchLeader,
  searchIndicator,
  setSearchIndicator,
  searchStartDate,
  setSearchStartDate,
  searchEndDate,
  setSearchEndDate,
  indicators,
  handleSearchTasks,
  searchLoading,
  searchError,
  departments,
}) {
  // State cho leaders động
  const [leaders, setLeaders] = useState([]);

  // Khi chọn phòng ban, fetch leaders từ API
  useEffect(() => {
    if (!searchDepartment) {
      setLeaders([]);
      return;
    }
    const token = sessionStorage.getItem('accessToken');
    authFetch(`${BASE_URL}/api/departments/${searchDepartment}/leaders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(json => {
        setLeaders(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        setLeaders([]);
      });
  }, [searchDepartment]);

  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="flex flex-col md:flex-row md:gap-4 gap-2 items-center w-full">
        <div className="flex flex-col w-full md:w-64">
          <label className="text-sm font-medium text-gray-700 mb-1">Tên nhiệm vụ</label>
          <input
            type="text"
            placeholder="Tìm theo tên nhiệm vụ..."
            value={searchTitle}
            onChange={e => setSearchTitle(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div className="flex flex-col w-full md:w-48">
          <label className="text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
          <select
            value={searchDepartment}
            onChange={e => setSearchDepartment(e.target.value)}
            className={`border rounded px-2 py-1 w-full ${(!departments || departments.length === 0) ? 'bg-gray-100 text-gray-400' : ''}`}
            disabled={!departments || departments.length === 0}
          >
            <option value="">{(!departments || departments.length === 0) ? 'Không có phòng ban' : 'Chọn phòng ban...'}</option>
            {departments && departments.map(dep => (
              <option key={dep._id} value={dep._id}>{dep.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col w-full md:w-48">
          <label className="text-sm font-medium text-gray-700 mb-1">Chủ trì</label>
          <select
            value={searchLeader}
            onChange={e => setSearchLeader(e.target.value)}
            className={`border rounded px-2 py-1 w-full ${(!searchDepartment || leaders.length === 0) ? 'bg-gray-100 text-gray-400' : ''}`}
            disabled={!searchDepartment || leaders.length === 0}
          >
            <option value="">{!searchDepartment ? 'Chọn phòng ban trước' : (leaders.length === 0 ? 'Không có chủ trì' : 'Tất cả chủ trì')}</option>
            {leaders.map(leader => (
              <option key={leader._id} value={leader._id}>{leader.fullName}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col w-full md:w-48">
          <label className="text-sm font-medium text-gray-700 mb-1">Chỉ tiêu</label>
          <select
            value={searchIndicator}
            onChange={e => setSearchIndicator(e.target.value)}
            className={`border rounded px-2 py-1 w-full ${(!indicators || indicators.length === 0) ? 'bg-gray-100 text-gray-400' : ''}`}
            disabled={!indicators || indicators.length === 0}
          >
            <option value="">{(!indicators || indicators.length === 0) ? 'Không có chỉ tiêu' : 'Tất cả chỉ tiêu'}</option>
            {indicators && indicators.map(ind => (
              <option key={ind._id} value={ind._id}>{ind.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:gap-4 gap-2 items-center w-full">
        <div className="flex flex-col w-full md:w-40">
          <label className="text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
          <input
            type="date"
            value={searchStartDate}
            onChange={e => setSearchStartDate(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            placeholder="Từ ngày"
          />
        </div>
        <div className="flex flex-col w-full md:w-40">
          <label className="text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
          <input
            type="date"
            value={searchEndDate}
            onChange={e => setSearchEndDate(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            placeholder="Đến ngày"
          />
        </div>
        <div className="flex flex-col w-full md:w-auto mt-2 md:mt-6">
          <label className="block md:hidden text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
          <button
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 w-full md:w-auto"
            onClick={handleSearchTasks}
            disabled={searchLoading}
          >
            {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </div>
        {searchError && <span className="text-red-600 ml-2 mt-2 md:mt-6">{searchError}</span>}
      </div>
    </div>
  );
}

// Bảng kết quả tìm kiếm đặt ngay dưới filter (trong dashboard)
function SearchResultsTable({ searchResults, statusMap }) {
  const navigate = useNavigate();
  return (
    <div className="w-full mb-8">
      <Card className="w-full border border-blue-gray-100 shadow-md p-0">
        <Typography variant="h6" className="p-4 pb-2">Kết quả tìm kiếm</Typography>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-blue-gray-50">
              <tr>
                <th className="p-3">Tên nhiệm vụ</th>
                <th className="p-3">Phòng ban</th>
                <th className="p-3">Chủ trì</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Hạn hoàn thành</th>
                <th className="p-3">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.length === 0 ? (
                <tr><td colSpan={6} className="p-3 text-center text-gray-400">Không tìm thấy nhiệm vụ nào.</td></tr>
              ) : searchResults.map(task => (
                <tr key={task._id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{task.title}</td>
                  <td className="p-3">{task.department?.name || ''}</td>
                  <td className="p-3">{task.leader?.fullName || ''}</td>
                  <td className="p-3">{statusMap[task.status] || task.status}</td>
                  <td className="p-3">{task.endDate ? formatDate(task.endDate) : ''}</td>
                  <td className="p-3">
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-700 text-sm"
                      onClick={() => navigate(`/tasks/${task._id}`)}
                    >Xem chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 