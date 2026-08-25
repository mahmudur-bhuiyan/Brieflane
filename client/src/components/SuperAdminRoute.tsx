import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin } from '../lib/roles';

export function SuperAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
