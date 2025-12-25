import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Maximize2 } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/utils";

interface FieldValueProps {
  label: string;
  value?: string | null;
  mono?: boolean;
  copy?: boolean;
  className?: string;
}

export function FieldValue({ label, value, mono, copy, className }: FieldValueProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > el.clientWidth);
  }, [value]);

  return (
    <div className={cn("group min-w-0 rounded-2xl border border-border bg-card p-3", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span
          ref={spanRef}
          title={overflowing ? value || undefined : undefined}
          className={cn(
            "block min-w-0 font-medium text-foreground pr-1",
            mono && "font-mono",
            overflowing && "truncate sm:whitespace-nowrap sm:text-ellipsis"
          )}
          style={
            overflowing
              ? { WebkitMaskImage: "linear-gradient(90deg,#000 85%,transparent)" }
              : undefined
          }
        >
          {value || "-"}
        </span>
        {value && overflowing && (
          <Popover>
            <PopoverTrigger
              aria-label="Ver completo"
              className="ml-auto rounded opacity-0 transition group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Maximize2 className="h-4 w-4" />
              <span className="sr-only">Ver completo</span>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(92vw,40rem)] max-h-[70svh] overflow-y-auto bg-popover text-popover-foreground border border-border"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                {copy && <CopyButton text={value} />}
              </div>
              <p className="break-words whitespace-pre-wrap font-medium">{value}</p>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

export default FieldValue;
