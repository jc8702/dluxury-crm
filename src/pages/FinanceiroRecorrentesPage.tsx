import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal';
import { 
  FiRepeat, FiPlus, FiTrash2, FiEdit2, FiCheckCircle, 
  FiXCircle, FiCalendar, FiDollarSign, FiPlay, FiSettings
} from 'react-icons/fi';

export default function FinanceiroRecorrentesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  
  // States para auxiliares
  const [classes, setClasses] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [formas, setFormas] = useState<any[]>([]);

  const [form, setForm] = useState({
    descricao: '',
    tipo: 'pagar',
    valor: 0,
    dia_vencimento: 1,
    classe_financeira_id: '',
    fornecedor_id: '',
    forma_pagamento_id: '',
    conta_bancaria_id: '',
    ativa: true
  });

  const [gerarModal, setGerarModal] = useState(false);
  const [gerarMes, setGerarMes] = useState(new Date().getMonth() + 1);
  const [gerarAno, setGerarAno] = useState(new Date().getFullYear());

  const normalizeList = (value: any) => (Array.isArray(value) ? value : value?.data || []);

  const load = async () => {
    setLoading(true);
    try {
      const [recsRes, clsRes, fornsRes, ctsRes, fmsRes] = await Promise.all([
        api.financeiro.contasRecorrentes.list(),
        api.financeiro.classesFinanceiras.list(),
        api.suppliers.list(),
        api.financeiro.contasInternas.list(),
        api.financeiro.formasPagamento.list()
      ]);
      setRows(normalizeList(recsRes));
      setClasses(normalizeList(clsRes));
      setFornecedores(normalizeList(fornsRes));
      setContas(normalizeList(ctsRes));
      setFormas(normalizeList(fmsRes));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({
      descricao: '',
      tipo: 'pagar',
      valor: 0,
      dia_vencimento: 1,
      classe_financeira_id: '',
      fornecedor_id: '',
      forma_pagamento_id: '',
      conta_bancaria_id: '',
      ativa: true
    });
    setIsOpen(true);
  };

  const handleEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r });
    setIsOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.financeiro.contasRecorrentes.update({ id: editing.id, ...form });
      } else {
        await api.financeiro.contasRecorrentes.create(form);
      }
      setIsOpen(false);
      load();
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar');
    }
  };

  const doDelete = async (id: string) => {
    if (!window.confirm('Excluir esta configuração de conta recorrente?')) return;
    try {
      await api.financeiro.contasRecorrentes.delete(id);
      load();
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir');
    }
  };

  const handleGerar = async () => {
    try {
      setLoading(true);
      await api.financeiro.contasRecorrentes.gerarMes(gerarMes, gerarAno);
      alert('Títulos gerados com sucesso no Contas a Pagar!');
      setGerarModal(false);
    } catch (e: any) {
      alert(e.message || 'Erro ao gerar títulos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container anim-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiRepeat style={{ color: 'var(--primary)' }} /> CONTAS RECORRENTES
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configuração de despesas fixas e geração automática mensal</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => setGerarModal(true)}>
            <FiPlay /> GERAR TÍTULOS DO MÊS
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <FiPlus /> NOVA CONFIGURAÇÃO
          </button>
        </div>
      </div>

      <div className="card glass" style={{ overflow: 'hidden' }}>
        <table className="table-base">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>STATUS</th>
              <th>DESCRIÇÃO / CONTA FIXA</th>
              <th>DIA VENC.</th>
              <th>CLASSE FINANCEIRA</th>
              <th>FORNECEDOR</th>
              <th style={{ textAlign: 'right' }}>VALOR ESTIMADO</th>
              <th style={{ width: '100px' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Nenhuma conta recorrente configurada.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center' }}>
                  {r.ativa ? (
                    <FiCheckCircle style={{ color: 'var(--success)', fontSize: '1.2rem' }} title="Ativa" />
                  ) : (
                    <FiXCircle style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }} title="Inativa" />
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>{r.descricao.toUpperCase()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.tipo === 'pagar' ? 'DESPESA FIXA' : 'RECEITA FIXA'}</div>
                </td>
                <td style={{ fontWeight: 600 }}>Todo dia {r.dia_vencimento}</td>
                <td>{classes.find(c => c.id === r.classe_financeira_id)?.nome || '---'}</td>
                <td>{fornecedores.find(f => f.id === r.fornecedor_id)?.nome || '---'}</td>
                <td style={{ textAlign: 'right', fontWeight: 900 }}>
                  R$ {Number(r.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleEdit(r)}><FiEdit2 /></button>
                    <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--danger)' }} onClick={() => doDelete(r.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Configuração */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? "Editar Recorrência" : "Nova Conta Recorrente"} width="600px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Descrição da Conta</label>
            <input 
              className="input-base" 
              placeholder="Ex: Aluguel, Internet, Pro-labore"
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Valor Mensal Estimado</label>
            <input 
              type="number"
              className="input-base" 
              value={form.valor}
              onChange={e => setForm({...form, valor: Number(e.target.value)})}
            />
          </div>

          <div className="form-group">
            <label>Dia de Vencimento</label>
            <input 
              type="number"
              min="1" max="31"
              className="input-base" 
              value={form.dia_vencimento}
              onChange={e => setForm({...form, dia_vencimento: Number(e.target.value)})}
            />
          </div>

          <div className="form-group">
            <label>Classe Financeira</label>
            <select className="input-base" value={form.classe_financeira_id} onChange={e => setForm({...form, classe_financeira_id: e.target.value})}>
              <option value="">Selecione...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Fornecedor (Opcional)</label>
            <select className="input-base" value={form.fornecedor_id} onChange={e => setForm({...form, fornecedor_id: e.target.value})}>
              <option value="">Selecione...</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Conta Bancária Padrão</label>
            <select className="input-base" value={form.conta_bancaria_id} onChange={e => setForm({...form, conta_bancaria_id: e.target.value})}>
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Forma de Pagamento</label>
            <select className="input-base" value={form.forma_pagamento_id} onChange={e => setForm({...form, forma_pagamento_id: e.target.value})}>
              <option value="">Selecione...</option>
              {formas.map(f => <option key={f.id} value={f.id}>{f.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="checkbox" checked={form.ativa} onChange={e => setForm({...form, ativa: e.target.checked})} />
            <label style={{ margin: 0 }}>Esta conta está ativa para geração mensal</label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn btn-outline" onClick={() => setIsOpen(false)}>CANCELAR</button>
          <button className="btn btn-primary" onClick={save}>SALVAR CONFIGURAÇÃO</button>
        </div>
      </Modal>

      {/* Modal de Geração */}
      <Modal isOpen={gerarModal} onClose={() => setGerarModal(false)} title="Gerar Títulos Mensais" width="400px">
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Este processo irá criar lançamentos automáticos no <strong>Contas a Pagar</strong> baseados em todas as configurações ativas acima.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Mês</label>
            <select className="input-base" value={gerarMes} onChange={e => setGerarMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Ano</label>
            <input type="number" className="input-base" value={gerarAno} onChange={e => setGerarAno(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <button className="btn btn-outline" onClick={() => setGerarModal(false)}>CANCELAR</button>
          <button className="btn btn-primary" onClick={handleGerar}>
            {loading ? 'GERANDO...' : 'EXECUTAR GERAÇÃO'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
