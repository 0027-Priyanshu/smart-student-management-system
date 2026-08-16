import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { RepoService } from '../services/repo.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

let io: Server | null = null;
const onlineUsers = new Map<string, { socketIds: Set<string>; name: string; role: string }>();

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    name: string;
    role: string;
    email: string;
  };
}

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all client origins
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  // P2-21: Authenticate Socket.IO connections using JWT
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                    (socket.handshake.query?.token as string);

      if (!token) {
        // Allow unauthenticated connection in guest room if needed, or reject
        return next();
      }

      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.userId) {
        socket.user = {
          userId: decoded.userId,
          name: decoded.name || 'User',
          role: decoded.role || 'Student',
          email: decoded.email || ''
        };
      }
      next();
    } catch (err) {
      console.warn('⚠️ Socket JWT verification failed:', (err as any).message);
      // Proceed without authenticated user object
      next();
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user;
    console.log(`🔌 Client connected: ${socket.id} (User: ${user ? `${user.name} [${user.role}]` : 'Guest'})`);

    if (user) {
      // 1. Join user-specific room
      socket.join(`user:${user.userId}`);
      
      // 2. Join role-specific room
      socket.join(`role:${user.role.toLowerCase()}`);

      // 3. Join entity-specific rooms
      try {
        if (user.role === 'Student') {
          const studentProfile = await RepoService.findStudentByUserId(user.userId);
          if (studentProfile) {
            const sId = (studentProfile._id || studentProfile.id).toString();
            socket.join(`student:${sId}`);
            
            // Join enrolled courses
            const courses = studentProfile.enrolledCourses || [];
            courses.forEach((c: any) => {
              const cId = (c._id || c.id || c).toString();
              socket.join(`course:${cId}`);
            });
          }
        } else if (user.role === 'Faculty') {
          const facultyProfile = await RepoService.findFacultyByUserId(user.userId);
          if (facultyProfile) {
            const fId = (facultyProfile._id || facultyProfile.id).toString();
            socket.join(`faculty:${fId}`);
            
            // Join assigned courses
            const courses = facultyProfile.assignedCourses || [];
            courses.forEach((c: any) => {
              const cId = (c._id || c.id || c).toString();
              socket.join(`course:${cId}`);
            });
          }
        }
      } catch (e) {
        console.error('Error joining entity rooms for socket:', e);
      }

      // Track online state
      const existing = onlineUsers.get(user.userId);
      if (existing) {
        existing.socketIds.add(socket.id);
      } else {
        onlineUsers.set(user.userId, {
          socketIds: new Set([socket.id]),
          name: user.name,
          role: user.role
        });
      }
      broadcastOnlineUsers();
    }

    // Explicit registration fallback for backwards compatibility
    socket.on('register_user', async (data: { userId: string; name?: string; role?: string }) => {
      if (data?.userId && !user) {
        socket.join(`user:${data.userId}`);
        if (data.role) socket.join(`role:${data.role.toLowerCase()}`);
        
        const existing = onlineUsers.get(data.userId);
        if (existing) {
          existing.socketIds.add(socket.id);
        } else {
          onlineUsers.set(data.userId, {
            socketIds: new Set([socket.id]),
            name: data.name || 'User',
            role: data.role || 'Student'
          });
        }
        broadcastOnlineUsers();
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      for (const [userId, record] of onlineUsers.entries()) {
        if (record.socketIds.has(socket.id)) {
          record.socketIds.delete(socket.id);
          if (record.socketIds.size === 0) {
            onlineUsers.delete(userId);
            console.log(`👤 User offline: ${record.name}`);
          }
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
  const users = Array.from(onlineUsers.entries()).map(([userId, record]) => ({
    userId,
    name: record.name,
    role: record.role
  }));
  io.emit('online_users', users);
}

export function getIO() {
  return io;
}

// Scoped Room Emission Helpers (P2-22)
export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: any) {
  if (io) {
    io.to(`role:${role.toLowerCase()}`).emit(event, data);
  }
}

export function emitToCourse(courseId: string, event: string, data: any) {
  if (io) {
    io.to(`course:${courseId}`).emit(event, data);
  }
}

export function emitToFaculty(facultyId: string, event: string, data: any) {
  if (io) {
    io.to(`faculty:${facultyId}`).emit(event, data);
  }
}

export function emitToStudent(studentId: string, event: string, data: any) {
  if (io) {
    io.to(`student:${studentId}`).emit(event, data);
  }
}

export function emitLiveUpdate(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
