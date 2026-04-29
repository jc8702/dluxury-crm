'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Scissors, Plus, Save, Trash2, 
  Printer, FileText, Download, Layout, Layers, RefreshCcw,
  Box, Settings2, X, CheckCircle, FileUp, ChevronRight,
  Maximize2, ZoomIn, ZoomOut, Search, QrCode, Cpu, Clock
} from 'lucide-react';

import { HistoricoModal } from '../components/HistoricoModal';
import { api } from '@/lib/api';
import { CanvasAvancado } from '../components/CanvasAvancado';
import { ImportacaoModal } from '../components/ImportacaoModal';
import { exportarMapaCorte } from '../../application/usecases/ExportarMapaCorte';
import { exportarEtiquetas } from '../../application/usecases/ExportarEtiquetas';
import { exportarCNC, salvarArquivoCNC } from '../../application/usecases/ExportarCNC';
import { retalhosRepository } from '../../infrastructure/repositories/RetalhosRepository';
import { OtimizadorComRetalhos } from '../../domain/services/OtimizadorComRetalhos';
import { InsumosService } from '../../application/services/InsumosService';
import { EngineeringService } from '../../application/services/EngineeringService';
import { ThermalPrinterService } from '../../infrastructure/services/ThermalPrinterService';
import { ScrapScoringService } from '../../domain/services/ScrapScoringService';
import type { Peca, ResultadoOtimizacao, LayoutChapa } from '../../domain/entities/CuttingPlan';

// ────────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES E ESTILOS
// ────────────────────────────────────────────────────────────────────────────────

const ESPESSURAS_PADRAO = [6, 15, 18, 25];
const TIPOS_PADRAO = ['Branco', 'Madeirado', 'Lacca', 'Estrutura', 'Fundo'];

const STYLES = {
  glass: "glass rounded-xl",
  card: "card bg-surface border-border",
  cardActive: "card border-primary shadow-primary",
  input: "input",
  buttonPrimary: "btn btn-primary",
  buttonSecondary: "btn btn-outline",
  buttonOutline: "btn btn-outline"
};

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────────

