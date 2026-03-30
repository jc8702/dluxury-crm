import React from 'react';

interface DataTableProps<T> {
  headers: string[];
  data: T[];
  renderRow: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

const DataTable = <T,>({ headers, data, renderRow, emptyMessage = 'Nenhum registro encontrado.' }: DataTableProps<T>) => {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
            {headers.map((h, idx) => (
              <th key={idx} style={{ padding: '1rem', fontWeight: '600' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody style={{ background: 'var(--surface)' }}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {emptyMessage}
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
