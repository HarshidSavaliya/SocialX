import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

export const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${host}:5000`;
};

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    // Connect to dynamic host URL
    const targetUrl = getSocketUrl();
    const newSocket = io(targetUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (err) => {
      console.warn('[Socket] Connection notice:', err.message);
      setIsConnected(false);
    };

    const handleOnlineUsers = (userIds) => {
      setOnlineUsers(userIds || []);
    };

    const handleUserOnline = ({ userId }) => {
      if (!userId) return;
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    };

    const handleUserOffline = ({ userId }) => {
      if (!userId) return;
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('presence:online-users', handleOnlineUsers);
    newSocket.on('user:online', handleUserOnline);
    newSocket.on('user:offline', handleUserOffline);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.off('presence:online-users', handleOnlineUsers);
      newSocket.off('user:online', handleUserOnline);
      newSocket.off('user:offline', handleUserOffline);
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [isAuthenticated, token]);

  const value = {
    socket,
    isConnected,
    onlineUsers
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  return context || { socket: null, isConnected: false, onlineUsers: [] };
}
