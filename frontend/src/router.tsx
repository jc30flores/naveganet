import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';
import Login from './pages/Login';
import Reportes from './pages/Reportes';
import Inventario from './pages/Inventario';
import PuntoDeVenta from './pages/PuntoDeVenta';
import Clientes from './pages/Clientes';
import Historial from './pages/Historial';
import Deudores from './pages/Deudores';
import Devoluciones from './pages/Devoluciones';
import Usuarios from './pages/Usuarios';
import NotFound from './pages/NotFound';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import SessionGuard from './components/SessionGuard';

function RouterShell() {
  return (
    <>
      <SessionGuard />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RouterShell />}>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/pos" element={<PuntoDeVenta />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          {/* Rutas ocultas pero disponibles */}
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/deudores" element={<Deudores />} />
          <Route path="/devoluciones" element={<Devoluciones />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

export function AppRouter() {
  return (
    <RouterProvider
      router={router}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    />
  );
}
