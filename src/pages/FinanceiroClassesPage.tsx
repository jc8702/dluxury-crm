import React, { useEffect, useState } from 'react';
import Modal from '../components/ui/Modal';
import { api } from '../lib/api';

const FinanceiroClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', tipo: 'analitica', natureza: 'credora', pai_id: '', permite_lancamento: true });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.financeiro.classes.list();
      setClasses(res || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => { setEditing(null); setForm({ codigo: '', nome: '', tipo: 'analitica', natureza: 'credora', pai_id: '', permite_lancamento: true }); setIsOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ codigo: c.codigo, nome: c.nome, tipo: c.tipo, natureza: c.natureza, pai_id: c.pai_id || '', permite_lancamento: c.permite_lancamento }); setIsOpen(true); };

  const save = async () => {
    try {
      if (editing) {
        await api.financeiro.classes.update({ id: editing.id, ...form });
      } else {
        await api.financeiro.classes.create(form);
      }
      setIsOpen(false);
      fetch();
    } catch (e: any) { alert(e.message || 'Erro'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Confirma exclusão da classe?')) return;
    try { await api.financeiro.classes.delete(id); fetch(); } catch (e: any) { alert(e.message || 'Erro'); }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Classes Financeiras</h2>
        <div>
          <button className="btn" onClick={() => fetch()} style={{ marginRight: '0.5rem' }}>Atualizar</button>
          <button className="btn btn-primary" onClick={openNew}>Nova Classe</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: '2rem' }}>Carregando...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem' }}>Código</th>
                <th style={{ padding: '0.75rem' }}>Nome</th>
                <th style={{ padding: '0.75rem' }}>Tipo</th>
                <th style={{ padding: '0.75rem' }}>Natureza</th>
                <th style={{ padding: '0.75rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{c.codigo}</td>
                  <td style={{ padding: '0.75rem' }}>{c.nome}</td>
                  <td style={{ padding: '0.75rem' }}>{c.tipo}</td>
                  <td style={{ padding: '0.75rem' }}>{c.natureza}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button className="btn" onClick={() => openEdit(c)} style={{ marginRight: '0.5rem' }}>Editar</button>
                    <button className="btn btn-danger" onClick={() => remove(c.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Editar Classe' : 'Nova Classe'}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label className="label">Código</label>
            <input className="input-base w-full" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} />
          </div>
          <div>
            <label className="label">Nome</label>
            <input className="input-base w-full" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="label">Tipo</label>
              <select className="input-base w-full" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="sintetica">Sintética</option>
                <option value="analitica">Analítica</option>
              </select>
            </div>
            <div>
              <label className="label">Natureza</label>
              <select className="input-base w-full" value={form.natureza} onChange={e => setForm({...form, natureza: e.target.value})}>
                <option value="credora">Credora (Receita)</option>
                <option value="devedora">Devedora (Despesa)</option>
              </select>
            </div>
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

export default FinanceiroClassesPage;
