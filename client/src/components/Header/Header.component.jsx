import { useAuth } from '../../utils/useAuth';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../assets/logo.svg';
import { mapPositionLabel } from '../../utils/positionLabel';
import { useSSEContext } from "@utils/SSEContext";
import { useNotification } from '../NotificationProvider';

const notificationEventTypes = [
  'main_task_deadline_soon',
  'subtask_deadline_soon',
  'indicator_deadline_soon',
  'task_overdue',
  'indicator_overdue',
];

const bellEventTypes = [
  'tasks_incomplete_count',
  'tasks_pending_approval_count',
  'task_approved',
  'task_rejected',
  'subtask_approved',
  'subtask_rejected',
  'main_task_deadline_soon',
  'main_task_overdue',
  'subtask_deadline_soon',
  'subtask_overdue',
];

const Header = ({ onLoginClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Lắng nghe các event deadline/quá hạn từ SSE
  useSSEContext((event) => {
    console.log('BELL SSE EVENT:', event); // Log event nhận được
    // Lắng nghe các event deadline/quá hạn từ SSE (giữ nguyên)
    if (notificationEventTypes.includes(event.type)) {
      setNotifications(prev => [
        {
          id: Date.now() + Math.random(),
          type: event.type,
          title: event.title || event.name || event.indicatorName || 'Thông báo',
          message: event.message ||
            (event.type === 'main_task_deadline_soon' ? `Nhiệm vụ chính "${event.title}" sắp đến hạn (${event.daysToDeadline} ngày nữa)!` :
              event.type === 'subtask_deadline_soon' ? `Subtask "${event.title}" sắp đến hạn (${event.daysToDeadline} ngày nữa)!` :
                event.type === 'indicator_deadline_soon' ? `Chỉ tiêu "${event.name}" sắp đến hạn (${event.daysToDeadline} ngày nữa)!` :
                  event.type === 'task_overdue' ? `Nhiệm vụ "${event.title}" đã quá hạn!` :
                    event.type === 'indicator_overdue' ? `Chỉ tiêu "${event.name}" đã quá hạn!` :
                      ''),
          createdAt: new Date(),
          read: false,
        },
        ...prev
      ]);
    }
    // Lắng nghe các event bell từ backend
    if (bellEventTypes.includes(event.type)) {
      let message = '';
      let title = 'Thông báo';
      let shouldAdd = true;
      switch (event.type) {
        case 'tasks_incomplete_count':
          title = 'Nhiệm vụ chưa hoàn thành';
          message = `Bạn còn ${event.count} nhiệm vụ chưa hoàn thành.`;
          shouldAdd = event.count > 0;
          break;
        case 'tasks_pending_approval_count':
          title = 'Nhiệm vụ chờ duyệt';
          message = `Có ${event.count} nhiệm vụ đang chờ duyệt.`;
          shouldAdd = event.count > 0;
          break;
        case 'task_approved':
          title = 'Nhiệm vụ chính đã được duyệt';
          message = event.message || `Nhiệm vụ "${event.title || ''}" đã được duyệt.`;
          break;
        case 'task_rejected':
          title = 'Nhiệm vụ chính bị từ chối';
          message = event.message || `Nhiệm vụ "${event.title || ''}" đã bị từ chối.`;
          break;
        case 'subtask_approved':
          title = 'Nhiệm vụ con đã được duyệt';
          message = event.message || `Nhiệm vụ con "${event.title || ''}" đã được duyệt.`;
          break;
        case 'subtask_rejected':
          title = 'Nhiệm vụ con bị từ chối';
          message = event.message || `Nhiệm vụ con "${event.title || ''}" đã bị từ chối.`;
          break;
        case 'main_task_deadline_soon':
          title = 'Nhiệm vụ chính sắp đến hạn';
          message = event.message || `Nhiệm vụ chính "${event.title || ''}" sắp đến hạn (${event.daysToDeadline} ngày nữa)!`;
          break;
        case 'main_task_overdue':
          title = 'Nhiệm vụ chính quá hạn';
          message = event.message || `Nhiệm vụ chính "${event.title || ''}" đã quá hạn!`;
          break;
        case 'subtask_deadline_soon':
          title = 'Nhiệm vụ con sắp đến hạn';
          message = event.message || `Nhiệm vụ con "${event.title || ''}" sắp đến hạn (${event.daysToDeadline} ngày nữa)!`;
          break;
        case 'subtask_overdue':
          title = 'Nhiệm vụ con quá hạn';
          message = event.message || `Nhiệm vụ con "${event.title || ''}" đã quá hạn!`;
          break;
        default:
          message = event.message || '';
      }
      if (shouldAdd) {
        setNotifications(prev => [
          {
            id: Date.now() + Math.random(),
            type: event.type,
            title,
            message,
            createdAt: new Date(),
            read: false,
          },
          ...prev
        ]);
      }
    }
  });

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <a className="block text-teal-600" href="#">
          <span className="sr-only">Home</span>
          <img src={Logo} alt="Logo" width={48} height={48} className="h-12" />
        </a>
        <div className="flex flex-1 items-center justify-end md:justify-between">
          <nav aria-label="Global" className="hidden md:block">
            <ul className="flex items-center gap-6 text-sm"></ul>
          </nav>
          <div className="flex items-center gap-4">
            <div className="sm:flex sm:gap-4">
              {user ? (
                <>
                  <span className="block rounded-md px-5 py-2.5 text-lg font-medium text-black select-none ml-2">
                    {mapPositionLabel(user.position)} - {typeof user.department === 'object' && user.department !== null ? user.department.name : user.department}
                  </span>
                  <span
                    className="block rounded-md px-5 py-2.5 text-lg font-medium text-teal-800 cursor-pointer hover:shadow-lg transition"
                    onClick={() => navigate('/me')}
                  >
                    {user.fullName}
                  </span>
                  {/* Notification Bell Icon */}
                  <div className="relative ml-4" ref={bellRef}>
                    <button
                      className="relative focus:outline-none"
                      title="Thông báo"
                      onClick={() => setShowDropdown(v => !v)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7 text-gray-700 hover:text-teal-600 transition">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a6 6 0 00-6 6v5a2.25 2.25 0 002.25 2.25h9.75a2.25 2.25 0 002.25-2.25v-5a6 6 0 00-12 0M12 4a2 2 0 100 4 2 2 0 000-4zM14.857 17.082a2.25 2.25 0 01-4.714 0M21 19.5v-2.25A2.25 2.25 0 0018.75 15a6.75 6.75 0 01-13.5 0A2.25 2.25 0 003 17.25V19.5m18 0H3" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                    {/* Dropdown notification */}
                    {showDropdown && (
                      <div ref={dropdownRef} className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-blue-400 z-50 animate-fade-in-up">
                        {/* Mũi nhọn hướng lên bell */}
                        <div className="absolute -top-3 right-6 w-6 h-6 overflow-hidden">
                          <div className="w-4 h-4 bg-white border-l border-t border-blue-400 rotate-45 mx-auto shadow-md"></div>
                        </div>
                        {/* Header dropdown */}
                        <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-blue-100">
                          <span className="text-lg font-semibold text-blue-900">Các thông báo</span>
                          <div className="flex items-center gap-2">
                            <button onClick={markAllAsRead} title="Đánh dấu đã đọc" className="text-blue-700 hover:text-blue-900 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                            <button title="Cài đặt" className="text-blue-700 hover:text-blue-900 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 2.25c.414 0 .75.336.75.75v1.386a8.25 8.25 0 013.07.892l.98-.98a.75.75 0 111.06 1.06l-.98.98a8.25 8.25 0 01.892 3.07h1.386a.75.75 0 010 1.5h-1.386a8.25 8.25 0 01-.892 3.07l.98.98a.75.75 0 11-1.06 1.06l-.98-.98a8.25 8.25 0 01-3.07.892v1.386a.75.75 0 01-1.5 0v-1.386a8.25 8.25 0 01-3.07-.892l-.98.98a.75.75 0 11-1.06-1.06l.98-.98a8.25 8.25 0 01-.892-3.07H2.25a.75.75 0 010-1.5h1.386a8.25 8.25 0 01.892-3.07l-.98-.98a.75.75 0 111.06-1.06l.98.98a8.25 8.25 0 013.07-.892V3a.75.75 0 01.75-.75z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {/* Danh sách thông báo */}
                        <div className="max-h-96 min-h-[120px] overflow-y-auto px-6 py-4">
                          {notifications.length === 0 ? (
                            <div className="text-center text-gray-500 text-base py-8">Bạn không có thông báo nào</div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                className={`mb-4 p-3 rounded-lg border ${n.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'} shadow-sm transition-all`}
                                onClick={() => {
                                  setNotifications(prev =>
                                    prev.map(item => item.id === n.id ? { ...item, read: true } : item)
                                  );
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="font-medium text-blue-900 mb-1">{n.title}</div>
                                <div className="text-gray-700 text-sm mb-1">{n.message}</div>
                                <div className="text-xs text-gray-400 text-right">{n.createdAt && new Date(n.createdAt).toLocaleString('vi-VN')}</div>
                              </div>
                            ))
                          )}
                        </div>
                        {/* Footer */}
                        <div className="border-t border-blue-100 px-6 py-2 text-center">
                          <button className="text-blue-700 hover:underline text-base font-medium">See all</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  className="block rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
                  onClick={onLoginClick}
                >
                  Đăng nhập
                </button>
              )}
            </div>
            <button
              className="block rounded-sm bg-gray-100 p-2.5 text-gray-600 transition hover:text-gray-600/75 md:hidden"
            >
              <span className="sr-only">Toggle menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;