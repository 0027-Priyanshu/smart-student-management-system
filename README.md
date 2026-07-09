# EduManager: Smart Student Management System 🎓

EduManager is a production-ready, internship-level MERN stack application designed for universities and academies to manage student directories, course enrollments, faculty allocations, attendance tracking, and marks/results. It features role-based authorization, high-performance database indexing, centralized schema validation, Winston/Morgan audit logging, dynamic animated notifications, and built-in Google Gemini AI academic insights.

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

### 3. Database Seeding (Admin Registration)
1. Go to the signup page at `http://localhost:5173/register`.
2. Register an account with the role set to **Admin** or **Faculty** (these roles bypass email verification steps automatically for testing simplicity).
3. If registering as a **Student**, a verification email link will print directly to the backend terminal window. Click it to verify the student account!

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
