import { useState, useEffect } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

export interface TableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: ReactNode;
  striped?: boolean;
  hoverable?: boolean;
  stickyHeader?: boolean;
  size?: 'sm' | 'md';
  onRowClick?: (row: T) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

function compareValues(a: unknown, b: unknown) {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  striped = true,
  hoverable = true,
  stickyHeader = false,
  size = 'md',
  onRowClick,
  pagination,
  className,
  ...props
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setSortKey(null);
  }, [data.length]);

  const sorted = (() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const accessor = (row: T) => {
      return (row as any)[col.key];
    };
    const arr = [...data].sort((a, b) => compareValues(accessor(a), accessor(b)));
    return sortDir === 'asc' ? arr : arr.reverse();
  })();

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const cellPadding = size === 'sm' ? 'px-3 py-1.5' : 'px-3 py-2.5';
  const headerPadding = size === 'sm' ? 'px-3 py-2' : 'px-3 py-2.5';

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 0;

  return (
    <div
      className={cn(
        'w-full overflow-hidden border border-[var(--ui-border)] rounded-[var(--ui-radius-lg)]',
        'bg-[var(--ui-surface)] shadow-[var(--ui-shadow-1)]',
        className,
      )}
      {...props}
    >
      <div className="overflow-x-auto ui-scroll">
        <table className="w-full border-collapse" role="table">
          <thead
            className={cn(
              'bg-[var(--ui-bg-subtle)] text-[var(--ui-text-secondary)]',
              'text-[var(--ui-text-xs)] font-semibold uppercase tracking-[var(--ui-tracking-wide)]',
              stickyHeader && 'sticky top-0 z-[var(--ui-z-sticky)]',
            )}
          >
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width, textAlign: col.align ?? 'left' }}
                    className={cn(
                      headerPadding,
                      'border-b border-[var(--ui-border)] whitespace-nowrap',
                      col.sortable &&
                        'cursor-pointer select-none hover:text-[var(--ui-text-primary)]',
                    )}
                    onClick={() => handleSort(col)}
                    aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'text-[10px] transition-opacity',
                            isSorted ? 'opacity-100' : 'opacity-30',
                          )}
                        >
                          {isSorted && sortDir === 'desc' ? '▼' : '▲'}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody aria-busy={loading || undefined} className="text-[var(--ui-text-sm)]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-[var(--ui-border)]">
                  {columns.map((col) => (
                    <td key={col.key} className={cellPadding}>
                      <div className="h-3 w-full max-w-[120px] rounded-[var(--ui-radius-xs)] bg-[var(--ui-bg-subtle)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-[var(--ui-text-secondary)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-[var(--ui-border)] last:border-b-0',
                    'transition-colors duration-[var(--ui-duration-fast)]',
                    striped && i % 2 === 1 && 'bg-[var(--ui-bg-subtle)]/50',
                    hoverable && 'hover:bg-[var(--ui-surface-hover)]',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => {
                    const value = col.render ? col.render(row, i) : (row as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          cellPadding,
                          'text-[var(--ui-text-primary)]',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className,
                        )}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 px-3 py-2',
            'border-t border-[var(--ui-border)] bg-[var(--ui-bg-subtle)]',
            'text-[var(--ui-text-xs)] text-[var(--ui-text-secondary)]',
          )}
        >
          <span>
            Página <strong className="text-[var(--ui-text-primary)]">{pagination.page}</strong> de{' '}
            <strong className="text-[var(--ui-text-primary)]">{totalPages}</strong> ·{' '}
            {pagination.total} registro{pagination.total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className={cn(
                'h-7 px-2.5 rounded-[var(--ui-radius-sm)] border border-[var(--ui-border)]',
                'hover:bg-[var(--ui-surface)] disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.page + 1))}
              disabled={pagination.page >= totalPages}
              className={cn(
                'h-7 px-2.5 rounded-[var(--ui-radius-sm)] border border-[var(--ui-border)]',
                'hover:bg-[var(--ui-surface)] disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

Table.displayName = 'Table';
