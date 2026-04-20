import React, { useState, useEffect } from 'react';
import { 
  Scissors, Plus, Save, Trash2, Maximize, ZoomIn, ZoomOut, 
  Printer, FileText, Download, Layout, Layers, RefreshCcw,
  Maximize2, Box, Info, Settings2
} from 'lucide-react';
import { api } from '../lib/api';
import type { 
  PecaInput, 
  GrupoMaterial, 
  ResultadoPlano
} from '../utils/planodeCorte';
import { calcularPlanoCorte } from '../utils/planodeCorte';
import PlanoCorteVisual from '../components/production/PlanoCorteVisual';

const ESPESSURAS_PADRAO = [6, 15, 18, 25];
const TIPOS_PADRAO = ['Branco', 'Madeirado', 'Lacca', 'Estrutura', 'Fundo'];

const CuttingPlanPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [plano, setPlano] = useState<any>({ nome: 'Novo Plano de Corte', status: 'rascunho' });
  const [grupos, setGrupos] = useState<GrupoMaterial[]>([]);
  const [pecas, setPecas] = useState<PecaInput[]>([]);
  const [resultado, setResultado] = useState<ResultadoPlano | null>(null);
  const [activeGrupoIdx, setActiveGrupoIdx] = useState(0);
  const [activeChapaIdx, setActiveChapaIdx] = useState(0);
  const [highlightPecaId, setHighlightPecaId] = useState<string | null>(null);
  const [kerf, setKerf] = useState(3);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [materiaisEstoque, setMateriaisEstoque] = useState<any[]>([]);

  // Carregar dados iniciais e materiais
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // 1. Carregar materiais do estoque para o seletor
        const mats = await api.estoque.list();
        setMateriaisEstoque(mats || []);

        // 2. Carregar plano se houver ID na URL
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
          const res = await api.planoCorte.get(id);
          if (res) {
            setPlano(res);
            setGrupos(res.grupos || []);
            setPecas(res.pecas || []);
          }
        }
      } catch (e) { 
        console.error('Erro na inicialização:', e);
      } finally { 
        setLoading(false); 
      }
    };
    init();
  }, []);

  // Carregar orçamentos quando o modal abrir
  useEffect(() => {
    if (showImportModal) {
      api.orcamentos.list().then(res => {
        // Filtra orçamentos aprovados ou recentes
        setOrcamentos(res || []);
      }).catch(console.error);
    }
  }, [showImportModal]);

  const handleCalcular = () => {
    if (grupos.length === 0 || pecas.length === 0) {
      alert("Adicione ao menos um material e uma peça.");
      return;
    }
    setLoading(true);
    // Pequeno delay para efeito visual e evitar travamento na thread principal
    setTimeout(() => {
      try {
        const res = calcularPlanoCorte(pecas, grupos, 3);
        setResultado(res);
      } catch (e) {
        console.error("Erro no cálculo:", e);
        alert("Erro ao calcular plano de corte. Verifique as dimensões das peças.");
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleSave = async () => {
    if (!resultado) {
      alert('Realize o cálculo antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      let currentPlanoId = plano.id;

      // 1. Se for um plano novo, cria primeiro no banco
      if (!currentPlanoId) {
        const createRes = await api.planoCorte.create({
          nome: plano.nome,
          status: 'calculado',
          // Outros campos se necessário
        });
        
        if (createRes.success && createRes.data) {
          currentPlanoId = createRes.data.id;
          setPlano(createRes.data);
          // Atualiza URL para refletir o ID criado
          navigate(`/plano-corte?id=${currentPlanoId}`, { replace: true });
        } else {
          throw new Error('Falha ao registrar novo plano no banco.');
        }
      }

      const payload = {
        plano_id: currentPlanoId,
        grupos: resultado.grupos.map(g => ({
          id: g.grupoId,
          totalChapas: g.totalChapasInteiras,
          totalRetalhos: g.totalRetalhosUsados,
          aproveitamento: g.aproveitamentoMedio,
          custoTotal: g.custoTotal
        })),
        resultados: resultado.grupos.flatMap(g => 
          g.superficies.flatMap(s => 
            s.pecasPositionadas.map(p => ({
              grupo_material_id: g.grupoId,
              numero_chapa: s.id.includes('inteira') ? parseInt(s.id.split('-')[1]) : 0,
              peca_id: p.pecaId,
              pos_x_mm: p.x,
              pos_y_mm: p.y,
              largura_final_mm: p.largura,
              altura_final_mm: p.altura,
              rotacionada: p.rotacionada,
              e_retalho: s.tipo === 'retalho',
              retalho_id: s.retalhoId,
              area_m2: p.areaMm2 / 1000000,
              custo_proporcional: p.custoProporcional
            }))
          )
        ),
        sobras: resultado.sobrasGeradas.map(s => ({
          grupo_material_id: s.superficieId,
          numero_chapa: s.superficieId.includes('inteira') ? parseInt(s.superficieId.split('-')[1]) : 0,
          pos_x_mm: s.x,
          pos_y_mm: s.y,
          largura_mm: s.largura,
          altura_mm: s.altura,
          area_m2: (s.largura * s.altura) / 1000000,
          aproveitavel: s.aproveitavel
        })),
        KPIs: {
          totalPecas: resultado.totalPecasPositionadas,
          totalChapas: resultado.totalChapasInteiras,
          totalRetalhos: resultado.totalRetalhosUsados,
          aproveitamento: resultado.aproveitamentoGeral,
          custoTotal: resultado.custoTotalMaterial,
          tempoCalculo: resultado.tempoCalculoMs
        }
      };

      const res = await api.planoCorte.save(payload);
      if (res.success) {
        alert('Plano de corte salvo com sucesso!');
        setPlano((prev: any) => ({ ...prev, status: 'calculado' }));
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addGrupoManual = (options: { nome: string, sku: string, espessura: number, tipo: string }) => {
    const novoGrupo: GrupoMaterial = {
      id: Math.random().toString(36).substring(7),
      materialId: '',
      sku: options.sku || 'MDF-GENERICO',
      nomeMaterial: `${options.nome} (${options.tipo})`,
      larguraChapaMm: 2750,
      alturaChapaMm: 1830,
      espessuraMm: options.espessura,
      precoChapa: 0,
      chapasAdicionaisManual: 0,
      retalhosDisponiveis: [],
      kerfMm: kerf
    };
    setGrupos([...grupos, novoGrupo]);
    setShowMaterialModal(false);
    setActiveGrupoIdx(grupos.length);
  };

  const addGrupoDoEstoque = (material: any) => {
    const novoGrupo: GrupoMaterial = {
      id: Math.random().toString(36).substring(7),
      materialId: material.id,
      sku: material.sku || material.codigo || 'MDF-STOCK',
      nomeMaterial: material.nome || material.descricao,
      larguraChapaMm: Number(material.largura) || 2750,
      alturaChapaMm: Number(material.altura) || 1830,
      espessuraMm: Number(material.espessura) || 18,
      precoChapa: Number(material.preco_custo) || 0,
      chapasAdicionaisManual: 0,
      retalhosDisponiveis: [],
      kerfMm: kerf
    };
    setGrupos([...grupos, novoGrupo]);
    setShowMaterialModal(false);
    setActiveGrupoIdx(grupos.length);
  };

  const addPeca = (grupoId: string) => {
    setPecas([...pecas, {
      id: Math.random().toString(36).substring(7),
      descricao: `Peça ${pecas.length + 1}`,
      larguraMm: 500, alturaMm: 400, quantidade: 1, podeRotacionar: true,
      grupoMaterialId: grupoId
    }]);
  };

  const updatePeca = (id: string, data: Partial<PecaInput>) => {
    setPecas(pecas.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const updateGrupo = (id: string, data: Partial<GrupoMaterial>) => {
    setGrupos(grupos.map(g => g.id === id ? { ...g, ...data } : g));
  };

  const handleImportOrcamento = async (orcId: string) => {
    setLoading(true);
    try {
      const tree = await api.orcamentoTecnico.getTree(orcId);
      if (tree && Array.isArray(tree)) {
        const novosGrupos = [...grupos];
        const novasPecas = [...pecas];

        tree.forEach(ambiente => {
          ambiente.moveis?.forEach((movel: any) => {
            movel.pecas?.forEach((peca: any) => {
              // Encontra ou cria o grupo de material baseado no SKU e Espessura
              const espessura = Number(peca.espessura) || 15;
              let grupo = novosGrupos.find(g => 
                (g.materialId === peca.material_id || g.sku === peca.sku) && 
                g.espessuraMm === espessura
              );

              if (!grupo) {
                grupo = {
                  id: Math.random().toString(36).substring(7),
                  materialId: peca.material_id || '',
                  sku: peca.sku || `MDF-${espessura}MM`,
                  nomeMaterial: peca.descricao_material || `MDF ${espessura}mm`,
                  larguraChapaMm: 2750, 
                  alturaChapaMm: 1830, 
                  espessuraMm: espessura,
                  precoChapa: 0,
                  chapasAdicionaisManual: 0, 
                  retalhosDisponiveis: [], 
                  kerfMm: kerf
                };
                novosGrupos.push(grupo);
              }

              novasPecas.push({
                id: Math.random().toString(36).substring(7),
                descricao: peca.descricao_peca || 'Peça Importada',
                larguraMm: Number(peca.largura_cm) * 10,
                alturaMm: Number(peca.altura_cm) * 10,
                quantidade: Number(peca.quantidade) || 1,
                podeRotacionar: peca.sentido_veio !== 'longitudinal' && peca.sentido_veio !== 'transversal',
                ambiente: ambiente.nome,
                movel: movel.nome,
                grupoMaterialId: grupo.id
              });
            });
          });
        });

        setGrupos(novosGrupos);
        setPecas(novasPecas);
        setShowImportModal(false);
      }
    } catch (e) { 
      console.error("Erro ao importar orçamento", e);
      alert("Falha ao importar peças. Verifique o formato do orçamento.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleExportCSV = () => {
    if (!resultado) return;
    const headers = ['Etiqueta', 'Descrição', 'L (mm)', 'A (mm)', 'Qtd', 'Material', 'Ambiente', 'Chapa'];
    const rows = resultado.grupos.flatMap(g => 
      g.superficies.flatMap(s => 
        s.pecasPositionadas.map(p => [
          p.numeroEtiqueta, p.descricao, p.largura, p.altura, 1, g.sku, p.ambiente, s.id
        ])
      )
    );
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([["\ufeff", csvContent].join("")], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plano_corte_${plano?.nome}.csv`;
    link.click();
  };

  const activeGrupo = grupos[activeGrupoIdx];
  const activeResultadoGrupo = resultado?.grupos.find(g => g.grupoId === activeGrupo?.id);
  const activeSuperficie = activeResultadoGrupo?.superficies[activeChapaIdx];

  // Estilos inline para compensar falta de Tailwind JIT e evitar tela preta
  const styles = {
    topBar: { padding: '1rem 1.5rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
    iconGold: { color: 'var(--primary)', width: '20px', height: '20px' },
    mainTitle: { background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '4px', width: '300px', fontWeight: '800', fontSize: '1.2rem', color: 'var(--text)' },
    sidebar: { width: '400px', background: 'var(--background)', borderRight: '1px solid var(--border)', overflowY: 'auto' as const, padding: '1.5rem', display: 'flex', flexDirection: 'column' as const, gap: '2rem' },
    cardActive: { border: '1px solid var(--primary)', background: 'rgba(212, 175, 55, 0.05)' },
    cardInactive: { border: '1px solid var(--border)', background: 'var(--surface)' },
    deleteIcon: { color: 'var(--danger)', cursor: 'pointer', width: '16px', height: '16px' }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)', color: 'var(--text)', overflow: 'hidden' }}>
      
      {/* HEADER / ACTIONS */}
      <div style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Scissors style={styles.iconGold} />
          <input 
            value={plano?.nome || ''} 
            onChange={e => setPlano({ ...plano, nome: e.target.value })}
            style={styles.mainTitle}
            placeholder="NOME DO PLANO"
          />
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '6px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)' }}>KERF:</span>
            <input type="number" value={kerf} onChange={e => setKerf(Number(e.target.value))} style={{ width: '35px', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', outline: 'none' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>mm</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowImportModal(true)} className="btn btn-outline"><FileText size={18} /> Orçamentos</button>
          <button onClick={handleCalcular} className="btn btn-primary" style={{ minWidth: '140px' }}>
            {loading ? <RefreshCcw size={18} className="animate-spin" /> : <RefreshCcw size={18} />} OTIMIZAR
          </button>
          <button onClick={handleSave} className="btn btn-outline" disabled={loading}>
            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Resultado'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* INPUT PANEL */}
        <div style={styles.sidebar}>
          
          {/* MATERIAIS */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>1. Materiais (Chapas)</h3>
              <button 
                onClick={() => setShowMaterialModal(true)} 
                className="btn btn-primary" 
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {grupos.map((g, idx) => (
                <div 
                  key={g.id} 
                  onClick={() => setActiveGrupoIdx(idx)}
                  className="card" 
                  style={{ 
                    padding: '1rem', 
                    cursor: 'pointer',
                    ...(activeGrupoIdx === idx ? styles.cardActive : styles.cardInactive)
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{g.nomeMaterial}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>SKU: {g.sku}</div>
                    </div>
                    <Trash2 
                      style={styles.deleteIcon}
                      onClick={(e) => { e.stopPropagation(); setGrupos(grupos.filter(x => x.id !== g.id)); }} 
                    />
                  </div>
                  
                  {/* Edição Rápida da Chapa */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>ALTURA (mm)</label>
                      <input type="number" value={g.alturaChapaMm} onChange={e => updateGrupo(g.id, { alturaChapaMm: Number(e.target.value) })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: '700', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>LARGURA (mm)</label>
                      <input type="number" value={g.larguraChapaMm} onChange={e => updateGrupo(g.id, { larguraChapaMm: Number(e.target.value) })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: '700', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>ESP.(mm)</label>
                      <input type="number" value={g.espessuraMm} onChange={e => updateGrupo(g.id, { espessuraMm: Number(e.target.value) })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '900', fontSize: '0.85rem' }} />
                    </div>
                  </div>
                </div>
              ))}
              {grupos.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '12px', opacity: 0.5 }}>
                  <Box size={24} style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.8rem' }}>Nenhum material adicionado</p>
                </div>
              )}
            </div>
          </section>

          {/* PEÇAS DO GRUPO ATIVO */}
          {activeGrupo && (
            <section className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>2. Peças ({pecas.filter(p => p.grupoMaterialId === activeGrupo.id).length})</h3>
                <button onClick={() => addPeca(activeGrupo.id)} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.7rem' }}>+ ADICIONAR</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', paddingRight: '4px' }}>
                {pecas.filter(p => p.grupoMaterialId === activeGrupo.id).map(p => (
                  <div key={p.id} className="card" style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--surface)' }}>
                    <input 
                      value={p.descricao} 
                      onChange={e => updatePeca(p.id, { descricao: e.target.value })} 
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.8rem', fontWeight: '600' }} 
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" value={p.larguraMm} onChange={e => updatePeca(p.id, { larguraMm: Number(e.target.value) })} style={{ width: '45px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', padding: '4px', fontSize: '0.75rem' }} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>x</span>
                      <input type="number" value={p.alturaMm} onChange={e => updatePeca(p.id, { alturaMm: Number(e.target.value) })} style={{ width: '45px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', padding: '4px', fontSize: '0.75rem' }} />
                    </div>
                    <input 
                      type="number" 
                      value={p.quantidade} 
                      onChange={e => updatePeca(p.id, { quantidade: Number(e.target.value) })} 
                      style={{ width: '30px', textAlign: 'center', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: '900', fontSize: '0.8rem' }} 
                    />
                    <Trash2 
                      size={14} 
                      style={{ color: 'var(--danger)', cursor: 'pointer', opacity: 0.5 }} 
                      onClick={() => setPecas(pecas.filter(x => x.id !== p.id))}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* VISUALIZATION CANVAS */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
          {/* TAB DE CHAPAS */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: '40px', overflowX: 'auto' }}>
            {activeResultadoGrupo?.superficies.map((s, idx) => (
              <button 
                key={s.id} 
                onClick={() => setActiveChapaIdx(idx)} 
                style={{ 
                  padding: '0 1.5rem', 
                  fontSize: '0.75rem', 
                  fontWeight: '800', 
                  border: 'none', 
                  cursor: 'pointer',
                  background: activeChapaIdx === idx ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  color: activeChapaIdx === idx ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeChapaIdx === idx ? '2px solid var(--primary)' : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}>
                {s.tipo === 'retalho' ? 'Retalho' : `Chapa ${idx + 1}`} ({s.aproveitamentoPct.toFixed(1)}%)
              </button>
            ))}
          </div>

          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
            {activeSuperficie ? (
              <PlanoCorteVisual superficie={activeSuperficie} grupoMaterial={activeGrupo} highlightPecaId={highlightPecaId} />
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.15 }}>
                <Scissors size={140} style={{ margin: '0 auto 1.5rem', color: 'var(--primary)' }} />
                <p style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.2em' }}>AGUARDANDO OTIMIZAÇÃO</p>
                <p style={{ fontSize: '0.8rem', fontWeight: '600' }}>Adicione materiais e peças para começar.</p>
              </div>
            )}
          </div>
          
          {/* RESUMO RÁPIDO BOTTOM */}
          {resultado && (
            <div className="glass" style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem', padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', border: '1px solid var(--border-strong)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eficiência Geral</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success)' }}>{resultado.aproveitamentoGeral.toFixed(1)}%</div>
              </div>
              <div style={{ height: '30px', width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chapas Usadas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>{resultado.totalChapasInteiras}</div>
              </div>
              <div style={{ height: '30px', width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Peças Processadas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{resultado.totalPecasPositionadas}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleExportCSV} className="btn btn-outline" style={{ height: '40px' }}><Download size={18} /> Exportar</button>
                <button onClick={() => window.print()} className="btn btn-outline" style={{ height: '40px' }}><Printer size={18} /> Etiquetas</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: SELEÇÃO DE MATERIAL (NOVO) */}
      {showMaterialModal && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)} onKeyDown={(e) => { if ((e as any).key === 'Escape') setShowMaterialModal(false); }} tabIndex={-1}>
          <div className="modal-content animate-pop-in" style={{ width: '800px', display: 'flex', gap: '2rem' }} onClick={e => e.stopPropagation()}>
            {/* Esquerda: Cadastro do Estoque */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid var(--border)', paddingRight: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Box className="text-[#E2AC00]" /> Selecionar do Estoque
              </h3>
              <div style={{ overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {materiaisEstoque.filter(m => m.categoria_id === 'chapas' || m.unidade === 'CHAPA').map(m => (
                  <div key={m.id} onClick={() => addGrupoDoEstoque(m)} className="card hover-scale" style={{ padding: '0.75rem', cursor: 'pointer', background: 'var(--surface-hover)' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{m.nome}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>{m.sku}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: '800' }}>E: {m.espessura || '?'}mm</span>
                    </div>
                  </div>
                ))}
                {materiaisEstoque.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Carregando estoque...</p>}
              </div>
            </div>

            {/* Direita: Adição Manual */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings2 className="text-[#E2AC00]" /> Configuração Manual
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="section" style={{ padding: '1rem' }}>
                  <label className="label-base">ESPESSURA</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {ESPESSURAS_PADRAO.map(e => (
                      <button 
                        key={e}
                        onClick={() => addGrupoManual({ nome: `MDF ${e}mm`, sku: `MDF-${e}MM`, espessura: e, tipo: 'Branco' })}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                      >
                        {e} mm
                      </button>
                    ))}
                  </div>
                </div>

                <div className="section" style={{ padding: '1rem' }}>
                  <label className="label-base">TIPOS RÁPIDOS</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {TIPOS_PADRAO.map(t => (
                      <button 
                        key={t}
                        onClick={() => addGrupoManual({ nome: `MDF ${t}`, sku: `MDF-${t.toUpperCase()}`, espessura: 18, tipo: t })}
                        className="btn btn-outline"
                        style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  * Você poderá ajustar as dimensões exatas da chapa após adicionar ao plano.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR ORÇAMENTO */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)} onKeyDown={(e) => { if ((e as any).key === 'Escape') setShowImportModal(false); }} tabIndex={-1}>
          <div className="modal-content animate-pop-in" style={{ width: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '900' }}>Importar do Orçamento</h2>
              <button onClick={() => setShowImportModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto' }}>
              {orcamentos.map(o => (
                <div key={o.id} onClick={() => handleImportOrcamento(o.id)} className="card hover-scale" style={{ padding: '1rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '900', color: 'var(--primary)' }}>#{o.numero}</span>
                    <span className="badge" style={{ background: o.status === 'aprovado' ? 'var(--success)' : 'var(--badge-bg)', color: 'white' }}>{o.status}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px', fontWeight: '600' }}>{o.cliente_nome || 'Cliente não identificado'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Criado em: {new Date(o.criado_em).toLocaleDateString()}</div>
                </div>
              ))}
              {orcamentos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  <p>Nenhum orçamento encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-only { display: block !important; }
          .print-etiquetas { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; padding: 10mm; }
          .etiqueta { width: 95mm; height: 45mm; border: 1px solid #000; padding: 4mm; color: #000; font-family: sans-serif; position: relative; }
          .etiqueta-header { display: flex; justify-content: space-between; font-size: 7pt; border-bottom: 1px solid #ddd; margin-bottom: 1mm; font-weight: bold; }
          .etiqueta-title { font-size: 10pt; font-weight: 800; margin-bottom: 1mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .etiqueta-dim { font-size: 18pt; font-weight: 900; margin: 1mm 0; }
          .etiqueta-footer { position: absolute; bottom: 4mm; left: 4mm; right: 4mm; font-size: 7pt; color: #666; display: flex; justify-content: space-between; }
        }
      `}</style>
      
      <div className="hidden print-only">
        <div className="print-etiquetas">
          {resultado?.grupos.flatMap(g => g.superficies.flatMap(s => s.pecasPositionadas.map(p => (
            <div key={`${p.pecaId}-${p.numeroEtiqueta}`} className="etiqueta">
              <div className="etiqueta-header">
                <span>D'LUXURY ERP</span>
                <span>#{String(p.numeroEtiqueta).padStart(3, '0')}</span>
              </div>
              <div className="etiqueta-title">{p.descricao}</div>
              <div className="etiqueta-dim">{p.largura} × {p.altura} <span style={{fontSize: '10pt'}}>mm</span></div>
              <div className="etiqueta-footer">
                <span>{p.ambiente} | {p.movel || 'Geral'}</span>
                <span style={{fontWeight: 'bold'}}>{g.sku}</span>
              </div>
            </div>
          ))))}
        </div>
      </div>
    </div>
  );
};

export default CuttingPlanPage;
