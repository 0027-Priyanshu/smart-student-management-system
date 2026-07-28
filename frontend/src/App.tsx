import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ToastContainer from './components/layout/ToastContainer';
import { useAuthStore } from './stores/authStore';

// Lazy Loaded Page Components for Maximum Speed & Split Bundles
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const Faculty = lazy(() => import('./pages/Faculty'));
const Courses = lazy(() => import('./pages/Courses'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Marks = lazy(() => import('./pages/Marks'));
const AiAssistant = lazy(() => import('./pages/AiAssistant'));
const Finance = lazy(() => import('./pages/Finance'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-900 text-white select-none">
      <div className="relative flex items-center justify-center mb-4">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-[#f97316]"></div>
        <div className="absolute h-8 w-8 bg-[#f97316]/20 rounded-full animate-ping"></div>
      </div>
      <h3 className="font-title text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444]">
        EduManager AI
      </h3>
      <span className="text-xs text-slate-400 mt-1 font-mono">Initializing Application...</span>
    </div>
  );
}

export default function App() {
  const { checkAuth, isAuthenticated, loading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Router>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Dashboard Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/students" 
            element={
              <ProtectedRoute>
                <Students />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/faculty" 
            element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'Faculty']}>
                <Faculty />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/courses" 
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute>
                <Attendance />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/marks" 
            element={
              <ProtectedRoute>
                <Marks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-assistant" 
            element={
              <ProtectedRoute>
                <AiAssistant />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/finance" 
            element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                <Finance />
              </ProtectedRoute>
            } 
          />

          {/* Index Redirect */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } 
          />

          {/* Catch-All 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
