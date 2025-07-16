import React, { createContext, useContext, useState, useCallback } from 'react';
import NotificationStack from './NotificationStack';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [
      ...prev,
      { id, ...notification }
    ]);
  }, []);

  const handleClose = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationStack notifications={notifications} onClose={handleClose} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
} 