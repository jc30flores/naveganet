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
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[min(560px,90vw)] max-h-[85svh] sm:max-h-[85vh] overflow-x-visible overflow-y-auto rounded-2xl sm:rounded-2xl border border-border bg-background text-foreground shadow-2xl ring-1 ring-primary/15 data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 px-4 sm:px-6 py-4 text-base md:text-lg',
            className,
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', scrollbarGutter: 'stable both-edges' }}
        >
          {(title || description) && (
            <div className="sticky top-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-b border-border">
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
          <div className="space-y-4">{children}</div>
          {footer && (
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t border-border">
              {footer}
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

