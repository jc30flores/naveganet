import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number; // 1-based
  pageCount: number; // total páginas
  onPageChange: (p: number) => void;
  className?: string;
  siblingCount?: number;
  boundaryCount?: number;
};

export default function Pagination({
  page,
  pageCount,
  onPageChange,
  className = "",
  siblingCount = 1,
  boundaryCount = 1,
}: Props) {
  if (pageCount <= 1) return null;

  const itemBase =
    "h-9 min-w-9 px-3 inline-flex items-center justify-center rounded-xl border text-sm " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 " +
    "disabled:opacity-50 disabled:pointer-events-none";
  const inactive =
    "bg-white dark:bg-neutral-900 border-black/5 dark:border-white/10 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800";
  const active =
    "bg-amber-400 dark:bg-amber-500 text-black dark:text-white border-transparent shadow-md font-medium " +
    "hover:bg-amber-500 dark:hover:bg-amber-600";

  const Item = (
    label: React.ReactNode,
    target: number | undefined,
    disabled = false,
    isActive = false,
    ariaLabel?: string,
    extra = "",
  ) => (
    <button
      type="button"
      aria-label={
        ariaLabel ??
        (typeof label === "number" || typeof label === "string" ? `Página ${label}` : undefined)
      }
      aria-current={isActive ? "page" : undefined}
      disabled={disabled}
      onClick={() => target && onPageChange(target)}
      className={`${itemBase} ${isActive ? active : inactive} ${extra}`}
    >
      {label}
    </button>
  );

  const range = (start: number, end: number) => {
    const res: number[] = [];
    for (let i = start; i <= end; i++) res.push(i);
    return res;
  };

  const startPages = range(1, Math.min(boundaryCount, pageCount));
  const endPages = range(
    Math.max(pageCount - boundaryCount + 1, boundaryCount + 1),
    pageCount,
  );

  const siblingsStart = Math.max(
    Math.min(
      page - siblingCount,
      pageCount - boundaryCount - siblingCount * 2 - 1,
    ),
    boundaryCount + 2,
  );

  const siblingsEnd = Math.min(
    Math.max(
      page + siblingCount,
      boundaryCount + siblingCount * 2 + 2,
    ),
    endPages.length > 0 ? endPages[0] - 2 : pageCount - 1,
  );

  const itemList: (number | "ellipsis")[] = [
    ...startPages,
    ...(siblingsStart > boundaryCount + 2
      ? ["ellipsis"]
      : boundaryCount + 1 < pageCount - boundaryCount
      ? [boundaryCount + 1]
      : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < pageCount - boundaryCount - 1
      ? ["ellipsis"]
      : pageCount - boundaryCount > boundaryCount
      ? [pageCount - boundaryCount]
      : []),
    ...endPages,
  ];

  return (
    <nav aria-label="Paginación" className={`w-full ${className}`}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {Item(
            <ChevronLeft className="h-4 w-4" />,
            page - 1,
            page === 1,
            false,
            "Página anterior",
            "px-2",
          )}
        </li>
        {itemList.map((p, i) =>
          typeof p === 'number' ? (
            <li key={`p-${p}`}>{Item(p, p, false, p === page)}</li>
          ) : (
            <li key={`e-${i}`} className="px-2 text-muted-foreground">
              …
            </li>
          ),
        )}
        <li>
          {Item(
            <ChevronRight className="h-4 w-4" />,
            page + 1,
            page === pageCount,
            false,
            "Página siguiente",
            "px-2",
          )}
        </li>
      </ul>
    </nav>
  );
}
