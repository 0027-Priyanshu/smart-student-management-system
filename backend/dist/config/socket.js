"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.emitToUser = emitToUser;
exports.emitToRole = emitToRole;
exports.emitToCourse = emitToCourse;
exports.emitToFaculty = emitToFaculty;
exports.emitToStudent = emitToStudent;
exports.emitLiveUpdate = emitLiveUpdate;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const repo_service_1 = require("../services/repo.service");
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
let io = null;
const onlineUsers = new Map();
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // Allow all client origins
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
    });
    // P2-21: Authenticate Socket.IO connections using JWT
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                socket.handshake.query?.token;
            if (!token) {
                // Allow unauthenticated connection in guest room if needed, or reject
                return next();
            }
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            if (decoded && decoded.userId) {
                socket.user = {
                    userId: decoded.userId,
                    name: decoded.name || 'User',
                    role: decoded.role || 'Student',
                    email: decoded.email || ''
                };
            }
            next();
        }
        catch (err) {
            console.warn('⚠️ Socket JWT verification failed:', err.message);
            // Proceed without authenticated user object
            next();
        }
    });
    io.on('connection', async (socket) => {
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
                    const studentProfile = await repo_service_1.RepoService.findStudentByUserId(user.userId);
                    if (studentProfile) {
                        const sId = (studentProfile._id || studentProfile.id).toString();
                        socket.join(`student:${sId}`);
                        // Join enrolled courses
                        const courses = studentProfile.enrolledCourses || [];
                        courses.forEach((c) => {
                            const cId = (c._id || c.id || c).toString();
                            socket.join(`course:${cId}`);
                        });
                    }
                }
                else if (user.role === 'Faculty') {
                    const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(user.userId);
                    if (facultyProfile) {
                        const fId = (facultyProfile._id || facultyProfile.id).toString();
                        socket.join(`faculty:${fId}`);
                        // Join assigned courses
                        const courses = facultyProfile.assignedCourses || [];
                        courses.forEach((c) => {
                            const cId = (c._id || c.id || c).toString();
                            socket.join(`course:${cId}`);
                        });
                    }
                }
            }
            catch (e) {
                console.error('Error joining entity rooms for socket:', e);
            }
            // Track online state
            const existing = onlineUsers.get(user.userId);
            if (existing) {
                existing.socketIds.add(socket.id);
            }
            else {
                onlineUsers.set(user.userId, {
                    socketIds: new Set([socket.id]),
                    name: user.name,
                    role: user.role
                });
            }
            broadcastOnlineUsers();
        }
        // Explicit registration fallback for backwards compatibility
        socket.on('register_user', async (data) => {
            if (data?.userId && !user) {
                socket.join(`user:${data.userId}`);
                if (data.role)
                    socket.join(`role:${data.role.toLowerCase()}`);
                const existing = onlineUsers.get(data.userId);
                if (existing) {
                    existing.socketIds.add(socket.id);
                }
                else {
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
    if (!io)
        return;
    const users = Array.from(onlineUsers.entries()).map(([userId, record]) => ({
        userId,
        name: record.name,
        role: record.role
    }));
    io.emit('online_users', users);
}
function getIO() {
    return io;
}
// Scoped Room Emission Helpers (P2-22)
function emitToUser(userId, event, data) {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
}
function emitToRole(role, event, data) {
    if (io) {
        io.to(`role:${role.toLowerCase()}`).emit(event, data);
    }
}
function emitToCourse(courseId, event, data) {
    if (io) {
        io.to(`course:${courseId}`).emit(event, data);
    }
}
function emitToFaculty(facultyId, event, data) {
    if (io) {
        io.to(`faculty:${facultyId}`).emit(event, data);
    }
}
function emitToStudent(studentId, event, data) {
    if (io) {
        io.to(`student:${studentId}`).emit(event, data);
    }
}
function emitLiveUpdate(event, data) {
    if (io) {
        io.emit(event, data);
    }
}
