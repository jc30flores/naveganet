import { useState, useEffect } from 'react';
import AppModal from '@/components/ui/AppModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, API_BASE } from '@/lib/api';
import StepCustomerSelector from './StepCustomerSelector';
import { toast } from '@/components/ui/use-toast';
import { CheckCircle2, X } from 'lucide-react';

import type { POSCartItem } from './pos/CartItem';

interface CheckoutWizardProps {
  open: boolean;
  onClose: () => void;
  items: POSCartItem[];
  total: number;
  onSuccess?: (saleData?: { id: number; total: number; saleType: string }) => void;
  onCloseParent?: () => void; // Para cerrar el modal padre cuando se muestra la confirmación
}

interface CheckoutState {
  saleType: 'DIRECT' | 'CREDIT';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  customer: { id: number | null; name: string; isGeneral: boolean };
  total: number;
  paidAmount: number;
  changeDue: number;
  reference: string;
}

export default function CheckoutWizard({ open, onClose, items, total, onSuccess, onCloseParent }: CheckoutWizardProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<CheckoutState>({
    saleType: 'DIRECT',
    paymentMethod: 'CASH',
    customer: { id: null, name: 'Cliente General', isGeneral: true },
    total,
    paidAmount: 0,
    changeDue: 0,
    reference: '',
  });
  const [creditAmount, setCreditAmount] = useState('0');
  const creditNumber = parseFloat(creditAmount) || 0;
  const [saleSuccess, setSaleSuccess] = useState<{ id: number; total: number; saleType: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await fetch(`${API_BASE}/csrf/`, { credentials: 'include' });
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    setState(prev => ({ ...prev, total }));
  }, [total]);

  useEffect(() => {
    if (state.saleType === 'DIRECT') {
      if (state.paymentMethod === 'CASH') {
        setState(prev => ({ ...prev, paidAmount: 0, changeDue: 0 }));
      } else {
        setState(prev => ({ ...prev, paidAmount: prev.total, changeDue: 0 }));
      }
    } else {
      setState(prev => ({ ...prev, paidAmount: 0, changeDue: 0 }));
    }
  }, [state.paymentMethod, state.saleType, state.total]);

  useEffect(() => {
    if (state.saleType === 'CREDIT') {
      setCreditAmount(String(state.paidAmount));
    }
  }, [state.saleType, state.paidAmount]);


  const next = () => setStep(s => Math.min(s + 1, 5));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const cancel = () => {
    onClose();
    setStep(1);
    setState({
      saleType: 'DIRECT',
      paymentMethod: 'CASH',
      customer: { id: null, name: 'Cliente General', isGeneral: true },
      total,
      paidAmount: 0,
      changeDue: 0,
      reference: '',
    });
    setCreditAmount('0');
  };

  const finalize = async (override?: Partial<CheckoutState>) => {
    const s = { ...state, ...override };
    setIsSubmitting(true);
    try {
      const payload: any = {
        saleType: s.saleType,
        paymentMethod: s.paymentMethod,
        customerId: s.customer.id,
        items: items.map(i => ({
          productId: i.id,
          qty: i.cantidad,
          unit_price: i.overridePrice ?? i.precio,
          override: Boolean(i.overridePrice),
          isUsed: false,
        })),
        totals: { total: s.total },
        paidAmount: s.paidAmount,
        changeDue: s.changeDue,
        reference: s.reference,
      };
      if (s.saleType === 'CREDIT') {
        payload.observaciones = s.reference;
      }
      const response = await api.posCheckout(payload);
      setIsSubmitting(false);
      // Preparar datos de la venta para la confirmación
      const saleData = {
        id: response.id,
        total: s.total,
        saleType: s.saleType,
      };
      // Cerrar el modal del checkout primero
      cancel();
      // Cerrar el modal padre también para que no se vea por detrás de la confirmación
      onCloseParent?.();
      // Mostrar confirmación localmente
      setSaleSuccess(saleData);
      // Pasar los datos al callback para que el componente padre también muestre la confirmación
      setTimeout(() => {
        onSuccess?.(saleData);
      }, 150);
    } catch (e: unknown) {
      setIsSubmitting(false);
      const message = e instanceof Error ? e.message : String(e);
      toast({ 
        title: 'Error al registrar venta', 
        description: message, 
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleSuccessClose = () => {
    // Cerrar el modal de confirmación local
    setSaleSuccess(null);
    // El callback ya fue llamado cuando se registró la venta
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return {
          title: 'Tipo de Venta',
          content: (
            <div className="flex gap-2">
              <Button
                variant={state.saleType === 'DIRECT' ? 'default' : 'outline'}
                onClick={() =>
                  setState(prev => ({
                    ...prev,
                    saleType: 'DIRECT',
                    customer: { id: null, name: 'Cliente General', isGeneral: true },
                  }))
                }
              >
                Venta Directa
              </Button>
              <Button
                variant={state.saleType === 'CREDIT' ? 'default' : 'outline'}
                onClick={() =>
                  setState(prev => ({
                    ...prev,
                    saleType: 'CREDIT',
                    customer: { id: null, name: '', isGeneral: false },
                  }))
                }
              >
                Venta a Crédito
              </Button>
            </div>
          ),
          footer: <Button onClick={next}>Continuar</Button>,
        };
      case 2:
        return {
          title: 'Método de Pago',
          content: (
            <div className="flex gap-2 flex-wrap">
              {(['CASH', 'CARD', 'TRANSFER'] as const).map(pm => (
                <Button
                  key={pm}
                  variant={state.paymentMethod === pm ? 'default' : 'outline'}
                  onClick={() => setState(prev => ({ ...prev, paymentMethod: pm }))}
                >
                  {{ CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' }[pm]}
                </Button>
              ))}
            </div>
          ),
          footer: (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={back}>Atrás</Button>
              <Button onClick={next}>Continuar</Button>
            </div>
          ),
        };
      case 3:
        return {
          title: 'Cliente',
          content: (
            <StepCustomerSelector
              saleType={state.saleType}
              customer={state.customer}
              onChange={c => setState(prev => ({ ...prev, customer: c }))}
              onBack={back}
              onContinue={next}
            />
          ),
        };
      case 4:
        if (state.saleType === 'CREDIT') {
          return {
            title: 'Venta al crédito',
            content: (
              <div className="space-y-2">
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={state.total}
                    value={creditAmount}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
                        if (val === '' || parseFloat(val) <= state.total) {
                          setCreditAmount(val);
                        }
                      }
                    }}
                    onFocus={e => {
                      e.target.select();
                      if (e.target.value === '0' || e.target.value === '0.00') {
                        setCreditAmount('');
                      }
                    }}
                    onBlur={e => {
                      if (e.target.value === '') setCreditAmount('0');
                    }}
                    placeholder="Abono inicial"
                    autoFocus
                  />
                </div>
                {creditNumber > 0 && (
                  <div>Saldo restante: ${(state.total - creditNumber).toFixed(2)}</div>
                )}
                <Textarea
                  placeholder="Observaciones (opcional)"
                  value={state.reference}
                  onChange={e => setState(prev => ({ ...prev, reference: e.target.value }))}
                  rows={3}
                  className="w-full text-base"
                />
              </div>
            ),
            footer: (
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={cancel}>Cancelar</Button>
                <Button
                  onClick={() => {
                    const paid = Math.min(Math.max(creditNumber, 0), state.total);
                    finalize({ paidAmount: paid, changeDue: 0 });
                  }}
                >
                  Confirmar crédito
                </Button>
              </div>
            ),
          };
        }
        return {
          title: 'Cobro',
          content: (
            <div className="space-y-2 text-lg">
              <div>Total: ${state.total.toFixed(2)}</div>
              {state.paymentMethod === 'CASH' ? (
                <Input
                  autoFocus
                  type="number"
                  step="0.01"
                  placeholder="Monto recibido"
                  value={state.paidAmount === 0 ? '' : state.paidAmount}
                  onChange={e =>
                    setState(prev => {
                      const val = parseFloat(e.target.value);
                      return {
                        ...prev,
                        paidAmount: isNaN(val) ? 0 : val,
                        changeDue: Math.max((isNaN(val) ? 0 : val) - prev.total, 0),
                      };
                    })
                  }
                />
              ) : (
                <Input
                  placeholder="Referencia (opcional)"
                  value={state.reference}
                  onChange={e => setState(prev => ({ ...prev, reference: e.target.value }))}
                />
              )}
            </div>
          ),
          footer: (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={cancel}>Cancelar</Button>
              <Button
                onClick={() => {
                  setState(prev => ({ ...prev, changeDue: Math.max(prev.paidAmount - prev.total, 0) }));
                  next();
                }}
                disabled={state.paymentMethod === 'CASH' && state.saleType === 'DIRECT' && state.paidAmount < state.total}
              >
                Continuar
              </Button>
            </div>
          ),
        };
      case 5:
        return {
          title: 'Confirmación',
          content: (
            <p className="text-lg text-foreground">Vuelto a entregar: ${state.changeDue.toFixed(2)}</p>
          ),
          footer: (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={cancel}>Cancelar</Button>
              <Button onClick={finalize}>Finalizar</Button>
            </div>
          ),
        };
      default:
        return { title: '', content: null };
    }
  };

  const { title, content, footer } = renderStep();

  return (
    <>
      <AppModal open={open} onClose={cancel} title={title} footer={footer}>
        {content}
        {isSubmitting && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Procesando venta...</p>
            </div>
          </div>
        )}
      </AppModal>

      {/* Modal de confirmación de venta exitosa - Este modal se maneja en el componente padre */}
    </>
  );
}

