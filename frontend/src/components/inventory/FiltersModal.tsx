import { useEffect, useRef, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Check, Trash2, Edit2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import type { Categoria } from '@/types/db';

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

interface StatusOption {
  value: string;
  label: string;
  count: number;
}

interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  categories: Categoria[];
  onCategoriesChange: (cats: Categoria[]) => void;
  selectedCategories: number[];
  selectedStatuses: string[];
  statusOptions: StatusOption[];
  onApply: (categories: number[], statuses: string[]) => void;
}

export default function FiltersModal({
  open,
  onClose,
  categories,
  onCategoriesChange,
  selectedCategories,
  selectedStatuses,
  statusOptions,
  onApply,
}: FiltersModalProps) {
  const [catSearch, setCatSearch] = useState('');
  const [catDebounced, setCatDebounced] = useState('');
  const [localCats, setLocalCats] = useState<number[]>(selectedCategories);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [manageSearch, setManageSearch] = useState('');
  const [manageDebounced, setManageDebounced] = useState('');

  const [statusSearch, setStatusSearch] = useState('');
  const [statusDebounced, setStatusDebounced] = useState('');
  const [localStatuses, setLocalStatuses] = useState<string[]>(selectedStatuses);

  const syncedSelectionsRef = useRef<{
    cats: number[];
    statuses: string[];
    initialized: boolean;
  }>({
    cats: [...selectedCategories],
    statuses: [...selectedStatuses],
    initialized: false,
  });

  useEffect(() => {
    const ref = syncedSelectionsRef.current;
    if (!open) {
      ref.cats = [...selectedCategories];
      ref.statuses = [...selectedStatuses];
      return;
    }

    const catsChanged =
      !ref.initialized || !haveSameMembers(ref.cats, selectedCategories);
    const statusesChanged =
      !ref.initialized || !haveSameMembers(ref.statuses, selectedStatuses);

    if (catsChanged) {
      setLocalCats([...selectedCategories]);
    }
    if (statusesChanged) {
      setLocalStatuses([...selectedStatuses]);
    }

    if (catsChanged || statusesChanged || !ref.initialized) {
      ref.cats = [...selectedCategories];
      ref.statuses = [...selectedStatuses];
      ref.initialized = true;
    }
  }, [open, selectedCategories, selectedStatuses]);

  useEffect(() => {
    const t = setTimeout(() => setCatDebounced(catSearch), 300);
    return () => clearTimeout(t);
  }, [catSearch]);

  useEffect(() => {
    const t = setTimeout(() => setManageDebounced(manageSearch), 300);
    return () => clearTimeout(t);
  }, [manageSearch]);

  useEffect(() => {
    const t = setTimeout(() => setStatusDebounced(statusSearch), 300);
    return () => clearTimeout(t);
  }, [statusSearch]);

  const filteredCats = categories.filter((c) =>
    (c.nombre || '').toLowerCase().includes(catDebounced.toLowerCase())
  );
  const manageFiltered = categories.filter((c) =>
    (c.nombre || '').toLowerCase().includes(manageDebounced.toLowerCase())
  );
  const filteredStatuses = statusOptions.filter((s) =>
    s.label.toLowerCase().includes(statusDebounced.toLowerCase())
  );

  const toggleCat = (id: number) => {
    setLocalCats((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const toggleStatus = (v: string) => {
    setLocalStatuses((prev) =>
      prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v]
    );
  };

  const handleApply = () => {
    const catsChanged = !haveSameMembers(selectedCategories, localCats);
    const statusesChanged = !haveSameMembers(selectedStatuses, localStatuses);
    if (catsChanged || statusesChanged) {
      onApply([...localCats], [...localStatuses]);
    }
    handleClose();
  };

  const handleClose = async () => {
    onClose();
    try {
      const cats = await api.getCategories();
      onCategoriesChange(cats);
    } catch {
      /* ignore */
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const cat = await api.createCategory({ nombre: newName.trim() });
      onCategoriesChange([...categories, cat]);
      setNewName('');
      toast({ title: 'Categoría agregada' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const startEdit = (cat: Categoria) => {
    setEditingId(cat.id);
    setEditingName(cat.nombre || '');
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    try {
      const cat = await api.updateCategory(editingId, { nombre: editingName });
      onCategoriesChange(categories.map((c) => (c.id === editingId ? cat : c)));
      setEditingId(null);
      setEditingName('');
      toast({ title: 'Guardado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar categoría?')) return;
    const prev = [...categories];
    onCategoriesChange(prev.filter((c) => c.id !== id));
    try {
      await api.deleteCategory(id);
      toast({ title: 'Categoría eliminada' });
    } catch (e: any) {
      onCategoriesChange(prev);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Filtros"
      footer={
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>Aplicar filtros</Button>
        </div>
      }
    >
      <Tabs defaultValue="categories" className="mt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="status">Estado</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
          <Tabs defaultValue="select">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Seleccionar</TabsTrigger>
              <TabsTrigger value="manage">Administrar</TabsTrigger>
            </TabsList>
            <TabsContent value="select" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorías..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  className="pl-10 w-full text-base"
                />
              </div>
              <div className="flex justify-between text-sm">
                <Button variant="ghost" onClick={() => setLocalCats(filteredCats.map((c) => c.id))}>
                  Seleccionar todo
                </Button>
                <Button variant="ghost" onClick={() => setLocalCats([])}>
                  Ninguno
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarGutter: 'stable both-edges' }}>
                {filteredCats.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${c.id}`}
                      checked={localCats.includes(c.id)}
                      onCheckedChange={() => toggleCat(c.id)}
                    />
                    <label htmlFor={`cat-${c.id}`} className="flex-1 text-sm cursor-pointer">
                      {c.nombre}
                    </label>
                    <Badge variant="secondary">{c.product_count ?? 0}</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="manage" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva categoría"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorías..."
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                  className="pl-10 w-full text-base"
                />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarGutter: 'stable both-edges' }}>
                {manageFiltered.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    {editingId === c.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        className="flex-1 text-base"
                      />
                    ) : (
                      <span className="flex-1 text-sm">{c.nombre}</span>
                    )}
                    {editingId === c.id ? (
                      <Button size="sm" variant="ghost" onClick={saveEdit} title="Guardar">
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(c)} title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(c.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="status" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar estado..."
              value={statusSearch}
              onChange={(e) => setStatusSearch(e.target.value)}
              className="pl-10 w-full text-base"
            />
          </div>
          <div className="flex justify-between text-sm">
            <Button variant="ghost" onClick={() => setLocalStatuses(filteredStatuses.map((s) => s.value))}>
              Seleccionar todo
            </Button>
            <Button variant="ghost" onClick={() => setLocalStatuses([])}>
              Ninguno
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarGutter: 'stable both-edges' }}>
            {filteredStatuses.map((s) => (
              <div key={s.value} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${s.value}`}
                  checked={localStatuses.includes(s.value)}
                  onCheckedChange={() => toggleStatus(s.value)}
                />
                <label htmlFor={`status-${s.value}`} className="flex-1 text-sm cursor-pointer">
                  {s.label}
                </label>
                <Badge variant="secondary">{s.count}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppModal>
  );
}

