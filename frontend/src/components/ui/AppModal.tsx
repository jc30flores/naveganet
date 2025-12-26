import { ReactNode, useId } from 'react'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface AppModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  className?: string
  dismissible?: boolean
}

export default function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  dismissible = true,
}: AppModalProps) {
  const descId = useId()
  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismissible && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogContent
          aria-describedby={description ? descId : undefined}
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[min(560px,90vw)] max-h-[85svh] sm:max-h-[85vh] overflow-hidden rounded-2xl sm:rounded-2xl border border-border bg-background text-foreground shadow-2xl ring-1 ring-primary/15 data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 flex flex-col text-base md:text-lg',
            className,
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {(title || description) && (
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-border">
              {title && (
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-wide text-foreground">
                  {title}
                </DialogTitle>
              )}
              {description && (
                <DialogDescription id={descId} className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </DialogDescription>
              )}
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4" style={{ scrollbarGutter: 'stable both-edges' }}>
            {children}
          </div>
          {footer && (
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t border-border">
              {footer}
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

