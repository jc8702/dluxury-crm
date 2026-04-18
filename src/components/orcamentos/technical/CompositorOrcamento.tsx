import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { OrcamentoAmbiente, OrcamentoMovel, Material, ConfiguracaoPrecificacao } from '../../../context/AppContext';
import { 
  X, 
  Trash2, 
  ChevronRight, 
  Search, 
  FileText, 
  Package, 
  Truck, 
  Calendar, 
  Settings, 
  Plus, 
  Zap,
  Info
} from 'lucide-react';
import { api } from '../../../lib/api';
import { 
  calcularM2Peca, 
  aplicarPerdaCorte, 
  custoPeca, 
  calcularPrecoVenda, 
  calcularImposto, 
  calcularMargemReal 
} from '../../../utils/precificacao';
import { create, all } from 'mathjs';
const math = create(all);
import AmbienteModal from './AmbienteModal';
import MovelModal from './MovelModal';

interface CompositorOrcamentoProps {
  orcamentoId: string;
  onClose: () => void;
  onSettle: (custoTotal: number, precoSugerido: number) => void;
}

const CompositorOrcamento: React.FC<CompositorOrcamentoProps> = ({ orcamentoId, onClose, onSettle }) => {
  const { materiais } = useAppContext();
  
  // -- State --
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<{ ambientes: OrcamentoAmbiente[], extras: any[] }>({ ambientes: [], extras: [] });
  const [config, setConfig] = useState<ConfiguracaoPrecificacao | null>(null);
  
  const [selectedAmbienteId, setSelectedAmbienteId] = useState<string | null>(null);
  const [selectedMovelId, setSelectedMovelId] = useState<string | null>(null);
  
  const [showAmbienteModal, setShowAmbienteModal] = useState(false);
  const [showMovelModal, setShowMovelModal] = useState(false);

  // -- Data Loading --
  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const [treeData, configData] = await Promise.all([
        api.orcamentoTecnico.getTree(orcamentoId),
        api.orcamentoTecnico.getConfig()
      ]);
      setTree(treeData);
      setConfig(configData);
    } catch (err) {
      console.error('Erro ao carregar compositor:', err);
    } finally {
      setLoading(false);
    }
  }, [orcamentoId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // -- Helpers --
  const activeAmbiente = useMemo(() => 
    tree.ambientes.find(a => a.id === selectedAmbienteId), 
    [tree.ambientes, selectedAmbienteId]
  );
  
  const activeMovel = useMemo(() => 
    activeAmbiente?.moveis?.find(m => m.id === selectedMovelId),
    [activeAmbiente, selectedMovelId]
  );

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // -- Actions (Atomic Save) --
  const handleAddAmbiente = async (nome: string) => {
    await api.orcamentoTecnico.addEntity('ambiente', 'orcamento_id', orcamentoId, { nome, ordem: tree.ambientes.length });
    await loadTree();
  };

  const handleAddMovel = async (data: any) => {
    if (!selectedAmbienteId) return;
    await api.orcamentoTecnico.addEntity('movel', 'ambiente_id', selectedAmbienteId, data);
    await loadTree();
  };

  const handleRemove = async (type: any, id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    await api.orcamentoTecnico.deleteEntity(type, id);
    if (type === 'ambiente' && id === selectedAmbienteId) { setSelectedAmbienteId(null); setSelectedMovelId(null); }
    if (type === 'movel' && id === selectedMovelId) setSelectedMovelId(null);
    await loadTree();
  };

  const handleAddPeca = async () => {
    if (!selectedMovelId) return;
    const defaultMat = materiais.find(m => m.categoria_nome?.toLowerCase().includes('chapa')) || materiais[0];
    await api.orcamentoTecnico.addEntity('peca', 'movel_id', selectedMovelId, {
      material_id: defaultMat?.id,
      sku: defaultMat?.sku || 'SKU',
      descricao_peca: 'NOVA PEÇA',
      largura_cm: 0,
      altura_cm: 0,
      quantidade: 1,
      fator_perda_pct: config?.fator_perda_padrao || 0,
      metros_fita_borda: 0
    });
    await loadTree();
  };

  const handleUpdatePeca = async (pecaId: string, data: any) => {
    await api.orcamentoTecnico.updateEntity('peca', pecaId, data);
    await loadTree();
  };

  const handleRecalcularBOM = async () => {
    if (!selectedMovelId || !activeMovel?.erp_product_id) return;
    if (!confirm('Isto irá sobrescrever as peças atuais com base no modelo de engenharia. Continuar?')) return;
    
    setLoading(true);
    try {
      const modules = await api.engineering.list();
      const module = modules.find((m: any) => m.id === activeMovel.erp_product_id);
      if (!module || !module.regras_calculo) throw new Error('Modelo não encontrado ou sem regras.');

      const context = {
        L: Number(activeMovel.largura_total_cm) * 10, // Converter cm para mm para precisão
        A: Number(activeMovel.altura_total_cm) * 10,
        P: Number(activeMovel.profundidade_total_cm) * 10,
        ESP: Number(config?.espessura_chapa_padrao || 15),
        REC: Number(config?.recuo_fundo_padrao || 10)
      };

      // Limpar peças atuais do móvel
      if (activeMovel.pecas) {
        for (const p of activeMovel.pecas) {
          await api.orcamentoTecnico.deleteEntity('peca', p.id);
        }
      }

      // Gerar novas peças
      for (const regra of module.regras_calculo) {
        const largura_mm = math.evaluate(regra.formula_largura, context);
        const altura_mm = math.evaluate(regra.formula_altura, context);
        const qtd = Number(regra.quantidade) || 1;

        // Desconto manual de fita se existir (vindo da regra ou config)
        const desconto = Number(regra.desconto_fita_mm || 0);
        const largura_final_cm = (largura_mm - desconto) / 10;
        const altura_final_cm = (altura_mm - desconto) / 10;

        const m2_unit = (largura_final_cm / 100) * (altura_final_cm / 100);
        const m2_total = m2_unit * qtd;
        const lossFactor = 1 + (Number(regra.formula_perda || 1.10) - 1);
        const m2_loss = m2_total * lossFactor;

        // Buscar preço do material
        const mat = materiais.find(m => m.id === regra.sku_id);
        const costM2 = Number(mat?.preco_custo || 0);

        await api.orcamentoTecnico.addEntity('peca', 'movel_id', selectedMovelId, {
          material_id: regra.sku_id,
          sku: mat?.sku || 'SKU',
          descricao_peca: `${regra.componente_nome} [${regra.formula_largura} x ${regra.formula_altura}]`,
          largura_cm: largura_final_cm,
          altura_cm: altura_final_cm,
          quantidade: qtd,
          m2_unitario: m2_unit,
          m2_total: m2_total,
          fator_perda_pct: (lossFactor - 1) * 100,
          m2_com_perda: m2_loss,
          preco_custo_m2: costM2,
          custo_total_peca: m2_loss * costM2,
          sentido_veio: regra.sentido_veio || 'longitudinal',
          desconto_fita_mm: desconto
        });
      }
      
      alert('BOM recalculado com sucesso!');
      await loadTree();
    } catch (err: any) {
      alert(`Erro no recálculo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // -- Calculations --
  const totals = useMemo(() => {
    let custoPecas = 0;
    let custoFerragens = 0;
    let totalM2 = 0;

    tree.ambientes.forEach(amb => {
      amb.moveis?.forEach(mov => {
        mov.pecas?.forEach(p => {
          custoPecas += Number(p.custo_total_peca || 0);
          totalM2 += Number(p.m2_total || 0);
        });
        mov.ferragens?.forEach(f => {
          custoFerragens += Number(f.custo_total || 0);
        });
      });
    });

    const subtotalMateriais = custoPecas + custoFerragens;
    const moProducao = subtotalMateriais * (config?.mo_producao_pct_padrao || 0);
    const moInstalacao = subtotalMateriais * (config?.mo_instalacao_pct_padrao || 0);
    
    const custoTotal = subtotalMateriais + moProducao + moInstalacao;
    const precoVenda = calcularPrecoVenda(custoTotal, config?.markup_padrao || 1);
    const imposto = calcularImposto(precoVenda, config?.aliquota_imposto || 0);
    const margemReal = calcularMargemReal(precoVenda, custoTotal, imposto);

    return {
      custoPecas,
      custoFerragens,
      subtotalMateriais,
      moProducao,
      moInstalacao,
      custoTotal,
      precoVenda,
      imposto,
      margemReal,
      totalM2
    };
  }, [tree, config]);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.25rem'
  };

  const headerStyle: React.CSSProperties = {
     fontSize: '0.9rem',
     fontWeight: 'bold',
     color: '#d4af37',
     marginBottom: '1rem',
     textTransform: 'uppercase',
     display: 'flex',
     justifyContent: 'space-between',
     alignItems: 'center'
  };
 
  const inputConfigStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: 'white',
    padding: '0.25rem',
    width: '60px',
    textAlign: 'center',
    fontSize: '0.8rem'
  };

  if (loading && tree.ambientes.length === 0) {
    return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Carregando Compositor...</div>;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '1rem 2rem', background: '#0a0d14', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📐</span>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>Compositor Técnico de Orçamento</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>ORC-{orcamentoId.substring(0,8).toUpperCase()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => onSettle(totals.custoTotal, totals.precoVenda)}
            style={{ padding: '0.6rem 1.5rem' }}
          >
            APLICAR AO ORÇAMENTO COMERCIAL
          </button>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'white', borderRadius: '8px', cursor: 'pointer', padding: '0.6rem 1.2rem' }}>Sair</button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 340px', overflow: 'hidden' }}>
        
        {/* Coluna 1: Árvore */}
        <aside style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '1.5rem' }}>
             <h3 style={headerStyle}>
               Ambientes
               <button onClick={() => setShowAmbienteModal(true)} style={{ background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tree.ambientes.map(amb => (
                  <div key={amb.id}>
                    <div 
                      onClick={() => setSelectedAmbienteId(amb.id)}
                      style={{ 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        background: selectedAmbienteId === amb.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                        border: selectedAmbienteId === amb.id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent'
                      }}
                    >
                      <span style={{ fontWeight: selectedAmbienteId === amb.id ? 'bold' : 'normal', color: selectedAmbienteId === amb.id ? '#d4af37' : 'white' }}>📁 {amb.nome}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleRemove('ambiente', amb.id); }} style={{ opacity: 0.5, border: 'none', background: 'none', color: 'red', cursor: 'pointer' }}>×</button>
                    </div>
                    {selectedAmbienteId === amb.id && (
                      <div style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderLeft: '1px solid rgba(212,175,55,0.2)' }}>
                        {amb.moveis?.map(mov => (
                          <div 
                            key={mov.id}
                            onClick={() => setSelectedMovelId(mov.id)}
                            style={{ 
                              padding: '0.5rem', 
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              background: selectedMovelId === mov.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span style={{ color: selectedMovelId === mov.id ? 'white' : 'var(--text-muted)' }}>🪑 {mov.nome}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleRemove('movel', mov.id); }} style={{ opacity: 0.5, border: 'none', background: 'none', color: 'red', cursor: 'pointer' }}>×</button>
                          </div>
                        ))}
                        <button 
                          onClick={() => setShowMovelModal(true)}
                          style={{ padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', color: '#d4af37', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          + Novo Móvel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </aside>

        {/* Coluna 2: Detalhamento */}
        <section style={{ overflowY: 'auto', padding: '2rem' }}>
          {!selectedMovelId ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
               <div>
                 <span style={{ fontSize: '3rem' }}>🛋️</span>
                 <p>Selecione um móvel à esquerda para editar<br/>suas peças e ferragens.</p>
               </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
               {/* Titulo Movel */}
               <header style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <h2 style={{ color: '#d4af37', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {activeMovel?.nome} 
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({activeMovel?.tipo_movel})</span>
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dimensões: {activeMovel?.largura_total_cm} x {activeMovel?.altura_total_cm} x {activeMovel?.profundidade_total_cm} cm</p>
               </header>

               {/* Tabela de Peças */}
               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>Peças (Chapas)</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {activeMovel?.erp_product_id && (
                        <button 
                          onClick={handleRecalcularBOM} 
                          title="Recalcular peças usando regras de engenharia"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: 'rgba(212,175,55,0.1)', border: '1px solid #d4af37', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Zap size={14} /> RECALCULAR BOM
                        </button>
                      )}
                      <button onClick={handleAddPeca} className="btn" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', border: '1px solid #d4af37', color: '#d4af37' }}>+ Adicionar Peça</button>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.5rem' }}>DESCRIÇÃO</th>
                        <th style={{ padding: '0.5rem' }}>SKU MATERIAL</th>
                        <th style={{ padding: '0.5rem', width: '80px' }}>L (cm)</th>
                        <th style={{ padding: '0.5rem', width: '80px' }}>A (cm)</th>
                        <th style={{ padding: '0.5rem', width: '60px' }}>QTD</th>
                        <th style={{ padding: '0.5rem', width: '80px' }}>VEIO</th>
                        <th style={{ padding: '0.5rem', width: '80px' }}>DESC. FITA(mm)</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>CUSTO R$</th>
                        <th style={{ padding: '0.5rem', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMovel?.pecas?.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.5rem' }}>
                             <input 
                              style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', borderBottom: '1px dotted rgba(255,255,255,0.1)' }}
                              value={p.descricao_peca}
                              onBlur={(e) => handleUpdatePeca(p.id, { descricao_peca: e.target.value })}
                             />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select 
                              style={{ background: 'transparent', border: 'none', color: '#d4af37', width: '100%' }}
                              value={p.material_id}
                              onChange={(e) => {
                                const mat = materiais.find(m => m.id === e.target.value);
                                handleUpdatePeca(p.id, { material_id: mat?.id, sku: mat?.sku });
                              }}
                            >
                              {materiais.filter(m => m.categoria_nome?.toLowerCase().includes('chapa')).map(m => (
                                <option key={m.id} value={m.id} style={{background: '#1a1a2e'}}>{m.sku} - {m.nome}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              style={{ background: 'transparent', border: 'none', color: 'white', width: '100%' }}
                              value={p.largura_cm}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const m2 = calcularM2Peca(val, p.altura_cm);
                                const m2Loss = aplicarPerdaCorte(m2, p.fator_perda_pct);
                                const cost = custoPeca(m2Loss * p.quantidade, p.preco_custo_m2);
                                handleUpdatePeca(p.id, { largura_cm: val, m2_unitario: m2, m2_total: m2 * p.quantidade, m2_com_perda: m2Loss * p.quantidade, custo_total_peca: cost });
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              style={{ background: 'transparent', border: 'none', color: 'white', width: '100%' }}
                              value={p.altura_cm}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const m2 = calcularM2Peca(p.largura_cm, val);
                                const m2Loss = aplicarPerdaCorte(m2, p.fator_perda_pct);
                                const cost = custoPeca(m2Loss * p.quantidade, p.preco_custo_m2);
                                handleUpdatePeca(p.id, { altura_cm: val, m2_unitario: m2, m2_total: m2 * p.quantidade, m2_com_perda: m2Loss * p.quantidade, custo_total_peca: cost });
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              style={{ background: 'transparent', border: 'none', color: 'white', width: '100%' }}
                              value={p.quantidade}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const m2_total = p.m2_unitario * val;
                                const m2Loss_total = aplicarPerdaCorte(m2_total, p.fator_perda_pct);
                                const cost = custoPeca(m2Loss_total, p.preco_custo_m2);
                                handleUpdatePeca(p.id, { quantidade: val, m2_total, m2_com_perda: m2Loss_total, custo_total_peca: cost });
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select 
                              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.7rem', width: '100%' }}
                              value={p.sentido_veio || 'longitudinal'}
                              onChange={(e) => handleUpdatePeca(p.id, { sentido_veio: e.target.value })}
                            >
                              <option value="longitudinal" style={{background: '#1a1a2e'}}>Long</option>
                              <option value="transversal" style={{background: '#1a1a2e'}}>Trans</option>
                              <option value="sem_sentido" style={{background: '#1a1a2e'}}>Nenhum</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input 
                              type="number" 
                              required
                              style={{ background: 'transparent', border: 'none', color: '#d4af37', width: '100%', textAlign: 'center' }}
                              value={p.desconto_fita_mm || 0}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                handleUpdatePeca(p.id, { desconto_fita_mm: val });
                              }}
                            />
                          </td>
                          {/* ... Outros campos seguindo a mesma lógica de cálculo em tempo real ... */}
                          {/* Simplificando para o primeiro commit */}
                          <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold', color: '#d4af37' }}>{formatCurrency(p.custo_total_peca)}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <button onClick={() => handleRemove('peca', p.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>

               {/* Ferragens (Placeholder similar) */}
               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>Ferragens e Acessórios</h3>
                    <button className="btn" style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', border: '1px solid #d4af37', color: '#d4af37' }}>+ Adicionar Ferragem</button>
                  </div>
                  {/* ... Tabela de Ferragens ... */}
               </div>
            </div>
          )}
        </section>

        {/* Coluna 3: Painel de Precificação */}
        <aside style={{ background: '#0a0d14', borderLeft: '1px solid var(--border)', padding: '1.5rem', overflowY: 'auto' }}>
           <h3 style={headerStyle}>Precisificação</h3>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={cardStyle}>
                 <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>CUSTO DE MATERIAIS</p>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>Peças:</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(totals.custoPecas)}</span>
                 </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                     <span style={{ fontSize: '0.85rem' }}>Ferragens:</span>
                     <span style={{ fontWeight: 'bold' }}>{formatCurrency(totals.custoFerragens)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Espessura Chapa (ms):</span>
                        <input 
                          type="number" 
                          style={inputConfigStyle} 
                          value={config?.espessura_chapa_padrao || 15} 
                          onChange={(e) => api.orcamentoTecnico.updateConfig({ espessura_chapa_padrao: Number(e.target.value) }).then(loadTree)}
                        />
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recuo Fundo (ms):</span>
                        <input 
                          type="number" 
                          style={inputConfigStyle} 
                          value={config?.recuo_fundo_padrao || 10}
                          onChange={(e) => api.orcamentoTecnico.updateConfig({ recuo_fundo_padrao: Number(e.target.value) }).then(loadTree)}
                        />
                     </div>
                  </div>
              </div>

              <div style={cardStyle}>
                 <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>MÃO DE OBRA</p>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>Produção ({((config?.mo_producao_pct_padrao || 0) * 100).toFixed(0)}%):</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(totals.moProducao)}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>Instalação ({((config?.mo_instalacao_pct_padrao || 0) * 100).toFixed(0)}%):</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(totals.moInstalacao)}</span>
                 </div>
              </div>

              <div style={{ background: 'rgba(212,175,55,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(212,175,55,0.2)' }}>
                 <p style={{ fontSize: '0.75rem', color: '#d4af37', marginBottom: '0.5rem', fontWeight: 'bold' }}>PREÇO FINAL SUGERIDO</p>
                 <h2 style={{ fontSize: '2rem', margin: 0, color: '#d4af37', fontWeight: '900' }}>{formatCurrency(totals.precoVenda)}</h2>
                 <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Com markup de {config?.markup_padrao}x</p>
              </div>

              <div style={{ ...cardStyle, background: 'rgba(0,0,0,0.3)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custo Total:</span>
                    <span style={{ fontSize: '0.8rem' }}>{formatCurrency(totals.custoTotal)}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Imposto (~{config?.aliquota_imposto}%):</span>
                    <span style={{ fontSize: '0.8rem', color: '#ff4d4d' }}>- {formatCurrency(totals.imposto)}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                    <span style={{ color: totals.margemReal < (config?.margem_minima_alerta || 0) ? '#ff4d4d' : '#10b981' }}>
                      Margem Real:
                    </span>
                    <span style={{ color: totals.margemReal < (config?.margem_minima_alerta || 0) ? '#ff4d4d' : '#10b981' }}>
                      {(totals.margemReal * 100).toFixed(1)}%
                    </span>
                 </div>
                 {totals.margemReal < (config?.margem_minima_alerta || 0) && (
                   <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,0,0,0.1)', color: '#ff4d4d', fontSize: '0.65rem', borderRadius: '4px' }}>
                     ⚠️ Abaixo do limite de {((config?.margem_minima_alerta || 0) * 100).toFixed(0)}%
                   </div>
                 )}
              </div>

              <div style={cardStyle}>
                 <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>DADOS TÉCNICOS</p>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem' }}>Área Total:</span>
                    <span style={{ fontWeight: 'bold' }}>{totals.totalM2.toFixed(2)} m²</span>
                 </div>
              </div>

           </div>
        </aside>
      </div>

      {/* Modais */}
      {showAmbienteModal && <AmbienteModal onClose={() => setShowAmbienteModal(false)} onSave={handleAddAmbiente} />}
      {showMovelModal && <MovelModal onClose={() => setShowMovelModal(false)} onSave={handleAddMovel} />}
    </div>
  );
};

export default CompositorOrcamento;

