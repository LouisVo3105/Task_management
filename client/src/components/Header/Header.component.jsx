import { useAuth } from '../../utils/useAuth';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../assets/logo.svg';

const Header = ({ onLoginClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (<header className="bg-white">
    <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-8 px-4 sm:px-6 lg:px-8">
      <a className="block text-teal-600" href="#">
        <span className="sr-only">Home</span>
        <img src={Logo} alt="Logo" className="h-12" />
      </a>

      <div className="flex flex-1 items-center justify-end md:justify-between">
        <nav aria-label="Global" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm">
            <li>
              <a className="text-gray-500 transition hover:text-gray-500/75" href="#"> About </a>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <div className="sm:flex sm:gap-4">
            {user ? (
              <span
                className="block rounded-md px-5 py-2.5 text-lg font-medium text-teal-800 cursor-pointer hover:shadow-lg transition"
                onClick={() => navigate('/me')}
              >
                {user.fullName}
              </span>
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