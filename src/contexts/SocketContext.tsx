import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Extract base URL from VITE_API_URL (remove /api/v1 path if present)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const SOCKET_URL = API_URL.replace(/\/api\/v[0-9]+$/, '');

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (socket) {
        console.log('🔌 Disconnecting socket (user logged out)');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('⚠️ No access token found for socket connection');
      return;
    }

    console.log('🔌 Initializing socket connection to:', SOCKET_URL);
    const connectStartTime = Date.now();

    // Create socket connection with authentication
    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: {
        token,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000, // 10 second connection timeout
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      const connectTime = Date.now() - connectStartTime;
      console.log(`✅ Socket connected in ${connectTime}ms - ID: ${newSocket.id}`);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      const errorTime = Date.now() - connectStartTime;
      console.error(`❌ Socket connection error after ${errorTime}ms:`, {
        message: error.message,
        data: error.data,
        type: error.type,
      });
      setIsConnected(false);
    });

    newSocket.on('pong', () => {
      // Heartbeat response
      console.debug('💓 Socket heartbeat');
    });

    setSocket(newSocket);

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log('🔌 Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  // Emit event helper
  const emit = useCallback((event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn(`⚠️ Cannot emit '${event}': Socket not connected`);
    }
  }, [socket, isConnected]);

  // Subscribe to event helper
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  // Unsubscribe from event helper
  const off = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.off(event, callback);
    }
  }, [socket]);

  const value = {
    socket,
    isConnected,
    emit,
    on,
    off,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

