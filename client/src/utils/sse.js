import { EventSourcePolyfill } from 'event-source-polyfill';
import authFetch from './authFetch';

const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL

export async function connectSSE(onMessage, onError) {
  let token = sessionStorage.getItem('accessToken');
  try {
    await authFetch(`${BASE_URL}/api/users/me`);
    token = sessionStorage.getItem('accessToken');
  } catch { /* ignore */ }

  const eventSource = new EventSourcePolyfill(`${BASE_URL}/api/sse`, {
    headers: { Authorization: `Bearer ${token}` },
    withCredentials: true,
  });

  // Lắng nghe các event custom
  const eventTypes = [
    "task_created", "task_updated", "task_deleted",
    "subtask_created", "subtask_updated",
    "indicator_created", "indicator_updated", "indicator_deleted",
    "user_created", "user_updated", "user_deleted"
  ];

  eventTypes.forEach(type => {
    eventSource.addEventListener(type, (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage({ type, ...data });
      } catch (e) {
        console.error('SSE message parse error:', e, event.data);
      }
    });
  });

  // Lắng nghe các event bell
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
  bellEventTypes.forEach(type => {
    eventSource.addEventListener(type, (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE BELL EVENT:', type, data); // Log debug
        onMessage({ type, ...data });
      } catch (e) {
        console.error('SSE bell event parse error:', e, event.data);
      }
    });
  });

  // Lắng nghe event toast
  eventSource.addEventListener('toast', (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ type: 'toast', ...data });
    } catch (e) {
      console.error('SSE toast parse error:', e, event.data);
    }
  });

  // Optionally, vẫn lắng nghe event mặc định
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      // ignore
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
    eventSource.close();
  };

  return eventSource;
} 