import { Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ description: "Copiado" });
    } catch {
      toast({ description: "Error al copiar", variant: "destructive" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copiar"
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30",
        className
      )}
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}

export default CopyButton;
