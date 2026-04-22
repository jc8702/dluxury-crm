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

      <Modal isOpen={showExtrato} onClose={() => setShowExtrato(false)} title={`Extrato Detalhado: ${extrato?.conta?.nome || ''}`} width="900px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Saldo Inicial</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>R$ {Number(extrato?.saldo_inicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Saldo Atual</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>R$ {Number(extrato?.conta?.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-outline" onClick={() => window.print()} style={{ fontSize: '0.8rem' }}>Imprimir PDF</button>
            </div>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zSelf: 10 }}>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem' }}>Data</th>
                  <th style={{ padding: '0.75rem' }}>Descrição</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {extrato?.extrato?.map((m: any) => {
                  const isPositive = Number(m.valor) > 0;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '0.75rem', opacity: 0.8 }}>{new Date(m.data).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 500 }}>{m.descricao || (m.tipo === 'recebimento' ? 'Recebimento de Título' : 'Pagamento de Título')}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase' }}>{m.origem} • {m.tipo}</div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: isPositive ? '#10b981' : '#ef4444' }}>
                        {isPositive ? '+' : ''} {Number(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        R$ {Number(m.saldo_momento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {(!extrato?.extrato || extrato.extrato.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>Nenhuma movimentação encontrada para esta conta.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setShowExtrato(false)}>Fechar Extrato</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinanceiroContasPage;
