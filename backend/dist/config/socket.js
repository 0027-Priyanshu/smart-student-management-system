"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.emitLiveUpdate = emitLiveUpdate;
exports.emitToUser = emitToUser;
const socket_io_1 = require("socket.io");
let io = null;
const onlineUsers = new Map();
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // Allow all client connections
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        // Register active user
        socket.on('register_user', (data) => {
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
    if (!io)
        return;
    const users = Array.from(onlineUsers.entries()).map(([userId, user]) => ({
        userId,
        name: user.name,
        role: user.role
    }));
    io.emit('online_users', users);
}
function getIO() {
    return io;
}
// Global real-time triggers
function emitLiveUpdate(event, data) {
    if (io) {
        io.emit(event, data);
    }
}
function emitToUser(userId, event, data) {
    const user = onlineUsers.get(userId);
    if (io && user) {
        io.to(user.socketId).emit(event, data);
    }
}
