import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Credenciais simples para ambiente interno
const USERNAME = 'r10';
const PASSWORD = '850327';

export default function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation() as any;
	const from = location.state?.from?.pathname || '/video-slide';

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			if (username.trim() === USERNAME && password === PASSWORD) {
				login(username.trim());
				toast.success('Login realizado');
				navigate(from, { replace: true });
			} else {
				toast.error('Usuário ou senha inválidos');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-[80vh] flex items-center justify-center px-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="space-y-2 text-center">
					<img src="/logor10studiob.png" alt="R10 STUDIO" className="h-10 mx-auto" />
					<CardTitle className="text-base">Acesso restrito</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-4">
						<div>
							<Label htmlFor="username" className="text-xs">Usuário</Label>
							<Input id="username" value={username} onChange={(e)=>setUsername(e.target.value)} autoFocus className="h-9 text-sm" />
						</div>
						<div>
							<Label htmlFor="password" className="text-xs">Senha</Label>
							<Input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="h-9 text-sm" />
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Entrando…' : 'Entrar'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

