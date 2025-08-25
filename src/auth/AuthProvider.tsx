import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type User = { id: string; name: string } | null;

type AuthContextType = {
	user: User;
	login: (name: string) => void;
	logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User>(null);

	// Restaurar sessão do localStorage
	useEffect(() => {
		try {
			const raw = localStorage.getItem('r10-auth');
			if (raw) {
				const parsed = JSON.parse(raw) as { name?: string };
				if (parsed?.name) setUser({ id: 'local', name: parsed.name });
			}
		} catch {}
	}, []);

	const value = useMemo<AuthContextType>(() => ({
		user,
		login: (name: string) => {
			setUser({ id: 'local', name });
			try { localStorage.setItem('r10-auth', JSON.stringify({ name })); } catch {}
		},
		logout: () => {
			setUser(null);
			try { localStorage.removeItem('r10-auth'); } catch {}
		},
	}), [user]);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}

export default AuthProvider;
