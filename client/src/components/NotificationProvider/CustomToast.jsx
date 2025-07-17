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
    <div className={`w-full max-w-md shadow-2xl rounded-xl border-l-4 p-6 mb-4 animate-fade-in-up ${typeStyles[type]} flex flex-col items-center`} role="alert">
      {title && <div className="font-semibold mb-2 text-lg text-center">{title}</div>}
      <div className="text-base text-center mb-4">{message}</div>
      <button
        onClick={() => onClose(id)}
        className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition text-base"
      >
        OK
      </button>
    </div>
  );
} 