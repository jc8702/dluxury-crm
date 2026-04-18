import React, { useState, useEffect } from 'react';
import { 
  Scissors, Plus, Save, Trash2, Maximize, ZoomIn, ZoomOut, 
  Printer, FileText, Download, Layout, Layers, RefreshCcw,
  Maximize2
} from 'lucide-react';
import { api } from '../lib/api';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import type { 
  PecaInput, 
  GrupoMaterial, 
  ResultadoPlano
} from '../utils/planodeCorte';
import type { Superficie } from '../utils/planodeCorte';
import { calcularPlanoCorte } from '../utils/planodeCorte';
import PlanoCorteVisual from '../components/production/PlanoCorteVisual';

const CuttingPlanPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [plano, setPlano] = useState<any>(null);
  const [grupos, setGrupos] = useState<GrupoMaterial[]>([]);
  const [pecas, setPecas] = useState<PecaInput[]>([]);
  const [resultado, setResultado] = useState<ResultadoPlano | null>(null);
  const [activeGrupoIdx, setActiveGrupoIdx] = useState(0);
  const [activeChapaIdx, setActiveChapaIdx] = useState(0);
  const [highlightPecaId, setHighlightPecaId] = useState<string | null>(null);
  const [kerf, setKerf] = useState(3);
  const [iteracoes] = useState(3);
  const [showImportModal, setShowImportModal] = useState(false);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);

  useEffect(() => {
    const loadPlano = async () => {
      setLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
          const res = await api.planoCorte.get(id);
          if (res) {
            setPlano(res);
            setGrupos(res.grupos || []);
            setPecas(res.pecas || []);
          }
        } else {
          setPlano({ nome: 'Novo Plano de Corte', status: 'rascunho' });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadPlano();
  }, []);

  useEffect(() => {
    if (showImportModal) {
      api.get('/api/orcamentos?status=aprovado').then(res => {
        if (res.success) setOrcamentos(res.data);
      });
    }
  }, [showImportModal]);

  const handleCalcular = () => {
    if (grupos.length === 0 || pecas.length === 0) return;
    setLoading(true);
    setTimeout(() => {
      const res = calcularPlanoCorte(pecas, grupos, iteracoes);
      setResultado(res);
      setLoading(false);
    }, 300);
  };

  const addGrupo = (material: any) => {
    setGrupos([...grupos, {
      id: Math.random().toString(36).substring(7),
      materialId: material.id || '',
      sku: material.sku,
      nomeMaterial: material.nome,
      larguraChapaMm: 2750,
      alturaChapaMm: 1830,
      espessuraMm: 18,
      precoChapa: 0,
      chapasAdicionaisManual: 0,
      retalhosDisponiveis: [],
      kerfMm: kerf
    }]);
  };

  const addPeca = (grupoId: string) => {
    setPecas([...pecas, {
      id: Math.random().toString(36).substring(7),
      descricao: `Peça ${pecas.length + 1}`,
      larguraMm: 0, alturaMm: 0, quantidade: 1, podeRotacionar: true,
      grupoMaterialId: grupoId
    }]);
  };

  const updatePeca = (id: string, data: Partial<PecaInput>) => {
    setPecas(pecas.map(p => p.id === id ? { ...p, ...data } : p));
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
              // Encontra ou cria o grupo de material
              let grupo = novosGrupos.find(g => g.materialId === peca.material_id || g.sku === peca.sku);
              if (!grupo) {
                grupo = {
                  id: Math.random().toString(36).substring(7),
                  materialId: peca.material_id || '',
                  sku: peca.sku || 'CHP-MDF-PADRAO',
                  nomeMaterial: peca.descricao_material || 'Material a Definir',
                  larguraChapaMm: 2750, 
                  alturaChapaMm: 1830, 
                  espessuraMm: 15, // Padrão
                  precoChapa: 0,
                  chapasAdicionaisManual: 0, 
                  retalhosDisponiveis: [], 
                  kerfMm: kerf
                };
                novosGrupos.push(grupo);
              }

              // Adiciona a peça com as dimensões e referências corretas
              novasPecas.push({
                id: Math.random().toString(36).substring(7),
                descricao: peca.descricao_peca || 'Peça sem nome',
                larguraMm: Number(peca.largura_cm) * 10,
                alturaMm: Number(peca.altura_cm) * 10,
                quantidade: Number(peca.quantidade),
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
      alert("Falha ao importar orçamento. Verifique o console.");
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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plano_corte_${plano?.nome}.csv`;
    link.click();
  };

  const activeGrupo = grupos[activeGrupoIdx];
  const activeResultadoGrupo = resultado?.grupos.find(g => g.grupoId === activeGrupo?.id);
  const activeSuperficie = activeResultadoGrupo?.superficies[activeChapaIdx];

  return (
    <div className="animate-fade-in" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh', 
      background: 'var(--background)', 
      color: 'var(--text)', 
      overflow: 'hidden' 
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* TOP BAR */}
        <div className="glass" style={{ 
          padding: '0.75rem 1.5rem', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'between',
          gap: '1rem',
          background: 'rgba(17, 24, 39, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scissors className="text-[#E2AC00] w-5 h-5" />
              <input 
                value={plano?.nome || ''} 
                onChange={e => setPlano({ ...plano, nome: e.target.value })}
                className="input-base"
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '2px 8px', width: '250px', fontWeight: '800', fontSize: '1.1rem' }}
                placeholder="NOME DO PLANO"
              />
            </div>
            <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Kerf (mm):</span>
              <input type="number" value={kerf} onChange={e => setKerf(Number(e.target.value))} style={{ background: 'transparent', border: 'none', color: '#E2AC00', fontWeight: 'bold', width: '30px', textAlign: 'center', outline: 'none' }} />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setShowImportModal(true)} className="btn btn-outline" style={{ height: '40px' }}>
              <FileText className="w-4 h-4" /> Importar
            </button>
            <button onClick={handleCalcular} className="btn btn-primary" style={{ height: '40px', padding: '0 1.5rem' }}>
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> OTIMIZAR
            </button>
            <button className="btn btn-outline" style={{ height: '40px', background: 'rgba(255,255,255,0.03)' }}>
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        </div>

        {/* MAIN BODY */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT SIDEBAR (Inputs) */}
          <div style={{ 
            width: '380px', 
            background: 'rgba(0,0,0,0.2)', 
            borderRight: '1px solid var(--border)', 
            overflowY: 'auto', 
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Materiais</h3>
                <button onClick={() => addGrupo({ sku: 'CHP-MDF-18', nome: 'MDF 18mm' })} className="btn" style={{ padding: '4px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--primary-text)' }}><Plus size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {grupos.map((g, idx) => (
                  <div key={g.id} onClick={() => setActiveGrupoIdx(idx)} className="card glass" style={{ 
                    padding: '0.75rem 1rem', 
                    cursor: 'pointer',
                    borderColor: activeGrupoIdx === idx ? 'var(--primary)' : 'var(--border)',
                    background: activeGrupoIdx === idx ? 'rgba(212, 175, 55, 0.05)' : 'var(--surface)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{g.nomeMaterial}</span>
                      <Trash2 onClick={(e) => { e.stopPropagation(); setGrupos(grupos.filter(x => x.id !== g.id)); }} className="w-4 h-4 text-red-500 hover:scale-110" />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{g.larguraChapaMm} x {g.alturaChapaMm}mm | {g.sku}</div>
                  </div>
                ))}
              </div>
            </section>

            {activeGrupo && (
              <section className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Peças ({pecas.filter(p => p.grupoMaterialId === activeGrupo.id).length})</h3>
                  <button onClick={() => addPeca(activeGrupo.id)} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}>ADD PEÇA</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pecas.filter(p => p.grupoMaterialId === activeGrupo.id).map(p => (
                    <div key={p.id} className="card glass" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
                      <input value={p.descricao} onChange={e => updatePeca(p.id, { descricao: e.target.value })} className="input-base" style={{ fontSize: '0.75rem', flex: 1, padding: '4px 8px' }} />
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <input type="number" value={p.larguraMm} onChange={e => updatePeca(p.id, { larguraMm: Number(e.target.value) })} className="input-base" style={{ width: '45px', textAlign: 'center', padding: '4px 0', fontSize: '0.75rem' }} />
                        <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>×</span>
                        <input type="number" value={p.alturaMm} onChange={e => updatePeca(p.id, { alturaMm: Number(e.target.value) })} className="input-base" style={{ width: '45px', textAlign: 'center', padding: '4px 0', fontSize: '0.75rem' }} />
                      </div>
                      <input type="number" value={p.quantidade} onChange={e => updatePeca(p.id, { quantidade: Number(e.target.value) })} className="input-base" style={{ width: '35px', textAlign: 'center', padding: '4px 0', fontSize: '0.75rem', color: '#E2AC00', fontWeight: 'bold' }} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* CENTER CANVAS (Preview) */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: '40px', overflowX: 'auto' }}>
              {activeResultadoGrupo?.superficies.map((s, idx) => (
                <button 
                  key={s.id} 
                  onClick={() => setActiveChapaIdx(idx)} 
                  style={{ 
                    padding: '0 1rem', 
                    fontSize: '0.7rem', 
                    fontWeight: '800', 
                    border: 'none', 
                    cursor: 'pointer',
                    background: activeChapaIdx === idx ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                    color: activeChapaIdx === idx ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeChapaIdx === idx ? '2px solid var(--primary)' : 'none',
                    whiteSpace: 'nowrap'
                  }}>
                  {s.tipo === 'retalho' ? 'Retalho' : `Chapa ${idx + 1}`} ({s.aproveitamentoPct.toFixed(0)}%)
                </button>
              ))}
            </div>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              {activeSuperficie ? (
                <PlanoCorteVisual superficie={activeSuperficie} grupoMaterial={activeGrupo} highlightPecaId={highlightPecaId} />
              ) : (
                <div style={{ opacity: 0.1, textAlign: 'center' }}>
                  <Scissors size={120} style={{ margin: '0 auto 1.5rem' }} />
                  <p style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '0.2em' }}>OTIMIZAÇÃO PENDENTE</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR (Summary) */}
          <div style={{ width: '320px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Executivo</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card glass" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aproveitamento</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--success)' }}>{resultado?.aproveitamentoGeral.toFixed(1) || '0'}%</div>
              </div>

              <div className="card glass" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), transparent)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Material Necessário</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>{resultado?.grupos.reduce((acc, g) => acc + g.superficies.length, 0) || '0'} <span style={{ fontSize: '0.8rem' }}>CHAPAS</span></div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => window.print()} className="btn btn-outline" style={{ width: '100%', height: '48px' }}>
                <Printer className="w-5 h-5" /> Imprimir Etiquetas
              </button>
              <button onClick={handleExportCSV} className="btn btn-outline" style={{ width: '100%', height: '48px' }}>
                <Download className="w-5 h-5" /> Exportar CSV (Corte)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL IMPORT */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content animate-pop-in" style={{ width: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Importar do Orçamento</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
              {orcamentos.map(o => (
                <div key={o.id} onClick={() => handleImportOrcamento(o.id)} className="card glass hover-scale" style={{ padding: '1rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', color: 'var(--primary)' }}>#{o.numero}</span>
                    <span className="badge">{o.status}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{o.cliente_nome}</div>
                </div>
              ))}
              {orcamentos.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhum orçamento aprovado encontrado.</p>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-only { display: block !important; }
          .print-etiquetas { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; padding: 10mm; }
          .etiqueta { width: 95mm; height: 45mm; border: 1px solid #ddd; padding: 4mm; color: #000; font-family: sans-serif; }
          .etiqueta-header { display: flex; justify-content: space-between; font-size: 8pt; border-bottom: 1px solid #eee; margin-bottom: 2mm; }
          .etiqueta-dimensoes { font-size: 16pt; font-weight: 900; margin: 2mm 0; }
        }
      `}</style>
      
      <div className="hidden print-only">
        <div className="print-etiquetas">
          {resultado?.grupos.flatMap(g => g.superficies.flatMap(s => s.pecasPositionadas.map(p => (
            <div key={p.numeroEtiqueta} className="etiqueta">
              <div className="etiqueta-header"><span>D'LUXURY ERP</span><span>🏷️ {String(p.numeroEtiqueta).padStart(3, '0')}</span></div>
              <div style={{ fontWeight: 'bold' }}>{p.descricao}</div>
              <div className="etiqueta-dimensoes">{p.largura} × {p.altura} mm</div>
              <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>{p.ambiente} | {g.sku}</div>
            </div>
          ))))}
        </div>
      </div>
    </div>
  );
};

export default CuttingPlanPage;
