import { useEffect, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import type { POSCartItem } from './CartItem';

interface Props {
  open: boolean;
  onClose: () => void;
  item: POSCartItem;
  onApply: (price: number) => void;
}

export default function ChangePriceModal({ open, onClose, item, onApply }: Props) {
  const [price, setPrice] = useState('');
  const [code, setCode] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) {
      setPrice((item.overridePrice ?? item.precio).toFixed(2));
      setCode('');
      api.getOverrideStatus().then(res => {
        if (res.locked && res.retry_after) {
          const until = Date.now() + res.retry_after * 1000;
          setLockedUntil(until);
          setTimeout(() => setLockedUntil(null), res.retry_after * 1000);
        } else {
          setLockedUntil(null);
        }
      }).catch(() => {});
    }
  }, [open, item]);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const numPrice = parseFloat(price) || 0;
  const profit = (numPrice - item.costo) * item.cantidad;
  const margin = numPrice ? ((numPrice - item.costo) / numPrice) * 100 : 0;
  const belowCost = numPrice < item.costo;
  const locked = lockedUntil !== null && lockedUntil > Date.now();
  const remainingSec = locked
    ? Math.max(0, Math.ceil((lockedUntil! - Date.now()) / 1000))
    : 0;
  const remainingTime = formatTime(remainingSec);
  const canApply = numPrice > 0 && code && !locked;

  const apply = async () => {
    try {
      const res = await api.validateOverrideCode(code);
      if (res.ok) {
        onApply(numPrice);
        toast({ title: 'Precio actualizado' });
        onClose();
        return;
      }
      if (res.locked && res.retry_after) {
        const until = Date.now() + res.retry_after * 1000;
        setLockedUntil(until);
        setTimeout(() => setLockedUntil(null), res.retry_after * 1000);
      }
      const msg = res.locked
        ? `Se desbloquea en ${formatTime(res.retry_after)}`
        : res.attempts_left === 1
          ? `Último intento antes de bloqueo de 3 minutos`
          : `Intentos restantes: ${res.attempts_left}`;
      toast({ title: 'Código incorrecto', description: msg, variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Cambiar precio"
      footer={
        <Button onClick={apply} disabled={!canApply}>
          Aplicar
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Precio actual</label>
            <Input value={(item.overridePrice ?? item.precio).toFixed(2)} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Costo</label>
            <Input value={item.costo.toFixed(2)} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Nuevo precio</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Código de acceso</label>
            <Input
              type="password"
              value={code}
              onChange={e => setCode(e.target.value)}
              disabled={locked}
            />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Utilidad: ${profit.toFixed(2)} ({margin.toFixed(2)}%)
          {belowCost && (
            <Badge variant="destructive" className="ml-2">
              Precio bajo costo
            </Badge>
          )}
        </div>
        {locked && (
          <p className="text-sm text-destructive">
            Se desbloquea en {remainingTime}
          </p>
        )}
      </div>
    </AppModal>
  );
}
