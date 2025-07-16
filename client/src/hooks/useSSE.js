import { useEffect, useRef } from 'react';
import { connectSSE } from '../utils/sse';

export default function useSSE(onMessage) {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    let stopped = false;
    let reconnectTimeout = null;

    const startSSE = async () => {
      if (!onMessage) return;
      const eventSource = await connectSSE(onMessage, () => {
        if (stopped) return;
        // Tự reconnect sau 2s
        reconnectTimeout = setTimeout(startSSE, 2000);
      });
      eventSourceRef.current = eventSource;
    };

    startSSE();

    return () => {
      stopped = true;
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [onMessage]);
} 