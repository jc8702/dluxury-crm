import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { OrcamentoItem, Material } from '../../context/AppContext';
import { calcularValorFinal, calcularCustoFinanceiro, calcularPercentualEncargo, calcularValorComUrgencia } from '../../utils/calculoFinanceiro';


interface OrcamentoFormProps {
  onClose: () => void;
  orcamentoId?: string;
}

const OrcamentoForm: React.FC<OrcamentoFormProps> = ({ onClose, orcamentoId }) => {
  const { 
    clients, projects, condicoesPagamento, addOrcamento, updateOrcamento, orcamentos, materiais, registrarMovimentacao
  } = useAppContext();

  const defaultTaxa = 3; 
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
    materiais_consumidos: [] as { material_id: string; quantidade: number }[],
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
          materiais_consumidos: existing.materiais_consumidos || [],
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
    if (!formData.cliente_id) {
      alert("Selecione um cliente.");
      return;
    }
    if (!formData.condicao_pagamento_id) {
      alert("Selecione a condição de pagamento.");
      return;
    }

    const payload = {
      ...formData,
      taxa_mensal: formData.taxa_mensal / 100,
      valor_base: valorBase,
      valor_final: valorTotalFinal,
      adicional_urgencia_pct: formData.prazo_tipo === 'urgente' ? adicionalUrgencia : 0,
      itens: items,
      materiais_consumidos: formData.materiais_consumidos
    };

    try {
      if (orcamentoId) {
        const oldOrc = orcamentos.find(o => o.id === orcamentoId);
        await updateOrcamento(orcamentoId, payload);
        
        // Gatilho de Baixa de Estoque
        if (payload.status === 'em_producao' && oldOrc?.status !== 'em_producao') {
          for (const item of formData.materiais_consumidos) {
            const mat = materiais.find(m => m.id === item.material_id);
            if (mat) {
              await registrarMovimentacao({
                material_id: item.material_id,
                tipo: 'saida',
                quantidade: item.quantidade,
                motivo: `Consumo Projeto: Orçamento ${oldOrc?.numero || orcamentoId}`,
                orcamento_id: orcamentoId
              });
            }
          }
        }
      } else {
        await addOrcamento(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar orçamento. Verifique se todos os campos estão preenchidos.');
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const inputStyle: React.CSSProperties = {
    background: '#161a29', 
    border: '1px solid rgba(212, 175, 55, 0.3)',
    borderRadius: '8px', 
    padding: '0.75rem', 
    color: 'white', 
    width: '100%', 
    outline: 'none',
    fontSize: '0.9rem'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', 
    color: '#94a3b8', 
    marginBottom: '0.4rem', 
    display: 'block',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.03em'
  };

  const sectionStyle: React.CSSProperties = {
    padding: '1.5rem',
    background: 'var(--surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '85vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Seção 1 — Dados Gerais */}
      <section style={sectionStyle}>
        <h4 style={{ color: '#d4af37', marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 'bold' }}>1. Dados Gerais</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Cliente</label>
            <select style={inputStyle} value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})}>
              <option value="">Selecione...</option>
              {clients.length > 0 ? clients.map(c => <option key={c.id} value={c.id} style={{background: '#1a1a2e'}}>{c.nome}</option>) : <option disabled>Carregando clientes...</option>}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Projeto Vinculado (Opcional)</label>
            <select style={inputStyle} value={formData.projeto_id} onChange={e => setFormData({...formData, projeto_id: e.target.value})}>
              <option value="">Nenhum</option>
              {projects.map(p => <option key={p.id} value={p.id} style={{background: '#1a1a2e'}}>{p.ambiente} - {p.clientName}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status do Orçamento</label>
            <select style={inputStyle} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
              <option value="rascunho" style={{background: '#1a1a2e'}}>Rascunho</option>
              <option value="enviado" style={{background: '#1a1a2e'}}>Enviado ao Cliente</option>
              <option value="aprovado" style={{background: '#1a1a2e'}}>Aprovado</option>
              <option value="em_producao" style={{background: '#1a1a2e'}}>Em Produção (Baixa Estoque)</option>
              <option value="recusado" style={{background: '#1a1a2e'}}>Recusado</option>
            </select>
          </div>
        </div>
      </section>

      {/* Seção 2 — Itens do Orçamento */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h4 style={{ color: '#d4af37', fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>2. Itens do Orçamento</h4>
          <button onClick={() => { setEditingItemIndex(null); setShowItemModal(true); }} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>+ ADICIONAR ITEM</button>
        </div>
        
        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(212, 175, 55, 0.1)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Ambiente</th>
                <th style={{ padding: '0.75rem' }}>Descrição</th>
                <th style={{ padding: '0.75rem' }}>Dimensões</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.75rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem' }}>{item.ambiente}</td>
                  <td style={{ padding: '0.75rem' }}>{item.descricao}</td>
                  <td style={{ padding: '0.75rem' }}>{item.largura_cm}x{item.altura_cm}x{item.profundidade_cm}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.valor_total)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <button onClick={() => { setEditingItemIndex(idx); setNewItem(item); setShowItemModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginRight: '0.75rem', fontSize: '1.1rem' }}>✎</button>
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhum item adicionado ao orçamento ainda.</p>}
        </div>
      </section>

      {/* Seção 2.1 — Materiais Previstos para o Projeto */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h4 style={{ color: '#d4af37', fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>2.1 Materiais Previstos (Estoque)</h4>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Material</label>
            <select 
              id="material-select"
              style={inputStyle} 
              onChange={(e) => {
                const matId = e.target.value;
                if (!matId) return;
                const qtyStr = prompt('Quantidade (' + materiais.find(m => m.id === matId)?.unidade_compra + '):');
                const qty = parseFloat(qtyStr || '0');
                if (qty > 0) {
                  setFormData(prev => ({
                    ...prev,
                    materiais_consumidos: [...prev.materiais_consumidos, { material_id: matId, quantidade: qty }]
                  }));
                }
                e.target.value = '';
              }}
            >
              <option value="">+ Selecionar material para vincular...</option>
              {materiais.map(m => (
                <option key={m.id} value={m.id} style={{background: '#1a1a2e'}}>
                  {m.sku} - {m.nome} ({m.estoque_atual} {m.unidade_compra} em estoque)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {formData.materiais_consumidos.map((item, idx) => {
            const mat = materiais.find(m => m.id === item.material_id);
            return (
              <div key={idx} style={{ 
                background: 'rgba(212,175,55,0.05)', 
                border: '1px solid rgba(212,175,55,0.2)', 
                padding: '0.5rem 0.75rem', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.85rem'
              }}>
                <span style={{ fontWeight: '600' }}>{mat?.nome}</span>
                <span style={{ color: '#d4af37' }}>{item.quantidade} {mat?.unidade_compra}</span>
                <button 
                  onClick={() => {
                    const newList = [...formData.materiais_consumidos];
                    newList.splice(idx, 1);
                    setFormData({...formData, materiais_consumidos: newList});
                  }}
                  style={{ all: 'unset', cursor: 'pointer', color: 'var(--danger)', fontWeight: 'bold' }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Seção 3 — Condição de Pagamento */}
      <section style={sectionStyle}>
        <h4 style={{ color: '#d4af37', marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 'bold' }}>3. Financeiro e Pagamento</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Condição de Pagamento</label>
            <select style={inputStyle} value={formData.condicao_pagamento_id} onChange={e => setFormData({...formData, condicao_pagamento_id: e.target.value})}>
              <option value="">Selecione a forma de pagamento...</option>
              {condicoesPagamento.length > 0 ? condicoesPagamento.map(c => <option key={c.id} value={c.id} style={{background: '#1a1a2e'}}>{c.nome}</option>) : <option disabled>Carregando condições...</option>}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Taxa Mensal (%)</label>
            <input type="number" step="0.1" style={inputStyle} value={formData.taxa_mensal} onChange={e => setFormData({...formData, taxa_mensal: Number(e.target.value)})} />
          </div>
        </div>
        
        <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#94a3b8' }}>Valor Base (Líquido):</span>
            <span style={{ fontWeight: '500' }}>{formatCurrency(valorBase)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ff4d4d' }}>
            <span style={{ color: '#94a3b8' }}>Encargo Financeiro ({selectedCondicao?.n_parcelas || 1}x):</span>
            <span style={{ fontWeight: '600' }}>+ {formatCurrency(encargoFinanceiro)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.75rem', color: '#d4af37' }}>
            <span>Valor com Encargos:</span>
            <span>{formatCurrency(valorFinalSemUrgencia)}</span>
          </div>
        </div>
      </section>

      {/* Seção 4 — Prazo de Entrega */}
      <section style={sectionStyle}>
        <h4 style={{ color: '#d4af37', marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 'bold' }}>4. Prazo de Entrega</h4>
        <div style={{ display: 'flex', gap: '2.5rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.95rem' }}>
            <input type="radio" name="prazo" checked={formData.prazo_tipo === 'padrao'} onChange={() => setFormData({...formData, prazo_tipo: 'padrao'})} style={{ width: '1.1rem', height: '1.1rem', accentColor: '#d4af37' }} /> 
            <span>Prazo Padrão</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#ffa500', fontSize: '0.95rem', fontWeight: 'bold' }}>
            <input type="radio" name="prazo" checked={formData.prazo_tipo === 'urgente'} onChange={() => setFormData({...formData, prazo_tipo: 'urgente'})} style={{ width: '1.1rem', height: '1.1rem', accentColor: '#ffa500' }} /> 
            <span>Urgente (+15% Adicional)</span>
          </label>
        </div>
        <div>
          <label style={labelStyle}>Dias Úteis para Entrega (Válido após aprovação)</label>
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
