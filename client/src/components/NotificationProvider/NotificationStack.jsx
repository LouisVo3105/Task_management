import React from 'react';
import CustomToast from './CustomToast';

export default function NotificationStack({ notifications, onClose }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col items-end space-y-2">
      {notifications.map((n) => (
        <CustomToast key={n.id} {...n} onClose={onClose} />
      ))}
    </div>
  );
} 