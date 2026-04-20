import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function FinanceiroTitulosReceberPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [clientsMap, setClientsMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.financeiro.titulosReceber.list({ page: p, perPage });
      // compatibilidade: suporta { rows, page, perPage, total } ou array
      let dataRows: any[] = [];
      if (Array.isArray(res)) {
        dataRows = res;
        setTotal(res.length);
      } else {
        dataRows = res.rows || [];
        setPage(res.page || 1);
        setPerPage(res.perPage || 20);
        setTotal(res.total || 0);
      }
      setRows(dataRows);

      // buscar clientes para mapear nomes (opcional)
      const clients = await api.clients.list();
      const map: Record<string,string> = {};
      (clients || []).forEach((c: any) => { map[c.id] = c.nome || c.name || `${c.id}`; });
      setClientsMap(map);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar títulos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const doDelete = async (id: string) => {
    if (!confirm('Confirma exclusão (soft-delete) do título?')) return;
    await api.financeiro.titulosReceber.list; // ensure API available
    try {
      await apiCallDelete(id);
      alert('Título excluído');
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const apiCallDelete = async (id: string) => {
    const url = `/api/financeiro/titulos-receber?id=${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha API');
    return await res.json();
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Títulos a Receber</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => window.location.hash = '#/financeiro/titulos-receber/wizard'}>Novo (Wizard)</button>
      </div>
      {loading ? <div>Carregando...</div> : (
      <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Número</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Cliente</th>
            <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Valor</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Vencimento</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ padding: '8px 4px' }}>{r.numero_titulo}</td>
              <td style={{ padding: '8px 4px' }}>{clientsMap[r.cliente_id] || r.cliente_id}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>{Number(r.valor_original).toFixed(2)}</td>
              <td style={{ padding: '8px 4px' }}>{new Date(r.data_vencimento).toLocaleDateString()}</td>
              <td style={{ padding: '8px 4px' }}>{r.status}</td>
              <td style={{ padding: '8px 4px' }}><button onClick={() => doDelete(r.id)}>Excluir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12 }}>
        <button disabled={page<=1} onClick={() => setPage(page-1)}>Anterior</button>
        <span style={{ margin: '0 8px' }}>Página {page}</span>
        <button disabled={(page*perPage)>=total} onClick={() => setPage(page+1)}>Próxima</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <span>Total: {total}</span>
      </div>
      </>)}
    </div>
  );
}
