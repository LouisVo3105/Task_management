import React, { useEffect } from 'react';

const typeStyles = {
  info: 'bg-blue-100 border-blue-400 text-blue-800',
  success: 'bg-green-100 border-green-400 text-green-800',
  error: 'bg-red-100 border-red-400 text-red-800',
  warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
};

export default function CustomToast({ id, title, message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration === 0) return;
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  return (
    <div className={`w-full max-w-xs shadow-lg rounded-lg border-l-4 p-4 mb-4 animate-fade-in-up ${typeStyles[type]}`}
      role="alert">
      <div className="flex justify-between items-start">
        <div>
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div className="text-sm">{message}</div>
        </div>
        <button onClick={() => onClose(id)} className="ml-4 text-lg font-bold text-gray-400 hover:text-gray-700">&times;</button>
      </div>
    </div>
  );
} 