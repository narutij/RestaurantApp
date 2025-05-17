import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@shared/schema';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

export function useWebSocket() {
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const socketRef = useRef<WebSocket | null>(null);
  const messageCallbacksRef = useRef<((message: WebSocketMessage) => void)[]>([]);

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

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('open');
      console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        // Handle connected users update
        if (message.type === 'CONNECTED_USERS' && message.payload && typeof message.payload === 'object') {
          const { count } = message.payload as { count: number };
          setConnectedUsers(count);
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
      setStatus('closed');
      console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
      setStatus('error');
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, []);

  return {
    status,
    connectedUsers,
    addMessageListener,
    sendMessage
  };
}
