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
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }} role="table" aria-label="Tabela de dados">
        <thead>
          <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
            {headers.map((h, idx) => (
              <th key={idx} style={{ padding: '1rem', fontWeight: '600' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody style={{ background: 'var(--surface)' }} aria-live="polite" aria-busy={loading}>
          {loading ? (
            <TableSkeleton rows={4} cols={headers.length} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ padding: '2rem' }}>
                <div className="empty-state" style={{ border: 'none', background: 'transparent' }}>
                  {emptyMessage}
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                {renderRow(item)}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <style>{`
        .table-row-hover:hover { background: var(--surface-hover); }
      `}</style>
    </div>
  );
};

export default DataTable;

