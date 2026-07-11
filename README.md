# EduManager: Smart Student Management System 🎓

EduManager is a production-ready, internship-level MERN stack application designed for universities and academies to manage student directories, course enrollments, faculty allocations, attendance tracking, and marks/results. It features role-based authorization, high-performance database indexing, centralized schema validation, Winston/Morgan audit logging, dynamic animated notifications, and built-in Google Gemini AI academic insights.

🚀 **Live Deployment Links:**
- **Live Frontend Web App (Vercel):** [smart-student-management-system-seven.vercel.app](https://smart-student-management-system-seven.vercel.app)
- **Live Backend API Server (Render):** [https://smart-student-management-system-34eo.onrender.com](https://smart-student-management-system-34eo.onrender.com)
- **Developer Guidelines:** [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client[Vite React Client] <-->|HTTP/REST| API[Express API Server]
    Client <-->|WebSockets| WS[Socket.io Real-time Server]
    API <-->|Mongoose| MongoDB[(MongoDB Cluster)]
    API <-->|Local Fallback| JSONDB[(Local JSON DB /data/db.json)]
    API <-->|Winston / Morgan| Logs[(Winston Logger File Tracing)]
    API <-->|NodeMailer / Fallback| Mail[SMTP Service]
    API <-->|Google GenAI SDK| Gemini[Gemini-2.5-Flash AI Model]
```

### Key Technical Pillars:
1. **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand + Framer Motion.
2. **Backend**: Node.js + Express + TypeScript + MongoDB/Mongoose (with local JSON fallback).
3. **AI Services**: Google Gemini integration for dynamic student performance profiling and academic insights.
4. **Security & Validation**: Zod request schema validation, Helmet security headers, Express Rate Limiter, and role-based route guards.

---

## 🚀 Professional Enhancements (Internship-Level)

### 1. Security & Guards
* **CORS Origin Filtering**: Dynamic allowed origins matching from environmental configuration instead of wildcard `*` headers.
* **Role-Based Guards**: Middleware restrictions enforcing access levels (`Super Admin`, `Admin`, `Faculty`, `Student`).
* **Request Validation**: Intercepts and parses every request body, parameter, and query using **Zod schemas** before it reaches the controllers.
* **JWT Expiry & Rotation**: Secure JWT access token checks coupled with dynamic refresh token exchange.

### 2. Backend Architecture
* **Centralized Error Handler**: Dynamic error capture logging to Winston which formats output responses consistently.
* **Controller-Service Split**: Complete separation of business rules, repository operations (`repo.service.ts`), and HTTP routes.
* **Winston & Morgan Trace Logging**: HTTP requests and exceptions are structured as JSON files in `logs/` for administrative audit trails.
* **Database Indexing & Soft Deletes**: High-frequency search attributes (`email`, `enrollmentNo`, `code`, `isDeleted`) are indexed in MongoDB. Faculty and Courses use a safe soft-delete recovery system.

### 3. Frontend Polish
* **Dynamic Toasts**: Framer Motion animated slide-in alerts replacing generic browser dialogue boxes.
* **Skeleton Loaders**: Custom pulse skeleton blocks matching exact table grid layouts while data fetches in the background.
* **Search & Filters**: Multi-criteria searching and dropdown role filtering for administrative audit logs and student indexes.
* **Responsive Dashboard**: Live metrics counting cards, responsive grids, and clean error pages for 404 and 500 status codes.

### 4. Core Functional Value (Portfolio Highlights)
* **Bulk Excel Importer & Validator**: On the Student page, administrators can bulk upload Excel files (`.xlsx`, `.xls`). The backend parses columns asynchronously, checks email uniqueness, hashes default passwords, creates database cards, and sends registration emails without locking the thread.
* **Google Gemini Performance Companion**: Connects to `gemini-2.5-flash` with a fallback simulation. Features a local **PII Masking Filter** in `ai.service.ts` that strips student names before sending them to the AI provider, restoring them locally in-memory before rendering.
* **Real-time Status Notifications Hub**: Integrates `Socket.io` online-user tracking, event triggers for course assignments, and a real-time bell drawer to notify users of modifications.
* **Automated CI/CD Quality Control**: Outfitted with a GitHub Actions workflow (`.github/workflows/ci.yml`) compiling frontend and backend assets and running unit tests automatically on push.

---

## 🛠️ Environmental Settings (.env)

### Backend (`backend/.env`)
Create a `.env` file inside the `backend` folder:
```env
PORT=5001
MONGO_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/edumanager
JWT_SECRET=your_jwt_access_secret_key_string
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_string
GEMINI_API_KEY=your_google_gemini_api_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# OPTIONAL: Simulated Email Box Fallback if omitted
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_username
SMTP_PASS=your_password
```

### Frontend (`frontend/.env.development`)
Create a `.env.development` file inside the `frontend` folder:
```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

---

## 🏁 Quick Start & Installation

### Prerequisites
* Node.js (v18 or higher)
* MongoDB (Optional - fallback database automatically initializes locally inside `data/db.json` if connection fails)

### 1. Setup Backend
```bash
cd backend
npm install
# Start local development server (with hot reload)
npm run dev
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install
# Start local Vite development server
npm run dev
```

### 3. Database Seeding & Demo Credentials
The local database automatically seeds a complete set of user cards on the first boot. You can log in instantly with these roles:

| Role | Email Address | Password | Privileges |
|---|---|---|---|
| **Admin** | `admin@sms.com` | `admin123` | Full CRUD, Course Allocation, Bulk Excel Import |
| **Faculty** | `faculty@sms.com` | `faculty123` | Read student profiles, update gradesheet, log attendance |
| **Student** | `student@sms.com` | `student123` | View attendance heatmap, view transcript, chat with Gemini AI |

To register new student accounts:
1. Go to `http://localhost:5173/register` and select **Student**.
2. A verification email token link will print directly to the backend server terminal window.
3. Click the link to auto-verify the account and log in. Admin/Faculty accounts bypass verification automatically.

---

## 📄 Build & Production Delivery
To check compilation safety or build bundle assets:
```bash
# Compile Backend TypeScript to ESModules
cd backend
npm run build

# Compile and Bundle Frontend Assets
cd ../frontend
npm run build
```
Build outputs are gitignored (`dist/` directories) to keep the repository sanitized for professional review.

---

## 🔌 API Endpoint Summary

Below is a summary of the backend REST API endpoints. All protected routes require a `Bearer <JWT_ACCESS_TOKEN>` authorization header.

| HTTP Method | Endpoint | Access Level | Description |
|---|---|---|---|
| **POST** | `/api/auth/register` | Public | Registers a new user (Auto-verifies Admin/Faculty profiles) |
| **POST** | `/api/auth/login` | Public | Authenticates credentials and returns access + refresh tokens |
| **POST** | `/api/auth/refresh` | Public | Exchanges a refresh token for new access + refresh tokens |
| **POST** | `/api/auth/verify-email` | Public | Verifies email token for Student accounts |
| **POST** | `/api/auth/forgot-password` | Public | Generates password reset token and sends simulated link |
| **POST** | `/api/auth/reset-password` | Public | Resets user password using valid token |
| **GET** | `/api/auth/me` | Authenticated | Retrieves current user session object and profile metadata |
| **GET** | `/api/students` | Authenticated | Retrieves paginated students matching search and filters |
| **GET** | `/api/students/:id` | Authenticated | Fetches complete student profile details |
| **POST** | `/api/students` | Admin / Faculty | Enrolls a new student user and profile card |
| **PUT** | `/api/students/:id` | Admin / Faculty | Updates demographic or academic details of a student |
| **DELETE** | `/api/students/:id` | Admin | Soft-deletes a student profile and deactivates login |
| **POST** | `/api/students/:id/restore` | Admin | Restores a soft-deleted student profile card |
| **POST** | `/api/students/import` | Admin | Bulk imports student directory cards from Excel worksheet |
| **GET** | `/api/faculty` | Admin / Faculty | Retrieves all active faculty profiles |
| **POST** | `/api/faculty` | Admin | Creates a new faculty user profile |
| **DELETE** | `/api/faculty/:id` | Admin | Soft-deletes a faculty profile and deactivates login |
| **GET** | `/api/courses` | Authenticated | Lists all available courses |
| **POST** | `/api/courses` | Admin | Registers a new academic course code |
| **DELETE** | `/api/courses/:id` | Admin | Soft-deletes a course record |
| **POST** | `/api/courses/assign` | Admin | Enrolls a student into a course registry |
| **GET** | `/api/attendance` | Authenticated | Fetches logs of course attendance |
| **POST** | `/api/attendance` | Admin / Faculty | Marks attendance details for a student |
| **POST** | `/api/attendance/scan-qr` | Student | Self-marks student present using scanned course QR payload |
| **GET** | `/api/results/:studentId` | Authenticated | Fetches marks, GPA, and transcripts of a student |
| **POST** | `/api/results` | Faculty | Creates or updates grade cards |
| **GET** | `/api/logs` | Admin | Fetches system logs and Morgan HTTP audit history |
| **POST** | `/api/ai/ask` | Authenticated | Queries Gemini performance profiling (PII masked) |
| **POST** | `/api/ai/chat` | Authenticated | Initiates a multi-turn chat stream with Gemini companion |

---

## ⚠️ Known System Limitations

1. **In-Memory Password Resets**:
   - Password reset tokens are stored inside an in-memory `Map`. Restarting the backend server will invalidate pending password reset URLs.
2. **Local Fallback Data Latency**:
   - When MongoDB is unavailable, the backend reads and writes to a local `data/db.json` file. This format is not optimized for high-concurrency production deployments and may suffer write blocks under extreme load.
3. **SMTP Email Timeout**:
   - Default SMTP notification actions run via asynchronous `Promise.catch` handlers to prevent API response blocking. SMTP network dropouts will trigger warning alerts in console output logs but won't impede user interaction flows.

