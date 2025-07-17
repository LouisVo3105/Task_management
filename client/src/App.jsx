import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Fragment, useEffect, useState } from 'react';
import routes from './routes';
import './App.css';
import { useAuth } from './utils/useAuth';
import { AuthProvider } from './utils/AuthContext';
import DefaultLayout from './layouts/DefaultLayout';
import LoginForm from './components/LoginForm/LoginFrom';
import DefaultPage from './pages/DefaultPage/DefaultPage';
import Header from './components/Header/Header.component';
import { useSSEContext } from './utils/SSEContext';
import { useNotification } from './components/NotificationProvider/index.jsx';

function AppContent() {
  const auth = useAuth();
  const { showNotification } = useNotification();
  useSSEContext((event) => {
    console.log('SSE EVENT:', event); // Log event SSE nhận được
    // Lắng nghe các sự kiện thành công/thất bại/info/warning từ SSE
    if (
      ["success", "error", "info", "warning"].includes(event.type) ||
      (event.type === 'toast' && ["success", "error", "info", "warning"].includes(event.toastType))
    ) {
      showNotification({
        type: event.type === 'toast' ? event.toastType || event.level || 'info' : event.type,
        title: event.title || (event.toastType === 'success' ? 'Thành công' : event.toastType === 'error' ? 'Lỗi' : 'Thông báo'),
        message: event.message,
      });
    }
  });
  useEffect(() => {
    auth.init();
  }, []);

  // Nếu chưa đăng nhập, chỉ render DefaultLayout và login form
  if (!auth.accessToken) {
    return (
      <DefaultLayout>
        <DefaultPage />
      </DefaultLayout>
    );
  }

  // Nếu đã đăng nhập, render các routes được bảo vệ
  return (
    <Routes>
      {routes.map((route, index) => {
        const Page = route.page;
        const Layout = route.layout;
        return (
          <Route
            key={index}
            path={route.path}
            element={
              <Layout>
                <Page />
              </Layout>
            }
          />
        );
      })}
      {/* Redirect về trang chủ nếu không khớp route nào */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const handleLoginSuccess = async () => {
    setShowLogin(false);
  };
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header onLoginClick={() => setShowLogin(true)} />
        <AppContent />
        {showLogin && (
          <div className="fixed inset-0 flex justify-center items-center z-50 pointer-events-auto">
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </div>
        )}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
