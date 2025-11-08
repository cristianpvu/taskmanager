import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IP } from "@/data/ip";
import { useAuth } from "@/context/AuthContext";

const baseURL = `http://${IP}:5555`;

interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  type: string;
  task: {
    _id: string;
    title: string;
  };
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshNotifications: async () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token: authToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !authToken) {
      console.log("⏳ Waiting for user authentication...");
      return;
    }

    let mounted = true;
    
    const initSocket = async () => {
      try {
        console.log("Attempting to connect to Socket.IO...");
        console.log("Server URL:", baseURL);
        console.log("User ID:", user._id);
        console.log("Token exists:", !!authToken);
        
        const token = authToken || await AsyncStorage.getItem("authToken");
        
        if (!token) {
          console.log("No token found, skipping socket connection");
          return;
        }

        console.log("Using token for socket auth");
        console.log("Token preview:", token.substring(0, 20) + "...");

        const socketInstance = io(baseURL, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10,
          timeout: 10000,
        });

        socketInstance.on("connect", () => {
          console.log("Socket.IO connected successfully!");
          console.log("Socket ID:", socketInstance.id);
        });

        socketInstance.on("notification", (notification: Notification) => {
          console.log("New notification received:", notification);
          if (mounted) {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        });

        socketInstance.on("disconnect", (reason) => {
          console.log("Socket.IO disconnected. Reason:", reason);
        });

        socketInstance.on("connect_error", (error) => {
          console.error("Socket connection error:", error.message);
        });

        if (mounted) {
          socketRef.current = socketInstance;
          setSocket(socketInstance);
        }

        await fetchNotifications(token);
      } catch (error) {
        console.error("Socket initialization error:", error);
      }
    };

    initSocket();

    return () => {
      mounted = false;
      if (socketRef.current) {
        console.log("🔌 Disconnecting socket...");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, authToken]);

  const fetchNotifications = async (token?: string) => {
    try {
      const authToken = token || await AsyncStorage.getItem("authToken");
      if (!authToken) return;

      const response = await fetch(`${baseURL}/notifications`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        const unread = data.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${baseURL}/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${baseURL}/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
