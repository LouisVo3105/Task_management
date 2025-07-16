import { useAuth } from '../../utils/useAuth';
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../assets/logo.svg';
import { mapPositionLabel } from '../../utils/positionLabel';
import { useSSEContext } from "@utils/SSEContext";
import { useNotification } from '../NotificationProvider';

const Header = ({ onLoginClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const handleSSEMessage = useCallback((data) => {
    if (data.type === 'main_task_deadline_soon') {
      showNotification({
        type: 'info',
        title: 'Sắp đến hạn nhiệm vụ chính',
        message: `Nhiệm vụ chính "${data.title}" sắp đến hạn (${data.daysToDeadline} ngày nữa)!`,
      });
    } else if (data.type === 'subtask_deadline_soon') {
      showNotification({
        type: 'info',
        title: 'Sắp đến hạn subtask',
        message: `Subtask "${data.title}" sắp đến hạn (${data.daysToDeadline} ngày nữa)!`,
      });
    } else if (data.type === 'indicator_deadline_soon') {
      showNotification({
        type: 'info',
        title: 'Sắp đến hạn chỉ tiêu',
        message: `Indicator "${data.name}" sắp đến hạn (${data.daysToDeadline} ngày nữa)!`,
      });
    }
  }, [showNotification]);

  useSSEContext(user ? handleSSEMessage : null);

  return (<header className="bg-white">
    <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-8 px-4 sm:px-6 lg:px-8">
      <a className="block text-teal-600" href="#">
        <span className="sr-only">Home</span>
        <img src={Logo} alt="Logo" className="h-12" />
      </a>

      <div className="flex flex-1 items-center justify-end md:justify-between">
        <nav aria-label="Global" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm">
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <div className="sm:flex sm:gap-4">
            {user ? (
              <>
                <span
                  className="block rounded-md px-5 py-2.5 text-lg font-medium text-black select-none ml-2"
                >
                  {mapPositionLabel(user.position)} - {typeof user.department === 'object' && user.department !== null ? user.department.name : user.department}
                </span>
                <span
                  className="block rounded-md px-5 py-2.5 text-lg font-medium text-teal-800 cursor-pointer hover:shadow-lg transition"
                  onClick={() => navigate('/me')}
                >
                  {user.fullName}
                </span>
                {/* Notification Bell Icon */}
                <button
                  className="relative ml-4 focus:outline-none"
                  title="Thông báo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7 text-gray-700 hover:text-teal-600 transition">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a2.25 2.25 0 01-4.714 0M21 19.5v-2.25A2.25 2.25 0 0018.75 15a6.75 6.75 0 01-13.5 0A2.25 2.25 0 003 17.25V19.5m18 0H3" />
                  </svg>
                </button>
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
  </header>);

}

export default Header;