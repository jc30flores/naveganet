import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Producto, Categoria } from '@/types/db';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/StatusBadge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  Package,
  Download,
  X
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import FiltersModal from '@/components/inventory/FiltersModal';
import ExportInventarioModal from '@/components/inventory/ExportInventarioModal';
import ModalProductForm from '@/components/ModalProductForm';
import AppModal from '@/components/ui/AppModal';
import Pagination from '@/components/ui/Pagination';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch';
import { useAuth } from '@/store/auth';

const parseNumberListParam = (value: string | null): number[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);
};

const parseStringListParam = (value: string | null): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const normalizePageParam = (value: string | null): number => {
  if (!value) return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const haveSameMembers = <T extends string | number>(
  a: readonly T[],
  b: readonly T[],
): boolean => {
  if (a.length !== b.length) return false;
  const sortFn = (left: T, right: T) => {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  };
  const sortedA = [...a].sort(sortFn);
  const sortedB = [...b].sort(sortFn);
  return sortedA.every((val, idx) => val === sortedB[idx]);
};

const USED_STATUS_LABELS: Record<string, string> = {
  bueno: 'Bueno',
  con_detalle: 'Con detalle',
};

const NEW_STOCK_STATUS_OPTIONS = [
  { value: 'Agotado', label: 'Agotado' },
  { value: 'Bajo', label: 'Bajo' },
  { value: 'Normal', label: 'Normal' },
] as const;

export default function Inventario() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [productType, setProductType] = useState<'new' | 'used' | 'all'>('all');
  const [selectedCategories, setSelectedCategories] = useState<number[]>(() =>
    parseNumberListParam(searchParams.get('categories')),
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() =>
    parseStringListParam(searchParams.get('statuses')),
  );
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(() => normalizePageParam(searchParams.get('page')));
  const pageJumpScrollRef = useRef(true);
  const pageSize = 50;
  const authUser = useAuth((s) => s.user);
  const role = authUser?.role ?? '';
  const hasInventoryRestrictions = authUser?.is_vendedor ?? false;
  const isVendorOnly = role === 'vendedor';
  const canDeleteProducts = !hasInventoryRestrictions;
  const canAddProducts = !isVendorOnly;
  const canEditProducts = !isVendorOnly;
  const showActionColumn = canEditProducts || canDeleteProducts;
  const prevProductTypeRef = useRef<'new' | 'used' | 'all'>(productType);
  const lastSearchRef = useRef(searchParams.toString());

  useEffect(() => {
    if (pageJumpScrollRef.current) {
      pageJumpScrollRef.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cats = await api.getCategories();
        if (isMounted) {
          setCategorias(cats);
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (currentSearch === lastSearchRef.current) {
      return;
    }

    lastSearchRef.current = currentSearch;

    const paramsSnapshot = new URLSearchParams(currentSearch);
    const catsFromParams = parseNumberListParam(paramsSnapshot.get('categories'));
    const statusesFromParams = parseStringListParam(paramsSnapshot.get('statuses'));

    setSelectedCategories((prev) =>
      haveSameMembers(prev, catsFromParams) ? prev : catsFromParams,
    );
    setSelectedStatuses((prev) =>
      haveSameMembers(prev, statusesFromParams) ? prev : statusesFromParams,
    );
  }, [searchParams]);

  const searchValue = searchTerm.trim();
  const categoriaParam = selectedCategories.join(',');
  const estadoUsadoParam =
    productType === 'used' && selectedStatuses.length > 0
      ? selectedStatuses.join(',')
      : undefined;
  const stockStateParam =
    productType === 'new' && selectedStatuses.length > 0
      ? selectedStatuses.join(',')
      : undefined;

  const stableFilters = useMemo(
    () => ({
      status: 'active' as const,
      condicion: productType === 'all' ? undefined : productType,
      q: searchValue || undefined,
      categoria_id: categoriaParam || undefined,
      estado_usado: estadoUsadoParam,
      stock_state: stockStateParam,
    }),
    [productType, searchValue, categoriaParam, estadoUsadoParam, stockStateParam],
  );

  const fetchProductos = useCallback(
    (pageNumber: number, size: number) =>
      api.getProductos({
        page: pageNumber,
        page_size: size,
        ...stableFilters,
      }),
    [stableFilters],
  );

  const productosQuery = usePaginatedFetch({
    page,
    pageSize,
    queryKey: ['productos', stableFilters],
    fetcher: fetchProductos,
    queryOptions: {
      refetchOnWindowFocus: false,
    },
  });
  const productosData = productosQuery.data?.results ?? [];
  const totalProductos = productosQuery.data?.count ?? 0;
  const effectivePageSize = productosQuery.data?.page_size ?? pageSize;
  const totalPagesFromApi = productosQuery.data?.total_pages ?? null;
  const pageCount =
    totalPagesFromApi && totalPagesFromApi > 0
      ? totalPagesFromApi
      : Math.max(1, Math.ceil(totalProductos / effectivePageSize) || 1);
  const productosError = productosQuery.error instanceof Error ? productosQuery.error.message : null;
  const loadingProductos = productosQuery.isLoading;
  const errorMessage = error || productosError;

  const handleProductTypeChange = useCallback(
    (value: string) => {
      const nextType = value as 'new' | 'used' | 'all';
      setProductType((prev) => {
        if (prev === nextType) {
          return prev;
        }
        setPage(1);
        return nextType;
      });
    },
    [setPage],
  );

  const handlePageChange = useCallback((nextPage: number) => {
    if (!Number.isFinite(nextPage) || nextPage < 1) return;
    setPage((prev) => (prev === nextPage ? prev : nextPage));
  }, []);

  const handleFiltersModalClose = useCallback(() => {
    setFiltersModalOpen(false);
  }, []);

  const handleFiltersApply = useCallback(
    (cats: number[], statuses: string[]) => {
      const catsChanged = !haveSameMembers(selectedCategories, cats);
      const statusesChanged = !haveSameMembers(selectedStatuses, statuses);
      if (catsChanged) {
        setSelectedCategories(cats);
      }
      if (statusesChanged) {
        setSelectedStatuses(statuses);
      }
      if (catsChanged || statusesChanged) {
        setPage(1);
      }
    },
    [selectedCategories, selectedStatuses, setPage],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategories.length > 0) {
      params.set('categories', selectedCategories.join(','));
    }
    if (selectedStatuses.length > 0) {
      params.set('statuses', selectedStatuses.join(','));
    }
    if (page > 1) {
      params.set('page', String(page));
    }

    const nextSearch = params.toString();
    if (nextSearch === lastSearchRef.current) {
      return;
    }

    lastSearchRef.current = nextSearch;
    setSearchParams(params, { replace: true });
  }, [selectedCategories, selectedStatuses, page, setSearchParams]);

  const statusOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; count: number }>();

    const ensureEntry = (value: string, label: string) => {
      if (!map.has(value)) {
        map.set(value, { value, label, count: 0 });
      }
    };

    if (productType !== 'used') {
      NEW_STOCK_STATUS_OPTIONS.forEach(({ value, label }) => ensureEntry(value, label));
    }
    if (productType !== 'new') {
      Object.entries(USED_STATUS_LABELS).forEach(([value, label]) => ensureEntry(value, label));
    }

    productosData.forEach((p) => {
      if (p.condicion === 'used') {
        const val = p.estado_usado;
        if (!val) return;
        const label = USED_STATUS_LABELS[val] || val;
        ensureEntry(val, label);
        const current = map.get(val);
        if (current) current.count += 1;
      } else {
        const estado = (() => {
          if (p.stock === 0) return 'Agotado';
          if (
            p.stock_minimo !== undefined &&
            p.stock_minimo !== null &&
            p.stock_minimo !== 0 &&
            p.stock <= p.stock_minimo
          ) {
            return 'Bajo';
          }
          return 'Normal';
        })();
        ensureEntry(estado, estado);
        const current = map.get(estado);
        if (current) current.count += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }),
    );
  }, [productosData, productType]);

  useEffect(() => {
    const allowed = new Set(statusOptions.map((o) => o.value));
    let trimmed = false;
    setSelectedStatuses((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const filtered = prev.filter((s) => allowed.has(s));
      if (filtered.length === prev.length) {
        return prev;
      }
      trimmed = true;
      return filtered;
    });
    if (trimmed && prevProductTypeRef.current !== productType) {
      setPage(1);
    }
    prevProductTypeRef.current = productType;
  }, [statusOptions, productType, setPage]);

  const handleEdit = (p: Producto) => {
    if (!canEditProducts) return;
    setEditingProduct(p);
    setFormOpen(false);
  };

  const handleDelete = async (p: Producto) => {
    if (!canDeleteProducts) return;
    if (!confirm('¿Eliminar definitivamente?')) return;
    setDeletingId(p.id);
    try {
      await api.deleteProducto(p.id);
      toast({ title: 'Eliminado' });
      await productosQuery.refetch();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = useCallback(() => {
    let changed = false;
    setSelectedCategories((prev) => {
      if (prev.length === 0) return prev;
      changed = true;
      return [];
    });
    setSelectedStatuses((prev) => {
      if (prev.length === 0) return prev;
      changed = true;
      return [];
    });
    if (changed) {
      setPage(1);
    }
  }, [setPage]);

  const removeCategory = useCallback((id: number) => {
    setSelectedCategories((prev) => {
      if (!prev.includes(id)) {
        return prev;
      }
      const updated = prev.filter((c) => c !== id);
      setPage(1);
      return updated;
    });
  }, [setPage]);

  const removeStatus = useCallback((val: string) => {
    setSelectedStatuses((prev) => {
      if (!prev.includes(val)) {
        return prev;
      }
      const updated = prev.filter((s) => s !== val);
      setPage(1);
      return updated;
    });
  }, [setPage]);



  const catName = (p: any) =>
    (p.categoria_nombre ?? (typeof p.categoria === 'string' ? p.categoria : '')).toString();

  const toNum = (v: any) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);

  const displayedProducts = productosData;

  useEffect(() => {
    if (!productosQuery.isFetching && pageCount > 0 && page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount, productosQuery.isFetching]);


  return (
    <ErrorBoundary>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Catálogo</h1>
        </div>
        <div className="flex gap-2">
          {canAddProducts && (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-base"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Agregar
            </Button>
          )}
        </div>
      </div>

      {/* Product Type Selector */}
      <div className="surface surface-pad">
        <Tabs value={productType} onValueChange={handleProductTypeChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="new">Nuevos</TabsTrigger>
            <TabsTrigger value="used">Usados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search and Filters */}
      <div className="surface surface-pad">
        <h2 className="flex items-center gap-2 text-lg md:text-xl text-foreground">
          <Package className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Búsqueda y Filtros
        </h2>
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                setPage((prev) => (prev === 1 ? prev : 1));
              }}
              className="pl-12 bg-background border-border text-base"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setExportOpen(true)}
              variant="outline"
              className="rounded-full h-9 px-4"
              aria-label="Descargar inventario"
            >
              <Download className="h-5 w-5" />
              <span className="ml-2 hidden sm:inline">Descargar</span>
            </Button>
            <Button
              variant="outline"
              className="border-border hover:bg-muted text-base"
              onClick={() => setFiltersModalOpen(true)}
            >
              <Filter className="h-5 w-5 mr-2" />
              Filtrar
              {selectedCategories.length + selectedStatuses.length > 0 && (
                <Badge className="ml-2 bg-primary text-primary-foreground">
                  {selectedCategories.length + selectedStatuses.length}
                </Badge>
              )}
            </Button>
            {(selectedCategories.length > 0 || selectedStatuses.length > 0) && (
              <Button variant="outline" onClick={clearFilters} className="text-base">
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
        {(selectedCategories.length > 0 || selectedStatuses.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {categorias
              .filter((c) => selectedCategories.includes(c.id))
              .map((c) => (
                <Badge
                  key={c.id}
                  className="bg-primary text-primary-foreground flex items-center gap-1"
                >
                  {c.name ?? c.nombre}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeCategory(c.id)}
                  />
                </Badge>
              ))}
            {statusOptions
              .filter((s) => selectedStatuses.includes(s.value))
              .map((s) => (
                <Badge
                  key={s.value}
                  className="bg-primary text-primary-foreground flex items-center gap-1"
                >
                  {s.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeStatus(s.value)}
                  />
                </Badge>
              ))}
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="surface surface-pad">
        <h2 className="text-lg md:text-xl text-foreground">
          Productos ({totalProductos})
        </h2>
        {loadingProductos && <p>Cargando...</p>}
        {errorMessage && <p className="text-destructive">{errorMessage}</p>}
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground text-sm md:text-base">Código</TableHead>
                <TableHead className="text-muted-foreground text-sm md:text-base">Producto</TableHead>
                <TableHead className="text-muted-foreground text-sm md:text-base hidden md:table-cell">Categoría</TableHead>
                <TableHead className="text-muted-foreground text-sm md:text-base">Precio</TableHead>
                <TableHead className="text-muted-foreground text-sm md:text-base">Costo</TableHead>
                <TableHead className="text-muted-foreground text-sm md:text-base">Estado</TableHead>
                {showActionColumn && (
                  <TableHead className="text-muted-foreground text-sm md:text-base">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedProducts.map((producto) => (
                <TableRow key={producto.id} className="border-border">
                  <TableCell className="font-mono text-sm md:text-base text-foreground">
                    {producto.codigo}
                  </TableCell>
                  <TableCell className="font-medium text-sm md:text-base text-foreground">
                    <div>
                      <div className="truncate max-w-[120px] md:max-w-none">{producto.nombre}</div>
                      <div className="text-sm text-muted-foreground md:hidden">{catName(producto)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm md:text-base hidden md:table-cell">
                    {catName(producto)}
                  </TableCell>
                  <TableCell className="font-medium text-sm md:text-base text-foreground">
                    ${toNum(producto.precio).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium text-sm md:text-base text-muted-foreground">
                    ${toNum(producto.costo).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      condicion={producto.condicion as 'new' | 'used'}
                      estado={producto.estado}
                      estado_usado={producto.estado_usado as any}
                    />
                  </TableCell>
                  {showActionColumn && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEditProducts && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => handleEdit(producto)}
                          >
                            <Edit className="h-4 w-4 md:h-5 md:w-5" />
                          </Button>
                        )}
                        {canDeleteProducts && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(producto)}
                            disabled={deletingId === producto.id}
                          >
                            <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!loadingProductos && displayedProducts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showActionColumn ? 7 : 6}
                    className="text-center text-muted-foreground"
                  >
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {pageCount > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination page={page} pageCount={pageCount} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      <ExportInventarioModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        currentType={productType}
      />
      <FiltersModal
        open={filtersModalOpen}
        onClose={handleFiltersModalClose}
        categories={categorias}
        onCategoriesChange={setCategorias}
        selectedCategories={selectedCategories}
        selectedStatuses={selectedStatuses}
        statusOptions={statusOptions}
        onApply={handleFiltersApply}
      />
      <ModalProductForm
        open={formOpen || !!editingProduct}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        categorias={categorias}
        onSuccess={() => productosQuery.refetch()}
        product={editingProduct || undefined}
      />

      </div>
    </ErrorBoundary>
  );
}