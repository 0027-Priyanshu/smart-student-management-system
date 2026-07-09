import { Server } from 'socket.io';
import http from 'http';

let io: Server | null = null;
const onlineUsers = new Map<string, { socketId: string; name: string; role: string }>();

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all client connections
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Register active user
    socket.on('register_user', (data: { userId: string; name: string; role: string }) => {
      if (data && data.userId) {
        onlineUsers.set(data.userId, {
          socketId: socket.id,
          name: data.name,
          role: data.role
        });
        console.log(`👤 User registered online: ${data.name} (${data.role})`);
        
        // Broadcast list of online users to everyone
        broadcastOnlineUsers();
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      // Remove from online list
      for (const [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`👤 User offline: ${user.name}`);
          break;
        }
      }
      
      broadcastOnlineUsers();
    });
  });

  return io;
}

function broadcastOnlineUsers() {
  if (!io) return;
  const users = Array.from(onlineUsers.entries()).map(([userId, user]) => ({
    userId,
    name: user.name,
    role: user.role
  }));
  io.emit('online_users', users);
}

export function getIO() {
  return io;
}

// Global real-time triggers
export function emitLiveUpdate(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: any) {
  const user = onlineUsers.get(userId);
  if (io && user) {
    io.to(user.socketId).emit(event, data);
  }
}
