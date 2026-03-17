interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
}

export function Pagination({
  total,
  limit,
  offset,
  onPageChange,
}: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const canGoPrev = offset > 0;
  const canGoNext = offset + limit < total;

  return (
    <div className="flex items-center justify-between rounded-b-lg border border-t-0 border-border bg-surface/40 px-3 py-3 md:px-4">
      <div className="text-xs text-muted sm:text-sm">
        {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onPageChange(offset - limit)}
          disabled={!canGoPrev}
          className="rounded border border-border bg-surface px-2.5 py-1 text-xs transition-colors hover:bg-surface-alt disabled:opacity-40 sm:px-3 sm:text-sm"
        >
          Prev
        </button>
        <span className="min-w-[4rem] text-center text-xs text-muted sm:text-sm">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(offset + limit)}
          disabled={!canGoNext}
          className="rounded border border-border bg-surface px-2.5 py-1 text-xs transition-colors hover:bg-surface-alt disabled:opacity-40 sm:px-3 sm:text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
