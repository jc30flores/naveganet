import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import ModalUsuarioForm from '@/components/ModalUsuarioForm';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

interface Usuario {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'gerente' | 'vendedor';
  is_active: boolean;
}

export default function Usuarios() {
  const user = useAuth((s) => s.user);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);

  // Solo administradores pueden acceder a esta página
  if (user?.role !== 'admin') {
    return <Navigate to="/inventario" replace />;
  }

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await api.getUsuarios() as Usuario[];
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const roleLabels = {
    admin: 'Administrador',
    gerente: 'Gerente',
    vendedor: 'Vendedor',
  };

  const roleColors = {
    admin: 'destructive',
    gerente: 'default',
    vendedor: 'secondary',
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground">Usuarios</h1>
        <Button onClick={() => {
          setUsuarioEditando(null);
          setShowModal(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.username}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleColors[usuario.role]}>
                          {roleLabels[usuario.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.is_active ? 'default' : 'secondary'}>
                          {usuario.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setUsuarioEditando(usuario);
                            setShowModal(true);
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalUsuarioForm
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setUsuarioEditando(null);
        }}
        onSuccess={() => {
          cargarUsuarios();
        }}
        usuario={usuarioEditando}
      />
    </div>
  );
}

