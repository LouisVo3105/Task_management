import React from 'react';
import CustomToast from './CustomToast';

export default function NotificationStack({ notifications, onClose }) {
  // Chỉ hiển thị toast đầu tiên (nếu có)
  const toast = notifications[0];
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {toast && (
        <div className="pointer-events-auto">
          <CustomToast {...toast} onClose={onClose} />
        </div>
      )}
    </div>
  );
} 