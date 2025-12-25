import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchClientes } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';

interface Customer {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  doc: string;
}

interface Selected {
  id: number | null;
  name: string;
  isGeneral: boolean;
}

interface Props {
  saleType: 'DIRECT' | 'CREDIT';
  customer: Selected;
  onChange: (c: Selected) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function StepCustomerSelector({ saleType, customer, onChange, onBack, onContinue }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (saleType === 'CREDIT' && customer.isGeneral) {
      onChange({ id: null, name: '', isGeneral: false });
    }
  }, [saleType]);

  useEffect(() => {
    if (customer.isGeneral) {
      setResults([]);
      return;
    }
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const handler = setTimeout(() => {
      searchClientes(query.trim(), ac.signal)
        .then(r => {
          setResults(r);
          setLoading(false);
          setHighlight(-1);
        })
        .catch(e => {
          if (e.name !== 'AbortError') {
            setError(e.message);
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      ac.abort();
      clearTimeout(handler);
    };
  }, [query, customer.isGeneral]);

  const select = (c: Customer) => {
    onChange({ id: c.id, name: c.nombre, isGeneral: false });
    setQuery(c.nombre);
    setResults([]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && results[highlight]) {
        select(results[highlight]);
      }
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      setHighlight(-1);
    }
  };

  const handleContinue = () => {
    if (saleType === 'CREDIT' && !customer.id) {
      toast({
        title: 'Debe seleccionar un cliente registrado',
        variant: 'destructive',
      });
      return;
    }
    onContinue();
  };

  const disableContinue =
    saleType === 'CREDIT' ? !customer.id : !customer.isGeneral && !customer.id;

  return (
    <div className="space-y-4">
      {saleType === 'CREDIT' && (
        <Alert>
          <AlertDescription>
            Venta a crédito: Debe seleccionar un CLIENTE REGISTRADO. Si el cliente no está
            registrado, créelo antes en la página Clientes.
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <div className="flex gap-2">
          {saleType === 'DIRECT' && (
            <Button
              variant={customer.isGeneral ? 'default' : 'outline'}
              onClick={() => {
                onChange({ id: null, name: 'Cliente General', isGeneral: true });
                setQuery('');
                setResults([]);
              }}
            >
              Cliente General
            </Button>
          )}
          <Button
            variant={!customer.isGeneral ? 'default' : 'outline'}
            onClick={() => {
              onChange({ id: null, name: '', isGeneral: false });
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
          >
            Cliente Registrado
          </Button>
        </div>
        {!customer.isGeneral && (
          <div className="space-y-2">
            <Input
              ref={inputRef}
              placeholder={
                saleType === 'CREDIT'
                  ? 'Nombre del cliente (obligatorio)'
                  : 'Nombre del cliente'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
            />
            <div className="max-h-[240px] overflow-y-auto border border-border rounded-md" style={{ scrollbarGutter: 'stable both-edges' }}>
              {loading && (
                <div className="px-2 py-1 text-sm text-muted-foreground">Buscando...</div>
              )}
              {error && <div className="px-2 py-1 text-sm text-destructive">{error}</div>}
              {!loading && !error && results.length === 0 && query.trim().length >= 2 && (
                <div className="px-2 py-1 text-sm text-muted-foreground">Sin resultados</div>
              )}
              {results.map((c, idx) => (
                <button
                  key={c.id}
                  className={`w-full text-left px-2 py-1 text-sm hover:bg-muted ${
                    idx === highlight ? 'bg-muted' : ''
                  }`}
                  onMouseDown={e => {
                    e.preventDefault();
                    select(c);
                  }}
                >
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {[c.telefono, c.email, c.doc].filter(Boolean).join(' · ')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t border-border flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={handleContinue} disabled={disableContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
