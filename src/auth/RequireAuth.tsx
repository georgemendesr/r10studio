import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function RequireAuth({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const location = useLocation();
	if (!user) {
		return <Navigate to="/" state={{ from: location }} replace />;
	}
	return <>{children}</>;
}
