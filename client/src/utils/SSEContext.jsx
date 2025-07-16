import React, { createContext, useContext, useRef, useEffect } from "react";
import { connectSSE } from "./sse";

const SSEContext = createContext();

export function SSEProvider({ children }) {
  const listenersRef = useRef([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    let stopped = false;
    let reconnectTimeout = null;

    const onMessage = (event) => {
      console.log("SSEContext received event:", event);
      listenersRef.current.forEach((cb) => {
        try { cb(event); } catch { }
      });
    };

    const startSSE = async () => {
      const eventSource = await connectSSE(onMessage, () => {
        if (stopped) return;
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
  }, []);

  // Đăng ký callback lắng nghe event SSE
  const subscribe = (cb) => {
    console.log("SSEContext: subscribe callback", cb);
    listenersRef.current.push(cb);
    return () => {
      listenersRef.current = listenersRef.current.filter((fn) => fn !== cb);
    };
  };

  return (
    <SSEContext.Provider value={{ subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSEContext(callback) {
  const { subscribe } = useContext(SSEContext);
  useEffect(() => {
    if (!callback) return;
    const unsubscribe = subscribe(callback);
    return unsubscribe;
  }, [callback, subscribe]);
} 