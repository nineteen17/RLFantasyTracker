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
    <div className="flex items-center justify-between border-t border-border pt-4">
      <div className="text-sm text-muted">
        Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}{" "}
        results
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(offset - limit)}
          disabled={!canGoPrev}
          className="rounded border border-border bg-surface px-3 py-1 text-sm hover:bg-surface-alt disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-3 py-1 text-sm text-muted">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(offset + limit)}
          disabled={!canGoNext}
          className="rounded border border-border bg-surface px-3 py-1 text-sm hover:bg-surface-alt disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
