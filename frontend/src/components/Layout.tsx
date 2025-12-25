import { useMemo } from 'react';
import { NavLink, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { getCookie } from '@/utils/csrf';
import { API_BASE } from '@/lib/api';
import {
  Package,
  ShoppingCart,
  Users,
  UserCog,
  LogOut
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const navigation = [
  { name: 'Facturador', to: '/pos', icon: ShoppingCart },
  { name: 'Catálogo', to: '/inventario', icon: Package },
  { name: 'Clientes', to: '/clientes', icon: Users },
  { name: 'Usuarios', to: '/usuarios', icon: UserCog },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const clear = useAuth((s) => s.clear);
  const role = useAuth((s) => s.user?.role);

  const allowedNavigation = useMemo(() => {
    // Solo administradores pueden ver el módulo de Usuarios
    if (role === 'admin') {
      return navigation;
    }
    return navigation.filter((item) => item.to !== '/usuarios');
  }, [role]);

  const handleLogout = async () => {
    const csrftoken = getCookie('csrftoken');
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': csrftoken },
    }).catch(() => {});
    clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 md:h-18 items-center justify-between px-1 md:px-6">
          {/* Brand */}
          <div className="hidden md:block text-lg md:text-xl font-semibold text-primary min-w-0 flex-shrink-0">
            NAVEGANET
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-x-auto mx-1 md:mx-4">
            <nav className="flex items-center justify-center gap-0.5 md:gap-1 min-w-max px-1 md:px-2">
              {allowedNavigation.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    className={cn(
                      "flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 rounded-md px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base font-medium transition-colors whitespace-nowrap min-w-0",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0" />
                    <span className="hidden sm:inline md:inline text-center">{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Logout & Theme Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="icon"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}