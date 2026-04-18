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
          const res = await api.get(`/api/plano-corte?action=buscar_plano_completo&id=${id}`);
          if (res.success) {
            setPlano(res.data);
            setGrupos(res.data.grupos || []);
            setPecas(res.data.pecas || []);
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
      const res = await api.get(`/api/orcamento-tecnico?orcamento_id=${orcId}`);
      if (res.success && res.data) {
        const novosGrupos = [...grupos];
        const novasPecas = [...pecas];
        for (const item of res.data) {
          let grupo = novosGrupos.find(g => g.nomeMaterial === item.material || g.sku === item.material);
          if (!grupo) {
            grupo = {
              id: Math.random().toString(36).substring(7),
              materialId: item.material_id || '',
              sku: item.material || 'CHP-MDF-PADRAO',
              nomeMaterial: item.material || 'Material a Definir',
              larguraChapaMm: 2750, alturaChapaMm: 1830, espessuraMm: 18, precoChapa: 0,
              chapasAdicionaisManual: 0, retalhosDisponiveis: [], kerfMm: kerf
            };
            novosGrupos.push(grupo);
          }
          novasPecas.push({
            id: Math.random().toString(36).substring(7),
            descricao: item.descricao,
            larguraMm: parseFloat(item.largura_cm) * 10,
            alturaMm: parseFloat(item.altura_cm) * 10,
            quantidade: item.quantidade,
            podeRotacionar: true,
            ambiente: item.ambiente,
            movel: item.tipo,
            grupoMaterialId: grupo.id
          });
        }
        setGrupos(novosGrupos);
        setPecas(novasPecas);
        setShowImportModal(false);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    <div className="flex flex-col h-full bg-[#0D2137] text-white overflow-hidden p-0">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-6 py-3 bg-[#162a45] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input 
              value={plano?.nome || ''} 
              onChange={e => setPlano({ ...plano, nome: e.target.value })}
              className="bg-transparent border-b border-white/20 focus:border-[#E2AC00] outline-none px-2 py-1 font-semibold text-lg w-64"
            />
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-slate-400">Kerf (mm):</span>
              <input type="number" value={kerf} onChange={e => setKerf(Number(e.target.value))} className="bg-transparent w-12 text-center text-[#E2AC00] font-bold outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCalcular} className="flex items-center gap-2 bg-[#E2AC00] text-[#0D2137] px-6 py-2 rounded-lg font-bold hover:bg-[#ffc107] transition-all">
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /> OTIMIZAR
            </button>
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10"><FileText className="w-5 h-5" /> Importar</button>
            <button className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"><Save className="w-5 h-5" /> Salvar</button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-[400px] bg-[#11233a] border-r border-white/10 overflow-y-auto p-6 space-y-8">
            <section>
              <div className="flex justify-between mb-4"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Materiais</h3><button onClick={() => addGrupo({ sku: 'MDF-BP', nome: 'MDF Branco' })} className="text-[#E2AC00]"><Plus className="w-5 h-5" /></button></div>
              {grupos.map((g, idx) => (
                <div key={g.id} onClick={() => setActiveGrupoIdx(idx)} className={`p-4 rounded-xl border mb-2 cursor-pointer ${activeGrupoIdx === idx ? 'bg-[#E2AC00]/10 border-[#E2AC00]' : 'bg-black/20 border-white/5'}`}>
                  <div className="font-bold flex justify-between">{g.nomeMaterial} <Trash2 onClick={() => setGrupos(grupos.filter(x => x.id !== g.id))} className="w-4 h-4 text-red-400" /></div>
                  <div className="text-xs text-slate-400">{g.larguraChapaMm}x{g.alturaChapaMm}mm | {g.sku}</div>
                </div>
              ))}
            </section>
            {activeGrupo && (
              <section>
                <div className="flex justify-between mb-4"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Peças</h3><button onClick={() => addPeca(activeGrupo.id)} className="bg-[#E2AC00] text-[#0D2137] px-2 py-1 rounded text-[10px] font-bold">ADD PEÇA</button></div>
                <div className="space-y-2">
                  {pecas.filter(p => p.grupoMaterialId === activeGrupo.id).map(p => (
                    <div key={p.id} className="p-3 rounded-lg bg-black/20 border border-white/5 flex gap-2 items-center">
                      <input value={p.descricao} onChange={e => updatePeca(p.id, { descricao: e.target.value })} className="bg-transparent text-xs flex-1 outline-none" />
                      <input type="number" value={p.larguraMm} onChange={e => updatePeca(p.id, { larguraMm: Number(e.target.value) })} className="bg-black/30 w-12 text-center text-[10px] rounded py-1" />
                      <input type="number" value={p.alturaMm} onChange={e => updatePeca(p.id, { alturaMm: Number(e.target.value) })} className="bg-black/30 w-12 text-center text-[10px] rounded py-1" />
                      <input type="number" value={p.quantidade} onChange={e => updatePeca(p.id, { quantidade: Number(e.target.value) })} className="bg-black/30 w-8 text-center text-[10px] rounded py-1" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="flex-1 bg-black/40 flex flex-col">
            <div className="flex bg-[#162a45] h-12 overflow-x-auto">
              {activeResultadoGrupo?.superficies.map((s, idx) => (
                <button key={s.id} onClick={() => setActiveChapaIdx(idx)} className={`px-4 text-xs font-bold uppercase ${activeChapaIdx === idx ? 'bg-[#0D2137] text-[#E2AC00] border-t-2 border-[#E2AC00]' : 'text-slate-400'}`}>
                  {s.tipo === 'retalho' ? 'Retalho' : `Chapa ${idx + 1}`} ({s.aproveitamentoPct.toFixed(0)}%)
                </button>
              ))}
            </div>
            <div className="flex-1 relative flex items-center justify-center p-8">
              {activeSuperficie ? <PlanoCorteVisual superficie={activeSuperficie} grupoMaterial={activeGrupo} highlightPecaId={highlightPecaId} /> : <div className="opacity-20 text-center"><Scissors className="w-20 h-20 mx-auto mb-4" /> CALCULANDO...</div>}
            </div>
          </div>

          <div className="w-[320px] bg-[#0D2137] border-l border-white/10 p-6 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Executivo</h3>
            <div className="flex-1 space-y-6">
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Aproveitamento</div>
                <div className="text-3xl font-black text-[#E2AC00]">{resultado?.aproveitamentoGeral.toFixed(1) || '0'}%</div>
              </div>
              <div className="bg-[#E2AC00] text-[#0D2137] p-4 rounded-2xl">
                <div className="text-[10px] font-black uppercase opacity-70">Investimento</div>
                <div className="text-2xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado?.custoTotalMaterial || 0)}</div>
              </div>
            </div>
            <div className="pt-6 space-y-2">
              <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 bg-white/5 h-12 rounded-xl hover:bg-white/10 text-sm font-bold"><Printer className="w-4 h-4" /> Etiquetas</button>
              <button onClick={handleExportCSV} className="w-full flex items-center justify-center gap-2 bg-white/5 h-12 rounded-xl hover:bg-white/10 text-sm font-bold"><Download className="w-4 h-4" /> CSV</button>
            </div>
          </div>
        </div>
      </div>
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#11233a] border border-white/10 rounded-2xl w-full max-w-xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center"><h2 className="text-lg font-bold">Importar Orçamento</h2><button onClick={() => setShowImportModal(false)}>X</button></div>
            <div className="p-6 space-y-2 max-h-[400px] overflow-y-auto">
              {orcamentos.map(o => (
                <div key={o.id} onClick={() => handleImportOrcamento(o.id)} className="p-4 bg-white/5 border border-white/5 hover:border-[#E2AC00] rounded-xl cursor-pointer">
                  <div className="font-bold text-[#E2AC00]">#{o.numero}</div>
                  <div className="text-xs">{o.cliente_nome}</div>
                </div>
              ))}
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
              <div className="font-bold text-xs truncate">{p.descricao}</div>
              <div className="etiqueta-dimensoes">{p.largura} × {p.altura} mm</div>
              <div className="text-[8px] mt-auto uppercase">{p.ambiente} | {g.sku}</div>
            </div>
          ))))}
        </div>
      </div>
    </div>
  );
};

export default CuttingPlanPage;
