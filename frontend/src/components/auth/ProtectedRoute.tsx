import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';

export function ProtectedRoute() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const path = location.pathname;
  
  // Solo administradores pueden acceder a la gestión de usuarios
  if (path === '/usuarios' || path.startsWith('/usuarios/')) {
    if (user.role !== 'admin') {
      return <Navigate to="/inventario" replace />;
    }
  }
  
  // Restringir acceso a vendedores solo para ciertas rutas administrativas
  if (user.role === 'vendedor') {
    const restrictedPaths = ['/usuarios'];
    const isRestricted = restrictedPaths.some((restricted) =>
      path === restricted || path.startsWith(`${restricted}/`),
    );
    if (isRestricted) {
      // Los vendedores no pueden acceder a la gestión de usuarios
      return <Navigate to="/inventario" replace />;
    }
  }
  
  // Admin tiene acceso completo a todas las rutas
  // Gerente y vendedores pueden acceder a: /pos, /inventario, /clientes, /historial, /deudores, /devoluciones, /reportes
  return <Outlet />;
}
