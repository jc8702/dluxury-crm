import React from 'react';
import { TableSkeleton } from '../../design-system/components/Skeleton';

interface DataTableProps<T> {
  headers: string[];
  data: T[];
  renderRow: (item: T) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

const DataTable = <T,>({ headers, data, renderRow, emptyMessage = 'Nenhum registro encontrado.', loading = false }: DataTableProps<T>) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full border-collapse table-dense" role="table" aria-label="Tabela de dados">
        <thead>
          <tr className="text-left">
            {headers.map((h, idx) => (
              <th key={idx} className="px-4 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody aria-live="polite" aria-busy={loading}>
          {loading ? (
            <TableSkeleton rows={4} cols={headers.length} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-8">
                <div className="empty-state border-none bg-transparent">
                  {emptyMessage}
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={idx} className="transition-colors hover:bg-surface-hover group">
                {renderRow(item)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
