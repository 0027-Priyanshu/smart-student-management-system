"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
const db_1 = require("./config/db");
const socket_1 = require("./config/socket");
const logger_1 = require("./utils/logger");
const error_middleware_1 = require("./middlewares/error.middleware");
// Route Imports
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const course_routes_1 = __importDefault(require("./routes/course.routes"));
const faculty_routes_1 = __importDefault(require("./routes/faculty.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const result_routes_1 = __importDefault(require("./routes/result.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5001;
// Security Headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false // Allows static file serving without blocking
}));
// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://smart-student-management-system-seven.vercel.app'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
// Request Logging using Morgan integrated with Winston
app.use((0, morgan_1.default)(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
        write: (message) => logger_1.logger.info(message.trim())
    }
}));
// Express limits
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', limiter);
// Serve uploads folder static files
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadDir));
// Connect to Database (MongoDB or fallback to JSON)
(0, db_1.connectDB)();
// Initialize Real-time WebSockets
(0, socket_1.initSocket)(server);
const activity_routes_1 = __importDefault(require("./routes/activity.routes"));
// Ensure other routes remain...
app.use('/api/auth', auth_routes_1.default);
app.use('/api/students', student_routes_1.default);
app.use('/api/courses', course_routes_1.default);
app.use('/api/faculty', faculty_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/results', result_routes_1.default);
app.use('/api/ai', ai_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/activities', activity_routes_1.default);
// Base Route
app.get('/', (req, res) => {
    res.json({ message: 'EduManager Smart Management API is active!' });
});
// Centralized Global Error Handler Middleware
app.use(error_middleware_1.errorHandler);
// Start listener
const HOST = process.env.HOST || '0.0.0.0';
server.listen(Number(PORT), HOST, () => {
    logger_1.logger.info(`📡 Server listening on http://${HOST}:${PORT}`);
});
