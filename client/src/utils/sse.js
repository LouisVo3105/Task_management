import { EventSourcePolyfill } from 'event-source-polyfill';
import authFetch from './authFetch';

export async function connectSSE(onMessage, onError) {
  let token = sessionStorage.getItem('accessToken');
  try {
    await authFetch('http://localhost:3056/api/users/me');
    token = sessionStorage.getItem('accessToken');
  } catch { /* ignore */ }

  const eventSource = new EventSourcePolyfill('http://localhost:3056/api/sse', {
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