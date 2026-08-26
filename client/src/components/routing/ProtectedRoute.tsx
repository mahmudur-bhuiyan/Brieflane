import { Navigate, Outlet } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-app px-4 text-muted">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-lg shadow-emerald-900/40">
          B
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 spinner-track" />
        <p className="text-sm">Loading {APP_NAME}…</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
