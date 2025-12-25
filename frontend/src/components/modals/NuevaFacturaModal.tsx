import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Producto, Categoria } from '@/types/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      className="max-w-[95vw] lg:max-w-7xl w-full"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-lg font-semibold">
            Total: <span className="text-primary text-xl">${total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="gap-2"
              size="lg"
            >
              <CreditCard className="h-4 w-4" />
              Continuar al Pago
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 h-[calc(100vh-250px)]">
        {/* Products Section */}
        <div className="flex flex-col space-y-4 overflow-hidden">
          {/* Header con búsqueda y filtros */}
          <div className="space-y-3">
            {/* Item Type Selector */}
            <Tabs value={itemType} onValueChange={(value) => setItemType(value as 'producto' | 'servicio' | 'all')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="producto">Productos</TabsTrigger>
                <TabsTrigger value="servicio">Servicios</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Category Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-11 text-base"
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCategoryModal(true)}
                className="h-11"
              >
                <Filter className="h-4 w-4 mr-2" />
                Categoría
              </Button>
            </div>

            {/* Active Filters */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtros activos:</span>
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
                  className="h-6 text-xs"
                >
                  Limpiar todo
                </Button>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-2">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-20 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </Card>
                ))}
              </div>
            ) : productos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No se encontraron items</p>
                <p className="text-sm text-muted-foreground">
                  Intenta cambiar los filtros o la búsqueda
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {productos.map((producto) => {
                    const qtyInCart = cart.find((item) => item.id === producto.id)?.cantidad || 0;
                    const isInCart = qtyInCart > 0;
                    return (
                      <Card
                        key={producto.id}
                        className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                          isInCart ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => addToCart(producto)}
                      >
                        <CardContent className="p-0 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {producto.tipo}
                              </Badge>
                              {producto.codigo && (
                                <span className="text-xs font-mono text-muted-foreground">
                                  {producto.codigo}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                              {producto.nombre}
                            </h3>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="font-bold text-primary text-lg">
                              ${producto.precio.toFixed(2)}
                            </span>
                            {isInCart ? (
                              <div className="flex items-center gap-2 bg-primary/10 rounded-md px-2 py-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(producto.id, qtyInCart - 1);
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-semibold min-w-[20px] text-center">
                                  {qtyInCart}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(producto);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(producto);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {!loading && pageCount > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="flex flex-col border-l pl-6 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Carrito
            </h2>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium mb-1">Carrito vacío</p>
              <p className="text-sm text-muted-foreground">
                Agrega productos o servicios desde la lista
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-muted/50 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight line-clamp-2">
                          {item.nombre}
                        </p>
                        {item.codigo && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {item.codigo}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-semibold min-w-[30px] text-center">
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
                      <span className="font-bold text-primary">
                        ${((item.overridePrice ?? item.precio) * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="pt-2">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-primary text-xl">${total.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
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
