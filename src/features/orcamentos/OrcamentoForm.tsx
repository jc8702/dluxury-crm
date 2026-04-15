import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { calcularValorFinal, calcularCustoFinanceiro, calcularPercentualEncargo, calcularValorComUrgencia } from '../../utils/calculoFinanceiro';
import { OrcamentoItem } from '../../context/AppContext';

interface OrcamentoFormProps {
  onClose: () => void;
  orcamentoId?: string;
}

const OrcamentoForm: React.FC<OrcamentoFormProps> = ({ onClose, orcamentoId }) => {
  const { 
    clients, projects, condicoesPagamento, addOrcamento, updateOrcamento, orcamentos 
  } = useAppContext();

  // Settings mock (em prod viria de settings no context ou config global)
  const defaultTaxa = 3; // 3%
  const defaultPrazo = 45;
  const adicionalUrgencia = 0.15;

  const [formData, setFormData] = useState({
    cliente_id: '',
    projeto_id: '',
    status: 'rascunho' as const,
    taxa_mensal: defaultTaxa,
    condicao_pagamento_id: '',
    prazo_entrega_dias: defaultPrazo,
    prazo_tipo: 'padrao' as 'padrao' | 'urgente',
    observacoes: '',
  });

  const [items, setItems] = useState<OrcamentoItem[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState<OrcamentoItem>({
    descricao: '', ambiente: '', largura_cm: 0, altura_cm: 0, profundidade_cm: 0,
    material: '', acabamento: '', quantidade: 1, valor_unitario: 0, valor_total: 0
  });

  // Load existing orcamento
  useEffect(() => {
    if (orcamentoId) {
      const existing = orcamentos.find(o => o.id === orcamentoId);
      if (existing) {
        setFormData({
          cliente_id: existing.cliente_id,
          projeto_id: existing.projeto_id || '',
          status: existing.status,
          taxa_mensal: existing.taxa_mensal * 100, // 0.03 -> 3
          condicao_pagamento_id: existing.condicao_pagamento_id,
          prazo_entrega_dias: existing.prazo_entrega_dias,
          prazo_tipo: existing.prazo_tipo,
          observacoes: existing.observacoes || '',
        });
        setItems(existing.itens || []);
      }
    }
  }, [orcamentoId, orcamentos]);

  // Totals
  const valorBase = useMemo(() => items.reduce((acc, item) => acc + item.valor_total, 0), [items]);
  
  const selectedCondicao = useMemo(() => 
    condicoesPagamento.find(c => c.id === formData.condicao_pagamento_id), 
    [formData.condicao_pagamento_id, condicoesPagamento]
  );

  const valorFinalSemUrgencia = useMemo(() => 
    calcularValorFinal(valorBase, formData.taxa_mensal / 100, selectedCondicao?.n_parcelas || 1),
    [valorBase, formData.taxa_mensal, selectedCondicao]
  );

  const valorTotalFinal = useMemo(() => 
    formData.prazo_tipo === 'urgente' 
      ? calcularValorComUrgencia(valorFinalSemUrgencia, adicionalUrgencia)
      : valorFinalSemUrgencia,
    [valorFinalSemUrgencia, formData.prazo_tipo]
  );

  const encargoFinanceiro = valorFinalSemUrgencia - valorBase;
  const adicionalUrgenciaValor = valorTotalFinal - valorFinalSemUrgencia;

  const handleAddItem = () => {
    const itemWithTotal = { ...newItem, valor_total: newItem.quantidade * newItem.valor_unitario };
    if (editingItemIndex !== null) {
      const newItems = [...items];
      newItems[editingItemIndex] = itemWithTotal;
      setItems(newItems);
      setEditingItemIndex(null);
    } else {
      setItems([...items, itemWithTotal]);
    }
    setShowItemModal(false);
    setNewItem({
      descricao: '', ambiente: '', largura_cm: 0, altura_cm: 0, profundidade_cm: 0,
      material: '', acabamento: '', quantidade: 1, valor_unitario: 0, valor_total: 0
    });
  };

  const handleSave = async () => {
    if (!formData.cliente_id || !formData.condicao_pagamento_id) {
      alert("Selecione o cliente e a condição de pagamento.");
      return;
    }

    const payload = {
      ...formData,
      taxa_mensal: formData.taxa_mensal / 100,
      valor_base: valorBase,
      valor_final: valorTotalFinal,
      adicional_urgencia_pct: adicionalUrgencia,
      itens: items
    };

    try {
      if (orcamentoId) {
        await updateOrcamento(orcamentoId, payload);
      } else {
        await addOrcamento(payload);
      }
      onClose();
    } catch (e) {
      alert("Erro ao salvar orçamento.");
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px', padding: '0.6rem', color: 'white', width: '100%', outline: 'none'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '85vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Seção 1 — Dados Gerais */}
      <section className="card glass" style={{ padding: '1.25rem' }}>
        <h4 style={{ color: '#d4af37', marginBottom: '1rem', fontSize: '1rem' }}>1. Dados Gerais</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cliente</label>
            <select style={inputStyle} value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})}>
              <option value="">Selecione...</option>
              {clients.map(c => <option key={c.id} value={c.id} style={{background: '#1a1a2e'}}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projeto Vinculado (Opcional)</label>
            <select style={inputStyle} value={formData.projeto_id} onChange={e => setFormData({...formData, projeto_id: e.target.value})}>
              <option value="">Nenhum</option>
              {projects.map(p => <option key={p.id} value={p.id} style={{background: '#1a1a2e'}}>{p.ambiente} - {p.clientName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
            <select style={inputStyle} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
              <option value="rascunho" style={{background: '#1a1a2e'}}>Rascunho</option>
              <option value="enviado" style={{background: '#1a1a2e'}}>Enviado ao Cliente</option>
              <option value="aprovado" style={{background: '#1a1a2e'}}>Aprovado</option>
              <option value="recusado" style={{background: '#1a1a2e'}}>Recusado</option>
            </select>
          </div>
        </div>
      </section>

      {/* Seção 2 — Itens do Orçamento */}
      <section className="card glass" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ color: '#d4af37', fontSize: '1rem', margin: 0 }}>2. Itens do Orçamento</h4>
          <button onClick={() => { setEditingItemIndex(null); setShowItemModal(true); }} className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>+ Item</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Ambiente</th>
                <th style={{ padding: '0.5rem' }}>Descrição</th>
                <th style={{ padding: '0.5rem' }}>Dimensões</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem' }}>{item.ambiente}</td>
                  <td style={{ padding: '0.5rem' }}>{item.descricao}</td>
                  <td style={{ padding: '0.5rem' }}>{item.largura_cm}x{item.altura_cm}x{item.profundidade_cm}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(item.valor_total)}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <button onClick={() => { setEditingItemIndex(idx); setNewItem(item); setShowItemModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginRight: '0.5rem' }}>✎</button>
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Nenhum item adicionado.</p>}
        </div>
      </section>

      {/* Seção 3 — Condição de Pagamento */}
      <section className="card glass" style={{ padding: '1.25rem' }}>
        <h4 style={{ color: '#d4af37', marginBottom: '1rem', fontSize: '1rem' }}>3. Financeiro e Pagamento</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Condição de Pagamento</label>
            <select style={inputStyle} value={formData.condicao_pagamento_id} onChange={e => setFormData({...formData, condicao_pagamento_id: e.target.value})}>
              <option value="">Selecione...</option>
              {condicoesPagamento.map(c => <option key={c.id} value={c.id} style={{background: '#1a1a2e'}}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Taxa Mensal (%)</label>
            <input type="number" step="0.1" style={inputStyle} value={formData.taxa_mensal} onChange={e => setFormData({...formData, taxa_mensal: Number(e.target.value)})} />
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span>Valor Base (Itens):</span>
            <span>{formatCurrency(valorBase)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: '#ef4444' }}>
            <span>Encargo Financeiro ({selectedCondicao?.n_parcelas || 1}x):</span>
            <span>+ {formatCurrency(encargoFinanceiro)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
            <span>Valor Final Projetado:</span>
            <span>{formatCurrency(valorFinalSemUrgencia)}</span>
          </div>
        </div>
      </section>

      {/* Seção 4 — Prazo de Entrega */}
      <section className="card glass" style={{ padding: '1.25rem' }}>
        <h4 style={{ color: '#d4af37', marginBottom: '1rem', fontSize: '1rem' }}>4. Prazo de Entrega</h4>
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="radio" name="prazo" checked={formData.prazo_tipo === 'padrao'} onChange={() => setFormData({...formData, prazo_tipo: 'padrao'})} /> 
            <span>Prazo Padrão</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#ffa500' }}>
            <input type="radio" name="prazo" checked={formData.prazo_tipo === 'urgente'} onChange={() => setFormData({...formData, prazo_tipo: 'urgente'})} /> 
            <span>Urgente (+15%)</span>
          </label>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dias Úteis para Entrega</label>
          <input type="number" style={inputStyle} value={formData.prazo_entrega_dias} onChange={e => setFormData({...formData, prazo_entrega_dias: Number(e.target.value)})} />
        </div>
      </section>

      {/* Seção 5 — Resumo Final */}
      <section style={{ 
        padding: '1.5rem', 
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(180, 144, 80, 0.05))', 
        borderRadius: '12px', 
        border: '1px solid rgba(212, 175, 55, 0.2)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem'
      }}>
        <div>
          <h4 style={{ color: '#d4af37', marginBottom: '1rem', fontSize: '1.1rem' }}>Resumo do Orçamento</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Condição:</span>
              <span style={{ fontWeight: '500' }}>{selectedCondicao?.nome || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Entrega:</span>
              <span style={{ fontWeight: '500' }}>{formData.prazo_entrega_dias} dias ({formData.prazo_tipo.toUpperCase()})</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>VALOR TOTAL FINAL</p>
          <h2 style={{ fontSize: '2.5rem', color: '#d4af37', margin: 0, fontWeight: '900' }}>
            {formatCurrency(valorTotalFinal)}
          </h2>
          {adicionalUrgenciaValor > 0 && <p style={{ fontSize: '0.75rem', color: '#ffa500' }}>Inc. +{formatCurrency(adicionalUrgenciaValor)} de urgência</p>}
        </div>
      </section>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <textarea 
          placeholder="Observações adicionais..." 
          style={{ ...inputStyle, minHeight: '80px', flex: 1 }}
          value={formData.observacoes}
          onChange={e => setFormData({...formData, observacoes: e.target.value})}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
        <button className="btn btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={handleSave}>SALVAR ORÇAMENTO</button>
        <button className="btn" style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.05)' }} onClick={onClose}>CANCELAR</button>
      </div>

      {/* Modal de Item */}
      {showItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '500px', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#d4af37' }}>{editingItemIndex !== null ? 'Editar Item' : 'Novo Item'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem' }}>Descrição do Móvel</label>
                <input style={inputStyle} value={newItem.descricao} onChange={e => setNewItem({...newItem, descricao: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Ambiente</label>
                <input style={inputStyle} value={newItem.ambiente} onChange={e => setNewItem({...newItem, ambiente: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Material</label>
                <input style={inputStyle} value={newItem.material} onChange={e => setNewItem({...newItem, material: e.target.value.toUpperCase()})} />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div><label style={{ fontSize: '0.65rem' }}>Larg (cm)</label><input type="number" style={inputStyle} value={newItem.largura_cm} onChange={e => setNewItem({...newItem, largura_cm: Number(e.target.value)})} /></div>
                <div><label style={{ fontSize: '0.65rem' }}>Alt (cm)</label><input type="number" style={inputStyle} value={newItem.altura_cm} onChange={e => setNewItem({...newItem, altura_cm: Number(e.target.value)})} /></div>
                <div><label style={{ fontSize: '0.65rem' }}>Prof (cm)</label><input type="number" style={inputStyle} value={newItem.profundidade_cm} onChange={e => setNewItem({...newItem, profundidade_cm: Number(e.target.value)})} /></div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Qtd</label>
                <input type="number" style={inputStyle} value={newItem.quantidade} onChange={e => setNewItem({...newItem, quantidade: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Valor Unitário</label>
                <input type="number" style={inputStyle} value={newItem.valor_unitario} onChange={e => setNewItem({...newItem, valor_unitario: Number(e.target.value)})} />
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddItem}>CONFIRMAR</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setShowItemModal(false)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrcamentoForm;
