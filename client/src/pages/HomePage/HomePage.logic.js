import { useEffect, useState } from "react";
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
import { authFetch } from '../../utils/authFetch';
import { useSSEContext } from "@utils/SSEContext";

const API_URL = 'http://localhost:3056/api';
const statusMap = {
  pending: 'Đang thực hiện',
  submitted: 'Chờ duyệt',
  approved: 'Đã hoàn thành',
};

export function useHomePageLogic() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState(null);
  const [userPerformance, setUserPerformance] = useState([]);
  // Dashboard analytics states
  const [indicatorProgress, setIndicatorProgress] = useState([]);
  const [departmentTaskSummary, setDepartmentTaskSummary] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [errorDashboard, setErrorDashboard] = useState(null);
  // State phòng ban
  const [departments, setDepartments] = useState([]);

  // State filter tìm kiếm nhiệm vụ
  const [searchTitle, setSearchTitle] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('');
  const [searchLeader, setSearchLeader] = useState('');
  const [searchIndicator, setSearchIndicator] = useState(''); // Thêm state filter chỉ tiêu
  const [searchStartDate, setSearchStartDate] = useState(''); // Thêm state filter ngày bắt đầu
  const [searchEndDate, setSearchEndDate] = useState(''); // Thêm state filter ngày kết thúc
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  // State kết quả tìm kiếm
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  // State danh sách chỉ tiêu
  const [indicators, setIndicators] = useState([]);

  // Hàm tìm kiếm nhiệm vụ
  const handleSearchTasks = async () => {
    setSearchLoading(true);
    setSearchError(null);
    const params = [];
    if (searchTitle) params.push(`title=${encodeURIComponent(searchTitle)}`);
    if (searchDepartment) params.push(`department=${encodeURIComponent(searchDepartment)}`);
    if (searchLeader) params.push(`leader=${encodeURIComponent(searchLeader)}`);
    if (searchIndicator) params.push(`indicator=${encodeURIComponent(searchIndicator)}`); // Thêm filter chỉ tiêu
    if (searchStartDate) params.push(`startDate=${encodeURIComponent(searchStartDate)}`); // Thêm filter ngày bắt đầu
    if (searchEndDate) params.push(`endDate=${encodeURIComponent(searchEndDate)}`); // Thêm filter ngày kết thúc
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    try {
      const res = await authFetch(`${API_URL}/tasks/search${query}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data.data) ? data.data : []);
      setHasSearched(true);
    } catch {
      setSearchError('Lỗi tìm kiếm nhiệm vụ');
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const res = await authFetch(`${API_URL}/users/me`);
      const data = await res.json();
      setUser(data.data);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    if (user.role === 'admin' || user.role === 'manager') {
      authFetch(`${API_URL}/analysis/overall-stats`).then(res => res.json()).then(data => setOverallStats(data.data));

      authFetch(`${API_URL}/analysis/user-performance`).then(res => res.json()).then(data => setUserPerformance(data.data));
    }
  }, [user]);

  // Lấy danh sách nhiệm vụ của user (không lấy pending theo userId nữa)
  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    Promise.all([
      authFetch(`${API_URL}/tasks/incomplete/${user._id}`).then(res => res.json()),
      authFetch(`${API_URL}/tasks/pending`).then(res => res.json()),
      authFetch(`${API_URL}/tasks/completed/${user._id}`).then(res => res.json()).catch(() => ({ data: [] })),
    ]).then(([incomplete, pending, completed]) => {
      const allTasks = [
        ...(incomplete.data?.docs || []),
        ...(pending.data?.docs || []),
        ...(completed.data?.docs || []),
      ];
      const uniqueTasks = Array.from(new Map(allTasks.map(t => [t._id, t])).values());
      setTasks(uniqueTasks);
      setLoading(false);
    });
  }, [user]);

  // Fetch dashboard analytics (hỗ trợ lọc tháng/năm)
  const fetchDashboardAnalytics = async (month, year) => {
    setLoadingDashboard(true);
    setErrorDashboard(null);
    try {
      // Xây dựng query string nếu có month/year
      let query = '';
      if (month && year) {
        query = `?month=${month}&year=${year}`;
      }
      const [indRes, deptSummaryRes] = await Promise.all([
        authFetch(`${API_URL}/analysis/indicator-progress`).then(res => res.json()),
        authFetch(`${API_URL}/analysis/department-task-summary${query}`).then(res => res.json()),
      ]);
      const summaryArr = Array.isArray(deptSummaryRes) ? deptSummaryRes : deptSummaryRes.data || [];
      const mappedSummary = summaryArr.map(dep => ({
        ...dep,
        total: (dep.incompleteTasks?.length || 0) + (dep.completedTasks?.length || 0),
        completed: dep.completedTasks?.length || 0,
        percent: ((dep.completedTasks?.length || 0) + (dep.incompleteTasks?.length || 0)) > 0
          ? Math.round((dep.completedTasks.length / ((dep.incompleteTasks.length || 0) + (dep.completedTasks.length || 0))) * 100)
          : 0,
      }));
      setDepartmentTaskSummary(mappedSummary);
      setIndicatorProgress(Array.isArray(indRes) ? indRes : indRes.data || []);
    } catch {
      setErrorDashboard('Lỗi tải dữ liệu dashboard');
    }
    setLoadingDashboard(false);
  };

  // Chỉ fetch dashboard analytics và phòng ban nếu là admin hoặc Giam doc/Pho Giam doc
  useEffect(() => {
    if (!user) return;
    const isAdminOrDirector = user.role === 'admin' || user.position === 'Giam doc' || user.position === 'Pho Giam doc';
    if (isAdminOrDirector) {
      fetchDashboardAnalytics();
      const fetchDepartments = async () => {
        try {
          const res = await authFetch('http://localhost:3056/api/departments');
          const json = await res.json();
          if (Array.isArray(json.data)) setDepartments(json.data);
        } catch (err) {
          console.log('Lỗi fetch phòng ban:', err);
        }
      };
      fetchDepartments();
      // Thêm fetch chỉ tiêu
      const fetchIndicators = async () => {
        try {
          const res = await authFetch('http://localhost:3056/api/indicators?limit=1000');
          const json = await res.json();
          if (Array.isArray(json.data?.docs)) setIndicators(json.data.docs);
        } catch {
          setIndicators([]);
        }
      };
      fetchIndicators();
    }
    // eslint-disable-next-line
  }, [user]);

  useSSEContext((event) => {
    // Tự động fetch lại dữ liệu khi có sự kiện liên quan
    if ([
      "task_created", "task_updated", "task_deleted", "subtask_created", "subtask_updated",
      "indicator_created", "indicator_updated", "indicator_deleted",
      "user_created", "user_updated", "user_deleted"
    ].includes(event.type)) {
      // Fetch lại các dữ liệu chính trên trang chủ
      if (user) {
        // Fetch lại nhiệm vụ
        setLoading(true);
        Promise.all([
          authFetch(`${API_URL}/tasks/incomplete/${user._id}`).then(res => res.json()),
          authFetch(`${API_URL}/tasks/pending`).then(res => res.json()),
          authFetch(`${API_URL}/tasks/completed/${user._id}`).then(res => res.json()).catch(() => ({ data: [] })),
        ]).then(([incomplete, pending, completed]) => {
          const allTasks = [
            ...(incomplete.data?.docs || []),
            ...(pending.data?.docs || []),
            ...(completed.data?.docs || []),
          ];
          const uniqueTasks = Array.from(new Map(allTasks.map(t => [t._id, t])).values());
          setTasks(uniqueTasks);
          setLoading(false);
        });
      }
      // Fetch lại chỉ tiêu nếu là admin/manager
      if (user && (user.role === 'admin' || user.role === 'manager')) {
        authFetch('http://localhost:3056/api/indicators?limit=1000')
          .then(res => res.json())
          .then(json => {
            if (Array.isArray(json.data?.docs)) setIndicators(json.data.docs);
          })
          .catch(() => setIndicators([]));
      }
      // Fetch lại user performance nếu là admin/manager
      if (user && (user.role === 'admin' || user.role === 'manager')) {
        authFetch(`${API_URL}/analysis/user-performance`).then(res => res.json()).then(data => setUserPerformance(data.data));
      }
      // Fetch lại overallStats nếu là admin/manager
      if (user && (user.role === 'admin' || user.role === 'manager')) {
        authFetch(`${API_URL}/analysis/overall-stats`).then(res => res.json()).then(data => setOverallStats(data.data));
      }
      // Fetch lại dashboard analytics nếu là admin hoặc Giam doc/Pho Giam doc
      if (user && (user.role === 'admin' || user.position === 'Giam doc' || user.position === 'Pho Giam doc')) {
        fetchDashboardAnalytics();
      }
    }
  });

  // Derived data
  const total = tasks.length;
  const numPending = tasks.filter(t => t.status === 'pending').length;
  const numSubmitted = tasks.filter(t => t.status === 'submitted').length;
  const numApproved = tasks.filter(t => t.status === 'approved').length;

  const columnChartData = {
    labels: ['Đang thực hiện', 'Chờ duyệt', 'Đã hoàn thành'],
    datasets: [
      {
        label: 'Số lượng nhiệm vụ',
        data: [numPending, numSubmitted, numApproved],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(251, 146, 60, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };
  const columnChartOptions = {
    indexAxis: 'x',
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { display: true },
        ticks: {
          callback: function (value) {
            if (Number.isInteger(value)) {
              return value;
            }
            return null;
          },
          stepSize: 1,
        },
      },
    },
  };

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
    .slice(0, 5);

  const overallChartData = overallStats ? {
    labels: ['Đang thực hiện', 'Chờ duyệt', 'Đã hoàn thành', 'Quá deadline'],
    datasets: [
      {
        data: [
          overallStats.pendingTasks,
          overallStats.submittedTasks,
          overallStats.approvedTasks,
          overallStats.overdueTasks
        ],
        backgroundColor: [
          'rgba(251, 191, 36, 0.7)',
          'rgba(20, 184, 166, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  // Dashboard exports
  const dashboard = {
    indicatorProgress,
    departmentTaskSummary,
    loadingDashboard,
    errorDashboard,
    fetchDashboardAnalytics,
  };

  return {
    user,
    tasks,
    loading,
    overallStats,
    userPerformance,
    total,
    numPending,
    numSubmitted,
    numApproved,
    columnChartData,
    columnChartOptions,
    recentTasks,
    overallChartData,
    statusMap,
    dashboard,
    // filter search
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
  };
} 