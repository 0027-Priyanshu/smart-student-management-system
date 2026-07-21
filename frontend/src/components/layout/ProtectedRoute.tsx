import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    } else if (!loading && isAuthenticated && user && allowedRoles) {
      if (!allowedRoles.includes(user.role)) {
        navigate('/dashboard'); // Redirect to dashboard if role is unauthorized
      }
    }
  }, [isAuthenticated, user, loading, navigate, allowedRoles]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 text-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8a5cf6] mb-4"></div>
        <span className="text-sm font-semibold tracking-wide">Authenticating Session...</span>
      </div>
    );
  }

  // Guard condition
  if (!isAuthenticated || (user && allowedRoles && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}
