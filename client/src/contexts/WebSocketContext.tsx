import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@shared/schema';
import { useAuth } from './AuthContext';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface ConnectedUserInfo {
  name: string;
  connectedAt: string;
  photoUrl?: string;
}

interface WebSocketContextType {
  status: WebSocketStatus;
  connectedUsers: number;
  connectedUsersList: ConnectedUserInfo[];
  addMessageListener: (callback: (message: WebSocketMessage) => void) => () => void;
  sendMessage: (message: WebSocketMessage) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [connectedUsersList, setConnectedUsersList] = useState<ConnectedUserInfo[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const messageCallbacksRef = useRef<((message: WebSocketMessage) => void)[]>([]);
  const userNameSentRef = useRef(false);
  const appUserRef = useRef(appUser);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // Keep appUserRef in sync
  useEffect(() => {
    appUserRef.current = appUser;
  }, [appUser]);

  // Register a callback to handle incoming messages
  const addMessageListener = useCallback((callback: (message: WebSocketMessage) => void) => {
    messageCallbacksRef.current.push(callback);
    return () => {
      messageCallbacksRef.current = messageCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  // Send a message to the server
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  // Initialize WebSocket connection with auto-reconnect
  useEffect(() => {
    unmountedRef.current = false;

    const connect = () => {
      if (unmountedRef.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      setStatus('connecting');
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (unmountedRef.current) { socket.close(); return; }
        setStatus('open');
        reconnectAttemptRef.current = 0;
        userNameSentRef.current = false;

        // Send user identity immediately if available
        if (appUserRef.current?.name) {
          socket.send(JSON.stringify({
            type: 'USER_CONNECT',
            payload: { name: appUserRef.current.name, photoUrl: appUserRef.current.photoUrl || null }
          }));
          userNameSentRef.current = true;
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;

          // Handle connected users update
          if (message.type === 'CONNECTED_USERS' && message.payload) {
            const payload = message.payload as { count: number; users?: ConnectedUserInfo[] };
            setConnectedUsers(payload.count || 0);
            if (payload.users && Array.isArray(payload.users)) {
              setConnectedUsersList(payload.users);
            }
          }

          // Dispatch message to all registered callbacks
          messageCallbacksRef.current.forEach(callback => {
            callback(message);
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        if (unmountedRef.current) return;
        setStatus('closed');

        // Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 15s)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 15000);
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        setStatus('error');
        // onclose will fire after onerror, triggering reconnect
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, []);

  // Send user identity when user becomes available or socket opens
  useEffect(() => {
    if (
      appUser?.name &&
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN &&
      !userNameSentRef.current
    ) {
      socketRef.current.send(JSON.stringify({
        type: 'USER_CONNECT',
        payload: { name: appUser.name, photoUrl: appUser.photoUrl || null }
      }));
      userNameSentRef.current = true;
    }
  }, [appUser?.name, status]);

  return (
    <WebSocketContext.Provider value={{
      status,
      connectedUsers,
      connectedUsersList,
      addMessageListener,
      sendMessage
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}
