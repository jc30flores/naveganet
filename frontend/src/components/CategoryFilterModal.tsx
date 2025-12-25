import { useState, useEffect } from 'react';
import AppModal from '@/components/ui/AppModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import type { Categoria } from '@/types/db';

interface CategoryFilterModalProps {
  open: boolean;
  onClose: () => void;
  categories: Categoria[];
  selectedCategories: number[];
  onApplyFilters: (selectedCategories: number[]) => void;
}

export default function CategoryFilterModal({ 
  open, 
  onClose, 
  categories, 
  selectedCategories, 
  onApplyFilters 
}: CategoryFilterModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelected, setLocalSelected] = useState<number[]>(selectedCategories);

  useEffect(() => {
    setLocalSelected(selectedCategories);
  }, [selectedCategories]);

  const getCategoryName = (category: Categoria) =>
    category.name ?? category.nombre ?? '';

  const filteredCategories = categories.filter((category) =>
    getCategoryName(category).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryToggle = (categoryId: number) => {
    setLocalSelected(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleApply = () => {
    onApplyFilters(localSelected);
    onClose();
  };

  const handleClear = () => {
    setLocalSelected([]);
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Filtrar por Categorías"
      footer={(
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear}>
            Limpiar
          </Button>
          <Button onClick={handleApply}>Aplicar Filtros</Button>
        </div>
      )}
    >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full text-base"
            />
          </div>

          {/* Category List */}
          <div className="max-h-60 overflow-y-auto space-y-2" style={{ scrollbarGutter: 'stable both-edges' }}>
            {filteredCategories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={localSelected.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <label
                  htmlFor={`category-${category.id}`}
                  className="text-sm text-foreground cursor-pointer flex-1"
                >
                  {getCategoryName(category)}
                </label>
              </div>
            ))}
          </div>

          {localSelected.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {localSelected.length} categoría{localSelected.length !== 1 ? 's' : ''} seleccionada{localSelected.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
    </AppModal>
  );
}