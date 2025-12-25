import { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent
        className="fixed inset-0 z-50 m-0 flex max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-none bg-background/95 p-4 shadow-none"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
