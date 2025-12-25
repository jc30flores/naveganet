import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import ChangePriceModal from './ChangePriceModal';

export interface POSCartItem {
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
  costo: number;
  cantidad: number;
  overridePrice?: number;
  override?: boolean;
}

interface CartItemProps {
  item: POSCartItem;
  onRemove: (id: number) => void;
  onPriceChange: (id: number, price: number) => void;
}

export default function CartItem({ item, onRemove, onPriceChange }: CartItemProps) {
  const [open, setOpen] = useState(false);
  const unitPrice = item.overridePrice ?? item.precio;
  return (
    <>
      <div className="flex flex-wrap items-start md:items-center gap-2 md:gap-3 p-2 md:p-3 border border-border rounded-md">
        <Badge variant="secondary" className="text-base font-bold px-3 py-1">
          {item.cantidad}
        </Badge>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm md:text-base truncate">
            {item.nombre}
          </h4>
          <p className="text-sm text-muted-foreground font-mono">{item.codigo}</p>
          <p className={`text-sm md:text-base font-medium ${item.overridePrice ? 'text-amber-500' : 'text-primary'}`}>
            ${unitPrice.toFixed(2)} c/u
          </p>
          {item.overridePrice && (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 mt-1">Precio editado</Badge>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm md:text-base font-bold text-foreground">
            ${(unitPrice * item.cantidad).toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {open && (
        <ChangePriceModal
          item={item}
          open={open}
          onClose={() => setOpen(false)}
          onApply={(price) => {
            onPriceChange(item.id, price);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
