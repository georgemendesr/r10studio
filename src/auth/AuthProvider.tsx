import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

type User = { id: string; name: string } | null;

type AuthContextType = {
	user: User;
	login: (name: string) => void;
	logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User>(null);
	const value = useMemo<AuthContextType>(() => ({
		user,
		login: (name: string) => setUser({ id: 'local', name }),
		logout: () => setUser(null),
	}), [user]);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}

export default AuthProvider;
