import { useAuth } from '@/store/auth';

interface RoleGateProps {
  allowed: string[];
  children: React.ReactNode;
}

export function RoleGate({ allowed, children }: RoleGateProps) {
  const role = useAuth((s) => s.user?.role);
  if (role && allowed.includes(role)) {
    return <>{children}</>;
  }
  return (
    <div className="p-4 text-center text-muted-foreground" role="alert">
      Acceso denegado
    </div>
  );
}
