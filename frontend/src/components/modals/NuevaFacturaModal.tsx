import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Producto, Categoria } from '@/types/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import CategoryFilterModal from '@/components/CategoryFilterModal';
import CheckoutWizard from '@/components/CheckoutWizard';
import CartItem, { POSCartItem } from '@/components/pos/CartItem';
import { Separator } from '@/components/ui/separator';
import AppModal from '@/components/ui/AppModal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CreditCard,
  Filter,
  X,
  Trash2,
} from 'lucide-react';
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch';
import Pagination from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/skeleton';

interface NuevaFacturaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (saleData?: { id: number; total: number; saleType: string }) => void;
}

export default function NuevaFacturaModal({ open, onClose, onSuccess }: NuevaFacturaModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [itemType, setItemType] = useState<'producto' | 'servicio' | 'all'>('all');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 24; // Más productos por página en vista de cards
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    (async () => {
      try {
        setCategorias(await api.getCategories());
      } catch (e: any) {
        console.error('Error cargando categorías:', e);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [itemType, debouncedSearch, selectedCategories]);

  const categoriaParam = selectedCategories.join(',');
  const productosQuery = usePaginatedFetch({
    page,
    pageSize,
    queryKey: ['pos-productos', itemType, categoriaParam, debouncedSearch],
    fetcher: (pageNumber, size) =>
      api.getProductos({
        page: pageNumber,
        page_size: size,
        tipo: itemType !== 'all' ? itemType : undefined,
        status: 'active',
        q: debouncedSearch || undefined,
        categoria_id: categoriaParam || undefined,
      }),
  });
  const productos = productosQuery.data?.results ?? [];
  const totalProductos = productosQuery.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalProductos / (productosQuery.data?.page_size ?? pageSize)));
  const loading = productosQuery.isLoading;

  const addToCart = (producto: Producto) => {
    const existingItem = cart.find((item) => item.id === producto.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: producto.id,
          codigo: producto.codigo || '',
          nombre: producto.nombre,
          precio: producto.precio,
          costo: producto.precio,
          cantidad: 1,
        },
      ]);
    }
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((i) => i.id !== id));
    } else {
      setCart(
        cart.map((i) => (i.id === id ? { ...i, cantidad: newQuantity } : i))
      );
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const total = cart.reduce(
    (sum, item) => sum + (item.overridePrice ?? item.precio) * item.cantidad,
    0
  );

  const handlePriceChange = (id: number, price: number) => {
    setCart(
      cart.map((it) =>
        it.id === id ? { ...it, overridePrice: price, override: true } : it
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCategoryFilter = (categories: number[]) => {
    setSelectedCategories(categories);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
  };

  const getSelectedCategoryNames = () => {
    return categorias
      .filter((cat) => selectedCategories.includes(cat.id))
      .map((cat) => cat.name ?? cat.nombre);
  };

  const handleClose = () => {
    setCart([]);
    setSearchTerm('');
    setItemType('all');
    setSelectedCategories([]);
    setPage(1);
    onClose();
  };

  if (showCheckout) {
    return (
        <CheckoutWizard
          open={showCheckout}
          onClose={() => {
            setShowCheckout(false);
          }}
          items={cart}
          total={total}
          onCloseParent={() => {
            // Cerrar el modal de Nueva Factura cuando se muestra la confirmación
            // para que no se vea por detrás
            setShowCheckout(false);
            onClose();
          }}
          onSuccess={(saleData) => {
            // Cuando el checkout es exitoso, pasar los datos de la venta al callback
            // Limpiar el estado
            setCart([]);
            setSearchTerm('');
            setItemType('all');
            setSelectedCategories([]);
            setPage(1);
            // Pasar los datos de la venta al callback para mostrar la confirmación
            onSuccess?.(saleData);
          }}
      />
    );
  }

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Nueva Factura"
      className="max-w-[95vw] lg:max-w-6xl w-full"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-base font-medium">
            Total: <span className="text-primary text-lg font-semibold">${total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Continuar al Pago
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 min-h-0 flex-1">
        {/* Products Section - Estilo más limpio */}
        <div className="flex flex-col space-y-4 min-h-0">
          {/* Búsqueda simplificada - Fija */}
          <div className="space-y-2 flex-shrink-0">
            <label className="text-sm font-medium text-foreground">
              Buscar producto o servicio por nombre o código
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar producto o servicio por nombre o código"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-11 text-base"
                autoFocus
              />
              <Button
                variant="outline"
                onClick={() => setShowCategoryModal(true)}
                className="h-11"
              >
                <Filter className="h-4 w-4 mr-2" />
                Categoría
              </Button>
            </div>
          </div>

          {/* Filtros activos - Fija */}
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              {getSelectedCategoryNames().map((categoryName, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {categoryName}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        prev.filter(
                          (id) =>
                            id !==
                            categorias.find((c) => (c.name ?? c.nombre) === categoryName)?.id
                        )
                      )
                    }
                  />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                Limpiar filtros
              </Button>
            </div>
          )}

          {/* Lista de resultados - Scrolleable */}
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <label className="text-sm font-medium text-foreground flex-shrink-0">Resultados</label>
            <div className="flex-1 overflow-y-auto border rounded-lg p-2 space-y-1 min-h-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : productos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium mb-1">No se encontraron items</p>
                  <p className="text-sm text-muted-foreground">
                    Intenta cambiar los filtros o la búsqueda
                  </p>
                </div>
              ) : (
                <>
                  {productos.map((producto) => {
                    const qtyInCart = cart.find((item) => item.id === producto.id)?.cantidad || 0;
                    return (
                      <div
                        key={producto.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground uppercase text-sm">
                              {producto.nombre}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-primary">${producto.precio.toFixed(2)}</span>
                            <span>·</span>
                            <span className="font-mono text-xs">{producto.codigo || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {qtyInCart > 0 ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateQuantity(producto.id, qtyInCart - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-sm font-semibold min-w-[24px] text-center">
                                {qtyInCart}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => addToCart(producto)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => addToCart(producto)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!loading && pageCount > 1 && (
                    <div className="mt-4 flex justify-center pt-4 border-t">
                      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cart Section - Estilo más limpio */}
        <div className="flex flex-col border-l pl-6 space-y-4 min-h-0">
          <div className="flex flex-col min-h-0 flex-1">
            <h2 className="text-sm font-medium text-foreground mb-2 flex-shrink-0">Items seleccionados</h2>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
                <p className="text-muted-foreground font-medium mb-1">No hay items seleccionados.</p>
                <p className="text-sm text-muted-foreground">
                  Agrega productos o servicios desde la lista
                </p>
              </div>
            ) : (
              <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground mb-1">
                          {item.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>${(item.overridePrice ?? item.precio).toFixed(2)}</span>
                          {item.codigo && (
                            <>
                              <span>·</span>
                              <span className="font-mono">{item.codigo}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-semibold min-w-[24px] text-center">
                          {item.cantidad}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t flex justify-end flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="text-lg font-bold text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CategoryFilterModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categorias}
        selectedCategories={selectedCategories}
        onApplyFilters={handleCategoryFilter}
      />
    </AppModal>
  );
}
