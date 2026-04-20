import React, { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal';
import { api } from '../lib/api';

const FinanceiroContasPage: React.FC = () => {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', tipo: 'conta_corrente', banco_codigo: '', agencia: '', conta: '', saldo_inicial: 0 });
  const [extrato, setExtrato] = useState<any>(null);
  const [showExtrato, setShowExtrato] = useState(false);

  const fetch = async () => { setLoading(true); try { const res = await api.financeiro.contasInternas.list(); setContas(res || []); } catch(e) { console.error(e); } setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: '', tipo: 'conta_corrente', banco_codigo: '', agencia: '', conta: '', saldo_inicial: 0 }); setIsOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ nome: c.nome, tipo: c.tipo, banco_codigo: c.banco_codigo, agencia: c.agencia, conta: c.conta, saldo_inicial: c.saldo_inicial }); setIsOpen(true); };

  const save = async () => {
    try {
      if (editing) await api.financeiro.contasInternas.update({ id: editing.id, ...form });
      else await api.financeiro.contasInternas.create(form);
      setIsOpen(false); fetch();
    } catch (e: any) { alert(e.message || 'Erro'); }
  };

  const openExtrato = async (id: string) => {
    try {
      const res = await fetch(`/api/financeiro/contas-internas/extrato?id=${id}`);
      const json = await res.json();
      setExtrato(json);
      setShowExtrato(true);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Contas Internas</h2>
        <div>
          <button className="btn" onClick={() => fetch()} style={{ marginRight: '0.5rem' }}>Atualizar</button>
          <button className="btn btn-primary" onClick={openNew}>Nova Conta</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: '2rem' }}>Carregando...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem' }}>Nome</th>
                <th style={{ padding: '0.75rem' }}>Tipo</th>
                <th style={{ padding: '0.75rem' }}>Saldo Atual</th>
                <th style={{ padding: '0.75rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {contas.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{c.nome}</td>
                  <td style={{ padding: '0.75rem' }}>{c.tipo}</td>
                  <td style={{ padding: '0.75rem' }}>R$ {Number(c.saldo_atual || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button className="btn" onClick={() => openEdit(c)} style={{ marginRight: '0.5rem' }}>Editar</button>
                    <button className="btn" onClick={() => openExtrato(c.id)} style={{ marginRight: '0.5rem' }}>Extrato</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Editar Conta' : 'Nova Conta'}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label className="label">Nome</label>
            <input className="input-base w-full" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="label">Tipo</label>
              <select className="input-base w-full" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="conta_corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="caixa">Caixa</option>
                <option value="aplicacao">Aplicação</option>
              </select>
            </div>
            <div>
              <label className="label">Banco</label>
              <input className="input-base w-full" value={form.banco_codigo} onChange={e => setForm({...form, banco_codigo: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input className="input-base" placeholder="Agência" value={form.agencia} onChange={e => setForm({...form, agencia: e.target.value})} />
            <input className="input-base" placeholder="Conta" value={form.conta} onChange={e => setForm({...form, conta: e.target.value})} />
          </div>
          <div>
            <label className="label">Saldo Inicial</label>
            <input type="number" className="input-base w-full" value={form.saldo_inicial} onChange={e => setForm({...form, saldo_inicial: Number(e.target.value)})} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>Salvar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showExtrato} onClose={() => setShowExtrato(false)} title={`Extrato`}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h4>Movimentações</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {extrato?.movimentacoes?.map((m: any) => (
                <div key={m.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: '700' }}>{m.descricao}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(m.data_movimento).toLocaleDateString()} — R$ {Number(m.valor).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h4>Baixas</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {extrato?.baixas?.map((b: any) => (
                <div key={b.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: '700' }}>Baixa — R$ {Number(b.valor_baixa).toFixed(2)}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(b.data_baixa).toLocaleDateString()} — {b.observacoes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinanceiroContasPage;
