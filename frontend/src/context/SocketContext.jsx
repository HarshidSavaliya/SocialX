import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setOnlineUsers([]);
      }
      return;
    }

    if (socketRef.current) return; // Already connected

    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('presence:online-users', (userIds) => setOnlineUsers(userIds));
    socket.on('user:online', ({ userId }) =>
      setOnlineUsers(prev => [...new Set([...prev, userId])])
    );
    socket.on('user:offline', ({ userId }) =>
      setOnlineUsers(prev => prev.filter(id => id !== userId))
    );

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('presence:online-users');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [isAuthenticated, token]);

  const value = {
    socket: socketRef.current,
    isConnected,
    onlineUsers
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
