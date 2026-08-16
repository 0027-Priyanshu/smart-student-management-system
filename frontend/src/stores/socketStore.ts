import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  time: Date;
}

interface SocketState {
  socket: Socket | null;
  notifications: AppNotification[];
  onlineUsers: any[];
  connectSocket: (user: { userId: string; name: string; role: string }) => void;
  disconnectSocket: () => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

import { getBackendBaseUrl } from '../utils/imageUrl';

const getSocketBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  return getBackendBaseUrl();
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  notifications: [],
  onlineUsers: [],

  connectSocket: (user) => {
    if (get().socket) return; // Already connected

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const socketInstance = io(getSocketBaseUrl(), {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Real-time Socket connected');
      socketInstance.emit('register_user', {
        userId: user.userId,
        name: user.name,
        role: user.role
      });
    });

    socketInstance.on('online_users', (usersList: any[]) => {
      set({ onlineUsers: usersList });
    });

    socketInstance.on('new_registration', (data: any) => {
      const newNotif: AppNotification = {
        id: Date.now().toString(),
        title: 'New Registration Alert',
        message: `${data.name} has just registered as a ${data.role}!`,
        type: 'success',
        read: false,
        time: new Date()
      };
      set((state) => ({ notifications: [newNotif, ...state.notifications] }));
    });

    socketInstance.on('attendance_update', (data: any) => {
      const newNotif: AppNotification = {
        id: Date.now().toString(),
        title: 'Attendance Marked',
        message: `Student status updated to: ${data.status} for today's course.`,
        type: 'info',
        read: false,
        time: new Date()
      };
      set((state) => ({ notifications: [newNotif, ...state.notifications] }));
    });

    socketInstance.on('dashboard_update', (data: any) => {
      const newNotif: AppNotification = {
        id: Date.now().toString(),
        title: 'Dashboard Updated',
        message: `Metrics changed due to administrative action: ${data.action.replace('_', ' ')}`,
        type: 'warning',
        read: false,
        time: new Date()
      };
      set((state) => ({ notifications: [newNotif, ...state.notifications] }));
    });

    set({ socket: socketInstance });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  }
}));
