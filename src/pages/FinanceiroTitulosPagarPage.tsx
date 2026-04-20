import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal';

export default function FinanceiroTitulosPagarPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [suppliersMap, setSuppliersMap] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [baixaModal, setBaixaModal] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.financeiro.titulosPagar.list({ page: p, perPage });
      let dataRows: any[] = [];
      if (Array.isArray(res)) {
        dataRows = res;
        setTotal(res.length);
      } else {
        dataRows = res.rows || [];
        setTotal(res.total || 0);
      }
      setRows(dataRows);

      const suppliers = await api.suppliers.list();
      const map: Record<string,string> = {};
      (suppliers || []).forEach((s: any) => { map[s.id] = s.nome || s.name || `${s.id}`; });
      setSuppliersMap(map);
      
      const cts = await api.financeiro.contasInternas.list();
      setContas(cts || []);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar títulos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const doBaixar = (titulo: any) => {
    setBaixaModal(titulo);
  };

  const confirmarBaixa = async () => {
    try {
      const contaId = (document.getElementById('conta-interna-id') as HTMLSelectElement).value;
      if (!contaId) throw new Error('Selecione uma conta');
      
      await api.financeiro.titulosPagar.baixar(baixaModal.id, {
        valor_baixa: baixaModal.valor_aberto,
        conta_interna_id: contaId,
        data_baixa: new Date()
      });
      alert('Pagamento registrado com sucesso!');
      setBaixaModal(null);
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar pagamento');
    }
  };

  const doDelete = async (id: string) => {
    if (!confirm('Confirma exclusão (soft-delete) do título?')) return;
    try {
      await api.financeiro.titulosPagar.delete(id);
      alert('Título excluído');
      load(page);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Títulos a Pagar</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => alert('Wizard de Títulos a Pagar em desenvolvimento')}>Novo Título (Em breve)</button>
      </div>
      {loading ? <div>Carregando...</div> : (
      <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Número</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Fornecedor</th>
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
              <td style={{ padding: '8px 4px' }}>{suppliersMap[r.fornecedor_id] || r.fornecedor_id}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>{Number(r.valor_original).toFixed(2)}</td>
              <td style={{ padding: '8px 4px' }}>{new Date(r.data_vencimento).toLocaleDateString()}</td>
              <td style={{ padding: '8px 4px' }}>{r.status}</td>
              <td style={{ padding: '8px 4px' }}>
                <button onClick={() => doBaixar(r)} disabled={r.status === 'pago'}>Baixar</button>
                <button onClick={() => doDelete(r.id)}>Excluir</button>
              </td>
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
      </>
      )}
      
      <Modal isOpen={!!baixaModal} onClose={() => setBaixaModal(null)} title="Registrar Pagamento">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <p>Valor: <strong>R$ {baixaModal?.valor_aberto}</strong></p>
          <p>Vencimento: {baixaModal ? new Date(baixaModal.data_vencimento).toLocaleDateString() : ''}</p>
          
          <label>Conta para Pagamento</label>
          <select id="conta-interna-id" className="input-base w-full">
            <option value="">Selecione...</option>
            {contas.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome} (Saldo: {Number(c.saldo_atual).toFixed(2)})</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setBaixaModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={confirmarBaixa}>Confirmar Pagamento</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
