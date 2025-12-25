import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { API_BASE } from '@/lib/api';
import { getCookie } from '@/utils/csrf';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setUser = useAuth((s) => s.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' });
    const csrftoken = getCookie('csrftoken');
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken,
      },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: 'Error' }));
      setError(data.detail || 'Error');
      return;
    }
    const data = await res.json();
    setUser(data);
    if (data.role === 'vendedor') {
      navigate('/inventario');
      return;
    }
    navigate('/pos');
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(at_20%_30%,hsl(var(--primary)/0.5),transparent_60%),radial-gradient(at_80%_15%,hsl(var(--accent)/0.5),transparent_60%),radial-gradient(at_60%_85%,hsl(var(--secondary)/0.5),transparent_60%)] blur-3xl opacity-70" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,hsl(var(--primary)/0.4)_1px,transparent_1px),linear-gradient(-45deg,hsl(var(--primary)/0.4)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="flex flex-col items-center space-y-4 p-6">
          <CardTitle className="text-center text-3xl font-bold text-primary mb-2">
            NAVEGANET
          </CardTitle>
          <CardTitle className="text-center text-2xl">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              className="h-12"
              placeholder="Usuario o email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              className="h-12"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12 text-lg">
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
