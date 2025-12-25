import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Download
} from 'lucide-react';
import ModalClientForm from '@/components/ModalClientForm';
import ClienteModal from '@/components/modals/ClienteModal';
import ExportClientesModal from '@/components/clientes/ExportClientesModal';
import { Cliente } from '@/types/db';
import { toast } from '@/components/ui/use-toast';
import Pagination from '@/components/ui/Pagination';

const norm = (v: unknown) => (v ?? '').toString().toLowerCase();
const displayName = (c: Cliente) =>
  c.tipo_cliente === 'juridica'
    ? (c.razon_social || c.nombre || '')
    : (c.nombre || c.razon_social || '');

export default function Clientes() {
  const [search, setSearch] = useState<string>('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const loadClientes = async () => {
    try {
      setClientes(await api.getClientes());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const handleEdit = (c: Cliente) => {
    setEditingClient(c);
    setFormOpen(false);
  };

  const handleDelete = async (c: Cliente) => {
    if (!confirm('¿Eliminar definitivamente?')) return;
    setDeletingId(c.id);
    const prev = [...clientes];
    setClientes(prev.filter(cl => cl.id !== c.id));
    try {
      await api.deleteCliente(c.id);
      toast({ title: 'Eliminado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setClientes(prev);
    } finally {
      setDeletingId(null);
    }
  };

  const q = norm(search);
  const rows = (clientes ?? [])
    .filter((c: Cliente) => {
      if (!q) return true;
      return [
        displayName(c),
        c.nombre_comercial,
        c.nit,
        c.nrc,
        c.dui,
        c.email,
        c.telefono,
        c.direccion,
        c.municipio,
        c.departamento,
      ].some((f) => norm(f).includes(q));
    })
    .sort((a, b) =>
      displayName(a).localeCompare(displayName(b), 'es', {
        sensitivity: 'base',
      })
    );

  const totalClientes = clientes.length;
  const pageCount = Math.ceil(rows.length / pageSize) || 1;
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const openCliente = (id: number) => setSelectedClienteId(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Clientes ({totalClientes})</h1>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-base" onClick={() => setFormOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Cliente
        </Button>
      </div>


      {/* Search */}
      <div className="surface surface-pad">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value ?? '');
                setPage(1);
              }}
              className="pl-12 bg-background border-border text-base"
            />
          </div>
          <Button
            onClick={() => setExportOpen(true)}
            variant="outline"
            className="rounded-full h-9 px-4"
            aria-label="Descargar clientes"
          >
            <Download className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">Descargar</span>
          </Button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="surface surface-pad">
        <h2 className="text-lg md:text-xl text-foreground">
          Clientes ({rows.length})
        </h2>
        {loading && <p>Cargando...</p>}
        {error && <p className="text-destructive">{error}</p>}
        <div className="mt-4 overflow-x-auto">
          <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground text-sm md:text-base">Cliente</TableHead>
                  <TableHead className="text-muted-foreground text-sm md:text-base hidden lg:table-cell">Contacto</TableHead>
                  <TableHead className="text-muted-foreground text-sm md:text-base hidden xl:table-cell">Dirección</TableHead>
                  <TableHead className="text-muted-foreground text-sm md:text-base hidden md:table-cell">Última Compra</TableHead>
                  <TableHead className="text-muted-foreground text-sm md:text-base">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((cliente) => (
                  <TableRow
                    key={cliente.id}
                    onClick={() => openCliente(cliente.id)}
                    className="border-border cursor-pointer"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm md:text-base truncate max-w-[120px] md:max-w-none">{displayName(cliente) || '-'}</p>
                        <p className="text-sm text-muted-foreground">ID: {cliente.id.toString().padStart(3, '0')}</p>
                        <div className="lg:hidden mt-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground truncate max-w-[100px]">{cliente.email || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm mt-0.5">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">{cliente.telefono || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-base">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{cliente.email || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-base">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{cliente.telefono || '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm md:text-base max-w-xs hidden xl:table-cell">
                      {cliente.direccion || '-'}
                    </TableCell>
                    <TableCell className="text-foreground text-sm md:text-base hidden md:table-cell">
                      {cliente.fecha_ultima_compra
                        ? new Date(cliente.fecha_ultima_compra).toLocaleDateString('es-SV', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(cliente);
                          }}
                        >
                          <Edit className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cliente);
                          }}
                          disabled={deletingId === cliente.id}
                        >
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        {pageCount > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </div>
        )}
      </div>
      <ExportClientesModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        clientes={clientes}
      />
      <ModalClientForm
        open={formOpen || !!editingClient}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
        }}
        onSuccess={loadClientes}
        client={editingClient || undefined}
      />
      <ClienteModal
        id={selectedClienteId}
        open={selectedClienteId !== null}
        onClose={() => setSelectedClienteId(null)}
      />
    </div>
  );
}