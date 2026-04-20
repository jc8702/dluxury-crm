import React, { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal';
import { api } from '../lib/api';

const FinanceiroCondicoesPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', parcelas: 1, entrada_percentual: 0, juros_percentual: 0 });

  const fetch = async () => { setLoading(true); try { const res = await api.financeiro.condicoesPagamento.list(); setItems(res || []); } catch(e) { console.error(e); } setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: '', descricao: '', parcelas: 1, entrada_percentual: 0, juros_percentual: 0 }); setIsOpen(true); };
  const openEdit = (f: any) => { setEditing(f); setForm({ nome: f.nome, descricao: f.descricao, parcelas: f.parcelas, entrada_percentual: f.entrada_percentual, juros_percentual: f.juros_percentual }); setIsOpen(true); };

  const save = async () => { try { if (editing) await api.financeiro.condicoesPagamento.update({ id: editing.id, ...form }); else await api.financeiro.condicoesPagamento.create(form); setIsOpen(false); fetch(); } catch(e: any) { alert(e.message || 'Erro'); } };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Condições de Pagamento</h2>
        <div>
          <button className="btn" onClick={() => fetch()} style={{ marginRight: '0.5rem' }}>Atualizar</button>
          <button className="btn btn-primary" onClick={openNew}>Nova Condição</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: '2rem' }}>Carregando...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem' }}>Nome</th>
                <th style={{ padding: '0.75rem' }}>Parcelas</th>
                <th style={{ padding: '0.75rem' }}>Entrada %</th>
                <th style={{ padding: '0.75rem' }}>Juros %</th>
                <th style={{ padding: '0.75rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{f.nome}</td>
                  <td style={{ padding: '0.75rem' }}>{f.parcelas}</td>
                  <td style={{ padding: '0.75rem' }}>{Number(f.entrada_percentual || 0).toFixed(2)}%</td>
                  <td style={{ padding: '0.75rem' }}>{Number(f.juros_percentual || 0).toFixed(2)}%</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button className="btn" onClick={() => openEdit(f)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Editar Condição' : 'Nova Condição'}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label className="label">Nome</label>
            <input className="input-base w-full" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
          </div>
          <div>
            <label className="label">Descrição</label>
            <input className="input-base w-full" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <input className="input-base" placeholder="Parcelas" value={form.parcelas} onChange={e => setForm({...form, parcelas: Number(e.target.value)})} />
            <input className="input-base" placeholder="Entrada %" value={form.entrada_percentual} onChange={e => setForm({...form, entrada_percentual: Number(e.target.value)})} />
            <input className="input-base" placeholder="Juros %" value={form.juros_percentual} onChange={e => setForm({...form, juros_percentual: Number(e.target.value)})} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save}>Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinanceiroCondicoesPage;