export default function PlanoCorteIndustrialPage() {
  // --- ESTADO ---
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [chapaPadrao, setChapaPadrao] = useState({ largura: 2750, altura: 1830, sku: 'MDF-PADRAO' });
  const [kerf, setKerf] = useState(3);
  const [resultado, setResultado] = useState<any | null>(null);
  const [activeLayoutIdx, setActiveLayoutIdx] = useState(0);
  
  const activeLayout = useMemo(() => {
    return resultado?.layouts?.[activeLayoutIdx] || null;
  }, [resultado, activeLayoutIdx]);

  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [planoNome, setPlanoNome] = useState('NOVO PLANO DE CORTE');
  const [searchPeca, setSearchPeca] = useState('');
  
  const [cncConfig, setCncConfig] = useState({
    velocidadeCorte: 4500,
    profundidadeTotal: -18.5,
    profundidadePasso: 9.5,
    velocidadeMergulho: 1200,
    alturaSeguranca: 10,
    spindleRPM: 18000,
    leadInMm: 5
  });
  const [showCncSettings, setShowCncSettings] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [executionMode, setExecutionMode] = useState(false);
  const [pecasCortadas, setPecasCortadas] = useState<Set<string>>(new Set());
  const [termoBusca, setTermoBusca] = useState('');

  const otimizador = useMemo(() => new OtimizadorComRetalhos(retalhosRepository), []);

  const handleOtimizar = useCallback(async () => {
    if (pecas.length === 0) {
      alert('Adicione peças antes de otimizar.');
      return;
    }
    
    setLoading(true);
    setResultado(null); // Resetar resultado anterior

    try {
      console.log('Iniciando otimização robusta...');
      
      // Chamada ao otimizador que gerencia retalhos e chapas
      const res = await otimizador.otimizar(
        pecas, 
        { 
          largura_mm: chapaPadrao.largura, 
          altura_mm: chapaPadrao.altura, 
          sku: chapaPadrao.sku,
          espessura_mm: 18 // Padrão
        }, 
        'plano-' + Date.now()
      );

      if (!res || res.layouts.length === 0) {
        throw new Error('O otimizador não retornou nenhum layout. Verifique as dimensões das peças.');
      }

      setResultado(res);
      setActiveLayoutIdx(0);
      
      console.log('Otimização concluída com sucesso:', res);
    } catch (err: any) {
      console.error('Erro crítico na otimização:', err);
      alert('ERRO NA OTIMIZAÇÃO: ' + (err.message || 'Erro interno no processamento. Verifique o console.'));
    } finally {
      setLoading(false);
    }
  }, [pecas, chapaPadrao, otimizador]);

  const handleAddPecaManual = () => {
    const novaPeca: Peca = { id: `peca-${Date.now()}`, nome: `PEÇA ${pecas.length + 1}`, largura: 500, altura: 400, rotacionavel: true };
    setPecas([...pecas, novaPeca]);
  };

  const handleRemovePeca = (id: string) => setPecas(pecas.filter(p => p.id !== id));
  const handleUpdatePeca = (id: string, data: Partial<Peca>) => setPecas(pecas.map(p => p.id === id ? { ...p, ...data } : p));

  const handleImportarPecas = (pecasImportadas: any[]) => {
    const formatadas = pecasImportadas.map(p => ({
      id: `imp-${Math.random().toString(36).substr(2, 9)}`,
      nome: p.nome || p.descricao || 'PEÇA IMPORTADA',
      largura: p.largura_mm || p.largura || 0,
      altura: p.altura_mm || p.altura || 0,
      rotacionavel: p.rotacionavel ?? true
    }));
    setPecas([...pecas, ...formatadas]);
    setShowImportModal(false);
  };

  const handleExportarPDF = () => resultado && exportarMapaCorte(resultado);
  const handleExportarEtiquetas = () => {
    if (!resultado) return;
    const pecasTodas = resultado.layouts.flatMap(l => l.pecas_posicionadas);
    exportarEtiquetas(pecasTodas, 'PLANO-001');
  };

  const handleExportarCNC = () => {
    if (!resultado) return;
    const layout = resultado.layouts[activeLayoutIdx];
    const gcode = exportarCNC(layout, cncConfig);
    salvarArquivoCNC(gcode, `cnc-chapa-${activeLayoutIdx + 1}.nc`);
  };

  const handleAprovarProducao = async () => {
    if (!resultado) return;
    setLoading(true);
    try {
      await api.planoCorte.save({ nome: planoNome, materiais: [{ sku: chapaPadrao.sku, largura: chapaPadrao.largura, altura: chapaPadrao.altura }], resultado, kerf_mm: kerf });
      const materiaisConsumidos = resultado.layouts.map(l => ({ sku: l.chapa_sku, tipo: l.tipo, id_retalho: l.retalho_id, area_mm2: l.largura_original_mm * l.altura_original_mm }));
      const todasPecas = resultado.layouts.flatMap(l => l.pecas_posicionadas);
      const ferragens = EngineeringService.calcularFerragens(todasPecas);
      await api.planoCorte.aprovarProducao(materiaisConsumidos);
      try {
        await InsumosService.baixarFerragens(ferragens);
        await InsumosService.verificarENotificarFalta(materiaisConsumidos);
      } catch (e) { console.error(e); }
      alert('PRODUÇÃO APROVADA COM SUCESSO!');
    } catch (err: any) {
      alert('ERRO AO APROVAR: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePecaCortada = (pecaId: string) => {
    const newSet = new Set(pecasCortadas);
    if (newSet.has(pecaId)) newSet.delete(pecaId);
    else newSet.add(pecaId);
    setPecasCortadas(newSet);
  };

  const recomendacaoRetalho = useMemo(() => {
    if (!resultado || !resultado.layouts[activeLayoutIdx]) return null;
    const layout = resultado.layouts[activeLayoutIdx];
    return ScrapScoringService.avaliar(layout.largura_original_mm, layout.altura_original_mm * (1 - (layout.area_aproveitada_mm2 / (layout.largura_original_mm * layout.altura_original_mm))));
  }, [resultado, activeLayoutIdx]);

  const handleLoadPlanFromHistory = (plan: any) => {
    setResultado(plan.resultado);
    setPlanoNome(plan.nome);
    setShowHistorico(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--primary)', borderRadius: '12px' }}>
            <Scissors size={24} style={{ color: 'var(--primary-text)' }} />
          </div>
          <div>
            <input 
              className="input-base"
              style={{ fontSize: '1.5rem', fontWeight: '800', width: '400px', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)' }}
              value={planoNome}
              onChange={e => setPlanoNome(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📦 {pecas.length} PEÇAS</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📑 {resultado?.layouts.length || 0} CHAPAS</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setExecutionMode(!executionMode)}
            className={`btn ${executionMode ? 'btn-primary' : 'btn-outline'}`}
          >
            <CheckCircle size={16} /> {executionMode ? 'EXECUÇÃO ATIVA' : 'MODO EXECUÇÃO'}
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn btn-outline">
            <FileUp size={16} /> IMPORTAR
          </button>
          <button onClick={handleOtimizar} disabled={loading || pecas.length === 0} className="btn btn-primary">
            {loading ? <RefreshCcw className="animate-spin" size={16} /> : <Cpu size={16} />}
            {loading ? 'OTIMIZANDO...' : 'OTIMIZAR AGORA'}
          </button>
          <button onClick={() => setShowHistorico(true)} className="btn btn-outline">
            <Clock size={16} /> HISTÓRICO
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', height: 'calc(100vh - 250px)' }}>
        
        {/* SIDEBAR LISTA DE PEÇAS */}
        <aside className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>LISTA DE PEÇAS</h4>
            <button onClick={handleAddPecaManual} className="btn btn-outline" style={{ padding: '0.4rem' }}>
              <Plus size={16} />
            </button>
          </div>
          
          <input 
            className="input" 
            placeholder="🔍 BUSCAR POR NOME OU SKU..." 
            value={searchPeca}
            onChange={e => setSearchPeca(e.target.value)}
            style={{ fontSize: '0.75rem' }}
          />

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pecas.filter(p => {
              const termo = searchPeca.toUpperCase();
              return p.nome.toUpperCase().includes(termo) || 
                     (p.sku_chapa && p.sku_chapa.toUpperCase().includes(termo));
            }).map((p) => (
              <div key={p.id} className={`card ${executionMode ? 'opacity-80' : ''}`} style={{ padding: '1rem', background: 'var(--surface-hover)', border: executionMode ? '1px dashed var(--border)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input 
                    value={p.nome}
                    disabled={executionMode}
                    onChange={e => handleUpdatePeca(p.id, { nome: e.target.value.toUpperCase() })}
                    className="input-base"
                    style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: '700', fontSize: '0.8rem', cursor: executionMode ? 'not-allowed' : 'text' }}
                  />
                  {!executionMode && (
                    <button onClick={() => handleRemovePeca(p.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>LARGURA (MM)</label>
                    <input 
                      type="number" 
                      disabled={executionMode}
                      value={p.largura} 
                      onChange={e => handleUpdatePeca(p.id, { largura: Number(e.target.value) })} 
                      className="input" 
                      style={{ padding: '0.3rem', cursor: executionMode ? 'not-allowed' : 'text' }} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>ALTURA (MM)</label>
                    <input 
                      type="number" 
                      disabled={executionMode}
                      value={p.altura} 
                      onChange={e => handleUpdatePeca(p.id, { altura: Number(e.target.value) })} 
                      className="input" 
                      style={{ padding: '0.3rem', cursor: executionMode ? 'not-allowed' : 'text' }} 
                    />
                  </div>
                </div>
                {executionMode && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.6rem', color: 'var(--primary)', fontWeight: '700' }}>
                    🔒 BLOQUEADO PARA EXECUÇÃO
                  </div>
                )}
              </div>
            ))}
            {pecas.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, textAlign: 'center' }}>
                <Box size={48} />
                <p style={{ fontSize: '0.8rem', marginTop: '1rem' }}>NENHUMA PEÇA<br/>ADICIONADA</p>
              </div>
            )}
          </div>

          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>KERF (SERRA)</span>
              <input type="number" value={kerf} onChange={e => setKerf(Number(e.target.value))} className="input" style={{ width: '60px', padding: '0.2rem 0.5rem' }} />
            </div>
          </div>
        </aside>

        {/* ÁREA DO CANVAS / VISUALIZAÇÃO */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* TABS DE CHAPAS */}
          {resultado && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {resultado.layouts.map((l, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveLayoutIdx(idx)}
                  className={`chapa-tab ${activeLayoutIdx === idx ? 'active' : ''}`}
                >
                  CHAPA {idx + 1} <span style={{ opacity: 0.5 }}>({l.tipo})</span>
                </button>
              ))}
            </div>
          )}

          <div className="card glass" style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: 0 }}>
            {activeLayout ? (
              <CanvasAvancado 
                layout={activeLayout}
                chapaDimensoes={{ largura: activeLayout.largura_original_mm, altura: activeLayout.altura_original_mm }}
                executionMode={executionMode}
                pecasCortadasIds={pecasCortadas}
                onPecaClick={(p) => executionMode && togglePecaCortada(p.id)}
                recomendacaoRetalho={recomendacaoRetalho || undefined}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                <Layout size={64} style={{ marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>AGUARDANDO OTIMIZAÇÃO</h3>
                <p style={{ fontSize: '0.9rem' }}>ADICIONE AS PEÇAS E CLIQUE EM OTIMIZAR AGORA.</p>
              </div>
            )}

            {/* OVERLAY DE STATS */}
            {activeLayout && (
              <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', padding: '1.5rem', background: 'rgba(10,13,20,0.9)', borderRadius: '14px', border: '1px solid var(--border)', minWidth: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EFICIÊNCIA</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>
                    {((activeLayout.area_aproveitada_mm2 / (activeLayout.largura_original_mm * activeLayout.altura_original_mm)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', width: `${(activeLayout.area_aproveitada_mm2 / (activeLayout.largura_original_mm * activeLayout.altura_original_mm)) * 100}%`, borderRadius: '2px' }} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SIDEBAR DIREITA: RESUMO */}
        {resultado && (
          <aside className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800' }}>RESUMO DO PLANO</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--success)' }}>ECONOMIA EST.</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>R$ {(resultado.economia_retalhos_mm2 / 1000000 * 120).toFixed(2)}</div>
              </div>

              <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CHAPAS NOVAS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{resultado.chapas_novas_utilizadas} UNIDADES</div>
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={handleExportarPDF} className="btn btn-outline" style={{ width: '100%' }}>
                <FileText size={16} /> MAPA DE CORTE (PDF)
              </button>
              <button onClick={handleExportarEtiquetas} className="btn btn-outline" style={{ width: '100%' }}>
                <Printer size={16} /> ETIQUETAS
              </button>
              <button onClick={handleExportarCNC} className="btn btn-outline" style={{ width: '100%' }}>
                <Cpu size={16} /> ARQUIVO CNC (.NC)
              </button>
            </div>

            <button 
              onClick={handleAprovarProducao}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '1.25rem', fontSize: '1rem' }}
            >
              {loading ? <RefreshCcw className="animate-spin" /> : <CheckCircle size={20} />}
              APROVAR PRODUÇÃO
            </button>
          </aside>
        )}
      </div>

      {showImportModal && (
        <ImportacaoModal onImportar={handleImportarPecas} onFechar={() => setShowImportModal(false)} />
      )}

      {showCncSettings && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
             {/* ... conteúdo CNC ... */}
             <button onClick={() => setShowCncSettings(false)} className="btn btn-primary w-full">FECHAR</button>
          </div>
        </div>
      )}

      {showHistorico && (
        <HistoricoModal onFechar={() => setShowHistorico(false)} onLoadPlan={handleLoadPlanFromHistory} />
      )}
    </div>
  );
}
