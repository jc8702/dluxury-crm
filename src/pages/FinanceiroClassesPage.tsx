import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Modal from '../components/ui/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight, FiLayers, FiActivity } from 'react-icons/fi';

interface ClasseFinanceira {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  natureza: string;
  pai_id: string | null;
  ativa: boolean;
  permite_lancamento: boolean;
  children?: ClasseFinanceira[];
}

const TIPOS_MARCENARIA = [
  // RECEITAS
  { codigo: '1.1', nome: 'Vendas de Móveis Sob Medida', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.1.1', nome: 'Dormitórios e Suítes', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.1.2', nome: 'Cozinhas Planejadas', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.1.3', nome: 'Home Office', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.1.4', nome: 'Áreas de Serviço e Banheiros', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.2', nome: 'Serviços e Montagem', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.3', nome: 'Outras Receitas', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.3.1', nome: 'Projetos de Reforma', tipo: 'receita', natureza: 'credora', pai_id: null },
  { codigo: '1.3.2', nome: 'Receitas Financeiras', tipo: 'receita', natureza: 'credora', pai_id: null },
  // DESPESAS
  { codigo: '2.1', nome: 'Matéria-Prima', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.1.1', nome: 'Chapas MDF / MDP', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.1.2', nome: 'Ferragens e Acessórios', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.1.3', nome: 'Mão de Obra de Produção', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.2', nome: 'Custos de Produção', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.2.1', nome: 'Energia Elétrica Produção', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.2.2', nome: 'Manutenção de Máquinas', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.3', nome: 'Despesas Operacionais', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.3.1', nome: 'Transporte e Entrega', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.3.2', nome: 'Marketing e Publicidade', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.4', nome: 'Despesas Fixas', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.4.1', nome: 'Aluguel e IPTU', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.4.2', nome: 'Internet e Telefone', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.5', nome: 'Folha de Pagamento', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.5.1', nome: 'Salários', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.5.2', nome: 'Encargos Trabalhistas', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.6', nome: 'Despesas Administrativas', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.6.1', nome: 'Contador / Honorários', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.6.2', nome: 'Impostos e Taxas', tipo: 'despesa', natureza: 'devedora', pai_id: null },
  { codigo: '2.6.3', nome: 'Seguros', tipo: 'despesa', natureza: 'devedora', pai_id: null },
];

function buildTree(classes: ClasseFinanceira[]): ClasseFinanceira[] {
  const map: Record<string, ClasseFinanceira> = {};
  const roots: ClasseFinanceira[] = [];
  classes.forEach(c => { map[c.id] = { ...c, children: [] }; });
  classes.forEach(c => {
    if (c.pai_id && map[c.pai_id]) {
      map[c.pai_id].children!.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

function TreeNode({ 
  node, depth, onEdit, onDelete, usageMap 
}: { 
  node: ClasseFinanceira; depth: number; onEdit: (c: ClasseFinanceira) => void; onDelete: (id: string) => void; usageMap: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const usage = usageMap[node.id] || 0;

  return (
    <div>
      <div
        style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: `0.55rem 1rem 0.55rem ${1 + depth * 1.5}rem`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: depth === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
          transition: '0.15s'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        onMouseLeave={e => (e.currentTarget.style.background = depth === 0 ? 'rgba(255,255,255,0.04)' : 'transparent')}
      >
        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {hasChildren ? (expanded ? <FiChevronDown /> : <FiChevronRight />) : <span style={{ width: '14px' }} />}
        </button>

        {/* Código */}
        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, minWidth: '60px', flexShrink: 0 }}>{node.codigo}</span>

        {/* Nome */}
        <span style={{ flex: 1, fontSize: depth === 0 ? '0.9rem' : '0.85rem', fontWeight: depth === 0 ? 700 : 400 }}>{node.nome}</span>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ 
            fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px',
            background: (node.tipo === 'receita' || node.natureza === 'credora' || node.codigo?.startsWith('1')) ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: (node.tipo === 'receita' || node.natureza === 'credora' || node.codigo?.startsWith('1')) ? 'var(--success)' : 'var(--danger)'
          }}>{(node.tipo === 'receita' || node.natureza === 'credora' || node.codigo?.startsWith('1')) ? 'RECEITA' : 'DESPESA'}</span>
          
          {!node.ativa && (
            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(156,163,175,0.2)', color: 'var(--text-muted)', fontWeight: 700 }}>INATIVA</span>
          )}
          
          {usage > 0 && (
            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <FiActivity style={{ fontSize: '0.6rem' }} /> {usage} título{usage !== 1 ? 's' : ''}
            </span>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.25rem', opacity: 0.7 }}>
            <button onClick={() => onEdit(node)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '0.25rem' }}><FiEdit2 size={13} /></button>
            <button onClick={() => onDelete(node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }}><FiTrash2 size={13} /></button>
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && node.children!.map(child => (
        <TreeNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} usageMap={usageMap} />
      ))}
    </div>
  );
}

export default function FinanceiroClassesPage() {
  const [classes, setClasses] = useState<ClasseFinanceira[]>([]);
  const [tree, setTree] = useState<ClasseFinanceira[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<ClasseFinanceira> | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.financeiro.classesFinanceiras.list();
      setClasses(data || []);
      setTree(buildTree(data || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    if (!window.confirm('Isso vai criar o plano de contas padrão para marcenaria. Continuar?')) return;
    setSeeding(true);
    try {
      for (const classe of TIPOS_MARCENARIA) {
        await api.financeiro.classesFinanceiras.create({ ...classe, ativa: true, permite_lancamento: true });
      }
      await load();
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!modal) return;
    if (modal.id) {
      await api.financeiro.classesFinanceiras.update({ ...modal });
    } else {
      await api.financeiro.classesFinanceiras.create(modal);
    }
    setModal(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta classe financeira?')) return;
    await api.financeiro.classesFinanceiras.delete(id);
    await load();
  };

  const isReceita = (c: ClasseFinanceira) => c.tipo === 'receita' || c.natureza === 'credora' || c.codigo?.startsWith('1');
  const isDespesa = (c: ClasseFinanceira) => c.tipo === 'despesa' || c.natureza === 'devedora' || c.codigo?.startsWith('2');

  const receitasCount = classes.filter(isReceita).length;
  const despesasCount = classes.filter(isDespesa).length;

  return (
    <div className="page-container anim-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiLayers style={{ color: 'var(--primary)' }} /> PLANO DE CONTAS
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Hierarquia financeira de receitas e despesas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {classes.length === 0 && (
            <button className="btn btn-outline" onClick={handleSeed} disabled={seeding} style={{ fontSize: '0.8rem' }}>
              {seeding ? '⏳ Criando...' : '✨ CRIAR PLANO MARCENARIA'}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setModal({})} style={{ fontSize: '0.85rem' }}>
            <FiPlus /> NOVA CLASSE
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total de Classes', value: classes.length, color: 'var(--primary)' },
          { label: 'Classes de Receita', value: receitasCount, color: 'var(--success)' },
          { label: 'Classes de Despesa', value: despesasCount, color: 'var(--danger)' },
        ].map((stat, i) => (
          <div key={i} className="card glass" style={{ padding: '1rem', textAlign: 'center', borderTop: `3px solid ${stat.color}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{stat.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Árvore */}
      <div className="card glass" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando classes...</div>
        ) : tree.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <FiLayers style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhuma classe cadastrada</p>
            <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Criando...' : '✨ Criar Plano de Contas para Marcenaria'}
            </button>
          </div>
        ) : (
          <>
            {/* Receitas */}
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.08)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
              RECEITAS ({tree.filter(isReceita).length} categorias)
            </div>
            {tree.filter(isReceita).map(node => (
              <TreeNode key={node.id} node={node} depth={0} onEdit={c => setModal(c)} onDelete={handleDelete} usageMap={usageMap} />
            ))}

            {/* Despesas */}
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              DESPESAS ({tree.filter(isDespesa).length} categorias)
            </div>
            {tree.filter(isDespesa).map(node => (
              <TreeNode key={node.id} node={node} depth={0} onEdit={c => setModal(c)} onDelete={handleDelete} usageMap={usageMap} />
            ))}
          </>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <Modal isOpen onClose={() => setModal(null)} title={modal.id ? 'Editar Classe' : 'Nova Classe Financeira'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              <div>
                <label className="label-base">Código *</label>
                <input className="input-base" placeholder="ex: 1.1.2" value={modal.codigo || ''} onChange={e => setModal(m => ({ ...m, codigo: e.target.value }))} />
              </div>
              <div>
                <label className="label-base">Nome *</label>
                <input className="input-base" placeholder="Nome da categoria" value={modal.nome || ''} onChange={e => setModal(m => ({ ...m, nome: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label-base">Tipo *</label>
                <select className="input-base" value={modal.tipo || 'despesa'} onChange={e => setModal(m => ({ ...m, tipo: e.target.value, natureza: e.target.value === 'receita' ? 'credora' : 'devedora' }))}>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div>
                <label className="label-base">Natureza</label>
                <select className="input-base" value={modal.natureza || 'devedora'} onChange={e => setModal(m => ({ ...m, natureza: e.target.value }))}>
                  <option value="credora">Credora (Receita)</option>
                  <option value="devedora">Devedora (Despesa)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={modal.ativa ?? true} onChange={e => setModal(m => ({ ...m, ativa: e.target.checked }))} />
                Ativa
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={modal.permite_lancamento ?? true} onChange={e => setModal(m => ({ ...m, permite_lancamento: e.target.checked }))} />
                Permite Lançamento
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
