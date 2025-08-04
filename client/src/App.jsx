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
    console.log('SSE EVENT:', event);
    if (["success", "error", "info", "warning"].includes(event.type) ||
        (event.type === 'toast' && ["success", "error", "info", "warning"].includes(event.toastType))) {
      showNotification({
        type: event.type === 'toast' ? event.toastType || event.level || 'info' : event.type,
        title: event.title || (event.toastType === 'success' ? 'Thành công' : event.toastType === 'error' ? 'Lỗi' : 'Thông báo'),
        message: event.message,
      });
    }
  });
  useEffect(() => {
    console.log('Auth state:', auth);
    auth.init();
  }, []);

  if (auth.loading === undefined || auth.loading) {
    return <div className="w-full h-screen flex items-center justify-center text-xl">Đang tải...</div>;
  }

  if (!auth.accessToken) {
    return (
      <DefaultLayout>
        <DefaultPage />
      </DefaultLayout>
    );
  }

  return (
    <Routes>
      {routes.map((route, index) => {
        const Page = route.page;
        const Layout = route.layout;
        return (
          <Route
            key={index}
            path={route.path}
            element={<Layout><Page /></Layout>}
          />
        );
      })}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [showLogin, setShowLogin] = useState(false);

  const handleLoginSuccess = async () => {
    // Do nothing here, modal will close automatically when user is ready
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <InnerApp showLogin={showLogin} setShowLogin={setShowLogin} handleLoginSuccess={handleLoginSuccess} />
      </AuthProvider>
    </BrowserRouter>
  );
}

function InnerApp({ showLogin, setShowLogin, handleLoginSuccess }) {
  const auth = useAuth();
  // Only close modal when user is ready
  useEffect(() => {
    if (showLogin && !auth.loading && auth.user) {
      setShowLogin(false);
    }
  }, [showLogin, auth.loading, auth.user]);

  return (
    <>
      <Header onLoginClick={() => setShowLogin(true)} />
      <AppContent />
      {showLogin && (
        <div className="fixed inset-0 flex justify-center items-center z-50 pointer-events-auto">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      )}
    </>
  );
}

export default App;