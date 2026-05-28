import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Redirects to /login if not authenticated.
// `roles`   — hard role gate (can't be overridden by owner config)
// `viewKey` — owner-configurable visibility gate
export default function ProtectedRoute({ children, roles, viewKey }) {
  const { user, loading, canSeeView } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (viewKey && user.role !== 'dueno' && !canSeeView(viewKey)) return <Navigate to="/" replace />;

  return children;
}
