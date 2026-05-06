import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Scissors, Plus, Save, Trash2, RefreshCcw,
  Box, Info, X, CheckCircle, ChevronRight,
  FileUp, Search, Wallet, TrendingUp, History, 
  ArrowUpCircle, ArrowDownCircle, Layout, Download,
  Layers, Maximize2, Settings2, Printer, FileText
} from 'lucide-react';
import { api } from '../lib/api';
import type { 
  PecaInput, 
  GrupoMaterial, 
  ResultadoPlano,
  Superficie
} from '../utils/planodeCorte';
import { useCuttingWorker } from '../modules/plano-corte/infrastructure/hooks/useCuttingWorker';
import { retalhosRepository } from '../modules/plano-corte/infrastructure/repositories/RetalhosRepository';
import { PainelRetalhos } from '../modules/plano-corte/ui/components/PainelRetalhos';
import { CanvasAvancado } from '../modules/plano-corte/ui/components/CanvasAvancado';
import { ImportadorEngenharia } from '../modules/plano-corte/ui/components/ImportadorEngenharia';
import { ExportacaoModal } from '../modules/plano-corte/ui/components/ExportacaoModal';
import { ImportacaoModal } from '../modules/plano-corte/ui/components/ImportacaoModal';
import { PrintEtiquetas } from '../modules/plano-corte/ui/components/PrintEtiquetas';
import { ModalMaterial } from '../modules/plano-corte/ui/components/ModalMaterial';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { Modal } from '../design-system/components/Modal';

interface PlanoCorteData {
  id?: string;
  nome: string;
  status: string;
  materiais?: GrupoMaterial[];
  resultado?: ResultadoPlano;
  orcamento_id?: string;
  projeto_id?: string;
  visita_id?: string;
  criado_em?: string;
}

interface ProjetoImport {
  id: string;
  title: string;
  tag?: string;
  status: string;
  client_name?: string;
  cliente_nome?: string;
  subtitle?: string;
  value: number;
}

const CuttingPlanPage: React.FC = () => {
  const { success, error, warning } = useToast();
  const [ConfirmDialogElement, confirmAction] = useConfirm();
  const navigate = useNavigate();
  const { calcular, isCalculating, progress } = useCuttingWorker();
  
  const [loading, setLoading] = useState(false);
  const [plano, setPlano] = useState<PlanoCorteData>({ nome: 'Novo Plano de Corte', status: 'rascunho' });
  const [grupos, setGrupos] = useState<GrupoMaterial[]>([]);
  const [pecas, setPecas] = useState<PecaInput[]>([]);
  const [resultado, setResultado] = useState<ResultadoPlano | null>(null);
  const [activeGrupoIdx, setActiveGrupoIdx] = useState(0);
  const [activeChapaIdx, setActiveChapaIdx] = useState(0);
  const [kerf, setKerf] = useState(3);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showIndustrialImport, setShowIndustrialImport] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPlanosModal, setShowPlanosModal] = useState(false);
  
  const [projetosParaImportar, setProjetosParaImportar] = useState<ProjetoImport[]>([]);
  const [materiaisEstoque, setMateriaisEstoque] = useState<any[]>([]);
  const [planosSalvos, setPlanosSalvos] = useState<PlanoCorteData[]>([]);
  
  const [searchParams] = useSearchParams();
  const currentUrlId = searchParams.get('id');

  // Carregar materiais e plano inicial
  useEffect(() => {
    api.estoque.list().then(setMateriaisEstoque).catch(console.error);
  }, []);

  // Reagir a mudanças de ID na URL para carregar o plano
  useEffect(() => {
    if (currentUrlId) {
      setLoading(true);
      api.planoCorte.get(currentUrlId).then(res => {
        if (res) {
          setPlano(res);
          if (res.materiais) setGrupos(res.materiais);
          if (res.resultado) setResultado(res.resultado);
        }
      }).catch(err => {
        console.error('Erro ao carregar plano:', err);
      }).finally(() => setLoading(false));
    }
  }, [currentUrlId]);

  // Carregar listas para os modais
  useEffect(() => {
    if (showImportModal) {
      api.projects.list().then(res => {
        const prjs = (Array.isArray(res) ? res : []).map((p: any) => ({
          ...p,
          type: 'project'
        }));
        setProjetosParaImportar(prjs);
      }).catch(console.error);
    }
    if (showPlanosModal) {
      api.planoCorte.list().then(setPlanosSalvos).catch(console.error);
    }
  }, [showImportModal, showPlanosModal]);

  const handleCalcular = async () => {
    if (grupos.length === 0 || pecas.length === 0) {
      warning("Adicione ao menos um material e uma peça.");
      return;
    }
    
    try {
      const res = await calcular(pecas, grupos, kerf);
      setResultado(res);
      setActiveChapaIdx(0);
    } catch (e: any) {
      console.error("Erro no cálculo:", e);
      error(`Erro ao calcular plano de corte: ${e.message || "Verifique as dimensões das peças"}`);
    }
  };

  const handleSave = async () => {
    if (!resultado) {
      warning('Realize o cálculo antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      let currentPlanoId = plano.id || currentUrlId;

      if (!currentPlanoId) {
        const createRes = await api.planoCorte.create({
          nome: plano.nome || 'Novo Plano',
          status: 'calculado',
          materiais: grupos,
          resultado: resultado
        });
        
        if (createRes && createRes.id) {
          currentPlanoId = createRes.id;
          setPlano(prev => ({ ...prev, id: currentPlanoId, status: 'calculado' }));
          navigate(`/plano-de-corte?id=${currentPlanoId}`, { replace: true });
          success("Plano criado e salvo com sucesso!");
        } else {
          throw new Error('Falha ao registrar novo plano.');
        }
      } else {
        const payload = {
          plano_id: currentPlanoId,
          materiais: grupos,
          resultado: resultado
        };

        const res = await api.planoCorte.save(payload);
        if (res) {
          success(`Plano atualizado com sucesso!`);
          setPlano(prev => ({ ...prev, id: currentPlanoId, status: 'calculado' }));
        }
      }

      // REGISTRAR NOVOS RETALHOS
      const areaMinima = 300 * 300;
      const sobrasAproveitaveis = resultado.sobrasGeradas.filter(s => 
        s.aproveitavel && (s.largura * s.altura >= areaMinima)
      );

      if (sobrasAproveitaveis.length > 0) {
        await Promise.all(sobrasAproveitaveis.map(async s => {
          const grupo = resultado.grupos.find(g => g.superficies.some(sup => sup.id === s.superficieId));
          const skuBase = grupo?.sku || 'MDF-GENERICO';

          try {
            return await retalhosRepository.salvarRetalho({
              sku_chapa: skuBase,
              largura_mm: s.largura,
              altura_mm: s.altura,
              espessura_mm: grupo?.espessuraMm || 15,
              origem: 'sobra_plano_corte',
              plano_corte_origem_id: currentPlanoId,
              projeto_origem: plano.nome,
              observacoes: `Gerado pelo Plano de Corte #${currentPlanoId}`,
              localizacao: 'Geral',
              usuario_criou: 'sistema'
            });
          } catch (e) {
            console.error("Erro ao registrar retalho no estoque:", e);
          }
        }));
      }
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err);
      error('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarProducao = async () => {
    if (!resultado || !plano.id) {
      warning("Salve o plano antes de aprovar a produção.");
      return;
    }

    const isConfirmed = await confirmAction({
      title: 'APROVAR PRODUÇÃO',
      description: 'CONFIRMA A APROVAÇÃO? ESTA AÇÃO REALIZA A BAIXA DE ESTOQUE E GERA A ORDEM DE PRODUÇÃO.'
    });
    if (!isConfirmed) return;

    setLoading(true);
    try {
      const consumo: Record<string, number> = {};
      resultado.grupos.forEach(g => {
        const sku = g.sku;
        const qtd = g.superficies.filter(s => s.tipo === 'inteira').length;
        if (qtd > 0) {
          consumo[sku] = (consumo[sku] || 0) + qtd;
        }
      });

      const materiaisConsumidos = Object.entries(consumo).map(([sku, qtd]) => ({ sku, qtd }));
      await api.planoCorte.aprovarProducao(materiaisConsumidos);

      const retalhosUtilizadosIds: string[] = [];
      resultado.grupos.forEach(g => {
        g.superficies.forEach(s => {
          if (s.retalhoId) {
            retalhosUtilizadosIds.push(s.retalhoId);
          }
        });
      });

      if (retalhosUtilizadosIds.length > 0) {
        await Promise.all(retalhosUtilizadosIds.map(id => 
          retalhosRepository.usarRetalho(id, plano.id!)
        ));
      }

      const totalPecas = resultado.grupos.reduce((acc, g) => 
        acc + g.superficies.reduce((accS, s) => accS + s.pecasPositionadas.length, 0), 0
      );

      const opId = `OP-${Date.now().toString().slice(-6)}`;

      await api.production.create({
        op_id: opId,
        produto: plano.nome || 'Plano de Corte',
        pecas: totalPecas,
        status: 'AGUARDANDO',
        orcamento_id: plano.orcamento_id || null,
        projeto_id: plano.projeto_id || null,
        visita_id: plano.visita_id || null,
        metadata: {
          plano_id: plano.id,
          materiais: grupos,
          resultado: resultado
        }
      });

      success(`PRODUÇÃO APROVADA! OP ${opId} GERADA COM SUCESSO.`);
      navigate('/producao');
    } catch (e) {
      console.error("Erro ao aprovar produção", e);
      error("FALHA AO APROVAR PRODUÇÃO.");
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

  const handleImportProjeto = async (prj: ProjetoImport) => {
    setLoading(true);
    try {
      const orcRes = await api.orcamentos.list();
      const approvedOrcs = (orcRes || []).filter((o: any) => 
        String(o.projeto_id) === String(prj.id) && o.status === 'aprovado'
      );

      if (approvedOrcs.length === 0) {
        warning("Este projeto não possui orçamentos aprovados.");
        setLoading(false);
        return;
      }

      const novosGrupos = [...grupos];
      const novasPecas = [...pecas];
      let totalImportado = 0;

      for (const orc of approvedOrcs) {
        const data = await api.orcamentoTecnico.getTree(orc.id);
        const tree = data.ambientes || [];
        let pecasParaProcessar: any[] = [];

        if (tree && Array.isArray(tree) && tree.length > 0) {
          tree.forEach((amb: any) => {
            amb.moveis?.forEach((mov: any) => {
              mov.pecas?.forEach((p: any) => {
                pecasParaProcessar.push({
                  ...p,
                  ambiente_nome: amb.nome,
                  movel_nome: mov.nome
                });
              });
            });
          });
        } else {
          const fullOrc = await api.orcamentos.get(orc.id);
          const itens = fullOrc.itens || [];
          itens.forEach((itm: any) => {
            if (itm.largura_cm > 0 && itm.altura_cm > 0) {
              pecasParaProcessar.push({
                descricao_peca: itm.descricao,
                largura_cm: itm.largura_cm,
                altura_cm: itm.altura_cm,
                quantidade: itm.quantidade || 1,
                sku: itm.material,
                ambiente_nome: itm.ambiente || 'Geral',
                movel_nome: itm.descricao,
                espessura_mm: 15
              });
            }
          });
        }

        pecasParaProcessar.forEach(peca => {
          const espessura = Number(peca.espessura_mm) || Number(peca.espessura) || 15;
          const pecaSku = peca.sku ? String(peca.sku).trim().toUpperCase() : null;

          let grupo = novosGrupos.find(g => 
            (peca.material_id && g.materialId === peca.material_id) || 
            (pecaSku && String(g.sku).trim().toUpperCase() === pecaSku)
          );

          if (grupo && grupo.espessuraMm !== espessura) grupo = undefined;

          if (!grupo) {
            grupo = {
              id: Math.random().toString(36).substring(7),
              materialId: peca.material_id || '',
              sku: pecaSku || `MDF-${espessura}MM`,
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
            larguraMm: Math.round(Number(peca.largura_cm) * 10),
            alturaMm: Math.round(Number(peca.altura_cm) * 10),
            quantidade: Number(peca.quantidade) || 1,
            podeRotacionar: peca.sentido_veio !== 'longitudinal' && peca.sentido_veio !== 'transversal',
            ambiente: peca.ambiente_nome || 'Geral',
            movel: peca.movel_nome || 'Geral',
            grupoMaterialId: grupo.id
          });
          totalImportado++;
        });
      }

      setGrupos(novosGrupos);
      setPecas(novasPecas);
      setShowImportModal(false);
      
      if (totalImportado > 0) {
        success(`${totalImportado} peças importadas com sucesso!`);
      }
    } catch (e) { 
      error("FALHA AO IMPORTAR PEÇAS.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleImportIndustrial = (pecasImportadas: any[]) => {
    const novosGrupos = [...grupos];
    const novasPecas = [...pecas];

    pecasImportadas.forEach(p => {
      const skuMaterial = p.sku_chapa || 'MDF-PADRAO';
      let grupo = novosGrupos.find(g => g.sku === skuMaterial);
      
      if (!grupo) {
        grupo = {
          id: Math.random().toString(36).substring(7),
          materialId: '',
          sku: skuMaterial,
          nomeMaterial: `Material ${skuMaterial}`,
          larguraChapaMm: 2750, 
          alturaChapaMm: 1830, 
          espessuraMm: p.espessura_mm || 15,
          precoChapa: 0,
          chapasAdicionaisManual: 0, 
          retalhosDisponiveis: [], 
          kerfMm: kerf
        };
        novosGrupos.push(grupo);
      }
      
      novasPecas.push({
        id: Math.random().toString(36).substring(7),
        descricao: p.nome || 'Peça Importada',
        larguraMm: p.largura_mm || p.largura,
        alturaMm: p.altura_mm || p.altura,
        quantidade: p.quantidade || 1,
        podeRotacionar: p.rotacionavel ?? true,
        grupoMaterialId: grupo.id
      });
    });

    setGrupos(novosGrupos);
    setPecas(novasPecas);
    setShowIndustrialImport(false);
  };

  const handleImportDae = (pecasDae: PecaInput[]) => {
    const novosGrupos = [...grupos];
    const novasPecas = [...pecas];

    pecasDae.forEach(peca => {
      let grupo = novosGrupos.find(g => g.sku === peca.grupoMaterialId);
      if (!grupo) {
        grupo = {
          id: Math.random().toString(36).substring(7),
          materialId: '',
          sku: peca.grupoMaterialId,
          nomeMaterial: `Material ${peca.grupoMaterialId}`,
          larguraChapaMm: 2750, 
          alturaChapaMm: 1830, 
          espessuraMm: 15,
          precoChapa: 0,
          chapasAdicionaisManual: 0, 
          retalhosDisponiveis: [], 
          kerfMm: kerf
        };
        novosGrupos.push(grupo);
      }
      
      novasPecas.push({
        ...peca,
        id: Math.random().toString(36).substring(7),
        grupoMaterialId: grupo.id
      });
    });

    setGrupos(novosGrupos);
    setPecas(novasPecas);
    setShowImportModal(false);
  };

  const activeGrupo = grupos[activeGrupoIdx];
  const activeResultadoGrupo = resultado?.grupos.find(g => g.grupoId === activeGrupo?.id);
  const activeSuperficie = activeResultadoGrupo?.superficies[activeChapaIdx];

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden animate-fade-in">
      <ConfirmDialogElement />
      
      {/* HEADER INDUSTRIAL */}
      <header className="flex items-center justify-between p-6 bg-black/40 border-b border-white/5 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
            <Scissors className="text-primary w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Engenharia Industrial</span>
              <span className="h-1 w-1 rounded-full bg-primary/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Plano de Corte</span>
            </div>
            <input 
              value={plano?.nome || ''} 
              onChange={e => setPlano({ ...plano, nome: e.target.value })}
              className="bg-transparent border-none p-0 mt-1 text-2xl font-black italic tracking-tighter focus:outline-none focus:ring-0 w-[400px] text-white placeholder-white/20"
              placeholder="NOME DO PLANO"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass flex items-center gap-3 px-4 h-12 rounded-2xl border border-white/10 mr-4">
            <Settings2 size={16} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">KERF:</span>
            <input 
              type="number" 
              value={kerf} 
              onChange={e => setKerf(Number(e.target.value))} 
              className="w-10 bg-transparent border-none text-primary font-black text-sm outline-none focus:ring-0 p-0 text-center" 
            />
            <span className="text-[10px] font-bold text-muted-foreground">MM</span>
          </div>

          <button onClick={() => setShowPlanosModal(true)} className="btn btn-outline h-12 px-5 group">
            <History className="w-4 h-4 mr-2 group-hover:rotate-[-45deg] transition-transform" /> HISTÓRICO
          </button>
          
          <div className="h-8 w-[1px] bg-white/10 mx-2" />

          <button onClick={() => setShowIndustrialImport(true)} className="btn btn-outline h-12 px-5 border-blue-500/20 text-blue-400 hover:bg-blue-500/10">
            <FileUp size={18} className="mr-2" /> INDUSTRIAL
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn btn-outline h-12 px-5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
            <Box size={18} className="mr-2" /> PROJETOS
          </button>
          
          <button 
            onClick={handleCalcular} 
            className="btn btn-primary h-12 px-6 font-black italic tracking-tight shadow-lg shadow-primary/20" 
            disabled={isCalculating}
          >
            {isCalculating ? <RefreshCcw size={18} className="animate-spin mr-2" /> : <RefreshCcw size={18} className="mr-2" />} 
            {isCalculating ? `OTIMIZANDO (${progress}%)` : 'OTIMIZAR'}
          </button>

          <button onClick={handleSave} className="btn btn-outline h-12 px-5" disabled={loading}>
            <Save size={18} className="mr-2" /> SALVAR
          </button>

          <button 
            onClick={handleAprovarProducao} 
            className="btn h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black italic tracking-tight shadow-lg shadow-emerald-600/20 border-none" 
            disabled={loading || !resultado || !plano.id}
          >
            <CheckCircle size={18} className="mr-2" /> APROVAR
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR DE INPUTS */}
        <aside className="w-[420px] bg-black/20 border-r border-white/5 flex flex-col overflow-hidden backdrop-blur-sm">
          
          {/* MATERIAIS */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Layers className="text-primary w-4 h-4" />
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">01. MATERIAIS (CHAPAS)</h3>
              </div>
              <button 
                onClick={() => setShowMaterialModal(true)} 
                className="w-8 h-8 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center hover:bg-primary/20 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
              {grupos.map((g, idx) => (
                <div 
                  key={g.id} 
                  onClick={() => setActiveGrupoIdx(idx)}
                  className={`glass-elevated group relative transition-all duration-300 p-5 rounded-[2rem] border cursor-pointer ${
                    activeGrupoIdx === idx ? 'border-primary/40 bg-primary/5' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{g.sku}</div>
                      <h4 className="text-base font-black italic tracking-tight">{g.nomeMaterial}</h4>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGrupos(grupos.filter(x => x.id !== g.id)); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic block mb-1">ALTURA</span>
                      <input 
                        type="number" 
                        value={g.alturaChapaMm} 
                        onChange={e => updateGrupo(g.id, { alturaChapaMm: Number(e.target.value) })} 
                        className="w-full bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0" 
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic block mb-1">LARGURA</span>
                      <input 
                        type="number" 
                        value={g.larguraChapaMm} 
                        onChange={e => updateGrupo(g.id, { larguraChapaMm: Number(e.target.value) })} 
                        className="w-full bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0" 
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest italic block mb-1">ESP.</span>
                      <input 
                        type="number" 
                        value={g.espessuraMm} 
                        onChange={e => updateGrupo(g.id, { espessuraMm: Number(e.target.value) })} 
                        className="w-full bg-transparent border-none p-0 text-sm font-black text-primary focus:ring-0" 
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {grupos.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-30">
                  <Box className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest italic">Nenhum material</p>
                </div>
              )}
            </div>
          </div>

          {/* PEÇAS */}
          {activeGrupo && (
            <div className="h-[400px] border-t border-white/5 bg-black/40 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Scissors className="text-primary w-4 h-4" />
                  <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">
                    02. PEÇAS ({pecas.filter(p => p.grupoMaterialId === activeGrupo.id).length})
                  </h3>
                </div>
                <button 
                  onClick={() => addPeca(activeGrupo.id)}
                  className="px-4 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all"
                >
                  + ADICIONAR
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {pecas.filter(p => p.grupoMaterialId === activeGrupo.id).map(p => (
                  <div key={p.id} className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-2xl flex items-center gap-4 transition-all group">
                    <input 
                      value={p.descricao} 
                      onChange={e => updatePeca(p.id, { descricao: e.target.value })} 
                      className="flex-1 bg-transparent border-none p-0 text-xs font-bold text-white focus:ring-0 truncate" 
                    />
                    <div className="flex items-center gap-1">
                      <input type="number" value={p.larguraMm} onChange={e => updatePeca(p.id, { larguraMm: Number(e.target.value) })} className="w-11 bg-black/40 border-none rounded-lg text-center text-[10px] font-bold p-1 focus:ring-1 focus:ring-primary/40" />
                      <span className="text-[8px] text-white/20">×</span>
                      <input type="number" value={p.alturaMm} onChange={e => updatePeca(p.id, { alturaMm: Number(e.target.value) })} className="w-11 bg-black/40 border-none rounded-lg text-center text-[10px] font-bold p-1 focus:ring-1 focus:ring-primary/40" />
                    </div>
                    <div className="w-10 flex flex-col items-center">
                      <span className="text-[7px] font-black text-primary opacity-50 uppercase tracking-tighter">QTD</span>
                      <input 
                        type="number" 
                        value={p.quantidade} 
                        onChange={e => updatePeca(p.id, { quantidade: Number(e.target.value) })} 
                        className="w-full bg-transparent border-none p-0 text-center text-xs font-black text-primary focus:ring-0" 
                      />
                    </div>
                    <button 
                      onClick={() => setPecas(pecas.filter(x => x.id !== p.id))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ÁREA DE VISUALIZAÇÃO */}
        <div className="flex-1 relative flex flex-col bg-black/60 overflow-hidden">
          
          {/* TABS DE CHAPAS */}
          <div className="flex bg-black/40 border-b border-white/5 backdrop-blur-sm h-14 shrink-0 overflow-x-auto scrollbar-none">
            {activeResultadoGrupo?.superficies.map((s, idx) => (
              <button 
                key={s.id} 
                onClick={() => setActiveChapaIdx(idx)} 
                className={`flex items-center px-8 h-full text-[10px] font-black uppercase tracking-widest italic border-r border-white/5 transition-all whitespace-nowrap ${
                  activeChapaIdx === idx 
                    ? 'bg-primary text-black' 
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex flex-col items-start leading-none">
                  <span className="mb-1">{s.tipo === 'retalho' ? 'RETALHO' : `CHAPA ${idx + 1}`}</span>
                  <span className={`text-[8px] ${activeChapaIdx === idx ? 'text-black/60' : 'text-primary/60'}`}>
                    {Number(s.aproveitamentoPct || 0).toFixed(1)}% EFICIÊNCIA
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center justify-center relative p-8">
            {activeSuperficie ? (
              <div className="w-full h-full flex items-center justify-center animate-pop-in">
                <CanvasAvancado 
                  layout={activeSuperficie} 
                  chapaDimensoes={{ 
                    largura: Number(activeGrupo?.larguraChapaMm || 2750), 
                    altura: Number(activeGrupo?.alturaChapaMm || 1830) 
                  }} 
                />
              </div>
            ) : (
              <div className="text-center space-y-6 opacity-20 group">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary blur-[80px] rounded-full opacity-20 group-hover:opacity-40 transition-opacity" />
                  <Scissors size={140} className="relative text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black italic tracking-[0.3em] uppercase">Aguardando Engenharia</h2>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                    Configure os materiais e peças no painel lateral
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* PAINEL DE MÉTRICAS BOTTOM */}
          {resultado && (
            <div className="p-8 pb-10">
              <div className="glass-elevated bg-primary/5 rounded-[2.5rem] border border-primary/20 p-8 flex items-center justify-between backdrop-blur-xl shadow-2xl shadow-black/40 animate-slide-up">
                <div className="flex gap-12">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-primary" /> EFICIÊNCIA GLOBAL
                    </div>
                    <div className="text-4xl font-black italic tracking-tighter text-primary">
                      {Number(resultado.aproveitamentoGeral || 0).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="w-[1px] h-12 bg-white/10" />

                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic flex items-center gap-2">
                      <Box className="w-3 h-3 text-blue-400" /> CONSUMO DE CHAPAS
                    </div>
                    <div className="text-4xl font-black italic tracking-tighter">
                      {resultado.totalChapasInteiras} <span className="text-sm text-muted-foreground ml-1">UNIDADES</span>
                    </div>
                  </div>

                  <div className="w-[1px] h-12 bg-white/10" />

                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> PEÇAS PROCESSADAS
                    </div>
                    <div className="text-4xl font-black italic tracking-tighter">
                      {resultado.totalPecasPositionadas}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowExportModal(true)} 
                  className="btn btn-primary h-16 px-10 font-black italic text-lg tracking-tight shadow-xl shadow-primary/20 flex items-center gap-4"
                >
                  <Download size={24} /> EXPORTAR PRODUÇÃO
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: EXPORTAÇÃO */}
      {showExportModal && resultado && (
        <ExportacaoModal
          resultado={resultado}
          planoNome={plano?.nome || 'Novo Plano'}
          activeSuperficie={activeSuperficie}
          activeChapaIdx={activeChapaIdx}
          kerfMm={activeGrupo?.kerfMm || kerf}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* MODAL: HISTÓRICO DE PLANOS */}
      <Modal isOpen={showPlanosModal} onClose={() => setShowPlanosModal(false)} title="HISTÓRICO DE ENGENHARIA" width="700px">
        <div className="space-y-6 p-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50" />
            <input 
              className="w-full bg-black/60 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all" 
              placeholder="Pesquisar planos salvos..."
            />
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {(planosSalvos || []).map(p => (
              <div 
                key={p.id} 
                className="glass-elevated group p-6 rounded-[2rem] border border-white/5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all flex justify-between items-center"
                onClick={() => {
                  navigate(`/plano-de-corte?id=${p.id}`);
                  setShowPlanosModal(false);
                }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[8px] font-black px-2 py-0.5 bg-white/10 rounded text-muted-foreground uppercase tracking-widest">ID: {p.id?.slice(-6)}</span>
                    <h4 className="text-lg font-black italic tracking-tight group-hover:text-primary transition-colors">{p.nome}</h4>
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3 h-3" /> {p.criado_em ? new Date(p.criado_em).toLocaleString() : 'Data não informada'}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:border-primary/30 group-hover:text-primary transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))}
            
            {(!planosSalvos || planosSalvos.length === 0) && (
              <div className="p-20 text-center opacity-30">
                <History size={48} className="mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-widest italic">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL: SELEÇÃO DE MATERIAL */}
      {showMaterialModal && (
        <ModalMaterial 
          materiais={materiaisEstoque} 
          onAddEstoque={addGrupoDoEstoque} 
          onAddManual={addGrupoManual} 
          onClose={() => setShowMaterialModal(false)} 
        />
      )}

      {/* MODAL: IMPORTAÇÃO INDUSTRIAL */}
      {showIndustrialImport && (
        <ImportacaoModal 
          onImportar={handleImportIndustrial} 
          onFechar={() => setShowIndustrialImport(false)} 
        />
      )}

      {/* MODAL: IMPORTAR PROJETOS */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="IMPORTAR ENGENHARIA (TAG)" width="1200px">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-4">
          
          {/* Opção 1: Arquivos Externos */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                <FileUp className="text-blue-400 w-5 h-5" />
              </div>
              <h3 className="text-sm font-black italic uppercase tracking-widest text-blue-400">01. Arquivos CAD / Engineering</h3>
            </div>
            
            <div className="glass-elevated p-8 rounded-[2.5rem] border border-white/5 bg-blue-500/[0.02]">
              <ImportadorEngenharia onImport={handleImportDae} />
              <p className="text-[10px] text-muted-foreground mt-6 text-center leading-relaxed uppercase tracking-widest font-bold">
                Suporte nativo para arquivos .DAE, .XML e .CSV exportados do SketchUp, Promob e TopSolid.
              </p>
            </div>
          </div>

          {/* Opção 2: CRM/ERP */}
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Box className="text-emerald-400 w-5 h-5" />
              </div>
              <h3 className="text-sm font-black italic uppercase tracking-widest text-emerald-400">02. Projetos do Sistema (TAG)</h3>
            </div>
            
            <div className="flex-1 glass-elevated p-6 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col bg-emerald-500/[0.02]">
              <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 opacity-50" />
                <input className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold" placeholder="Pesquisar por TAG ou Cliente..." />
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {(projetosParaImportar || []).map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleImportProjeto(p)} 
                    className="group bg-black/40 border border-white/5 hover:border-emerald-500/40 p-5 rounded-[2rem] cursor-pointer transition-all flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black px-3 py-1 bg-emerald-500 text-black rounded-lg uppercase tracking-tighter italic">
                        {p.tag || `PRJ-${p.id}`}
                      </span>
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{p.status}</span>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-black italic tracking-tighter uppercase group-hover:text-emerald-400 transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">
                         👤 {p.client_name || p.cliente_nome || 'Cliente Interno'}
                      </p>
                    </div>

                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                      <div className="text-[10px] font-bold text-muted-foreground">VALOR ESTIMADO</div>
                      <div className="text-base font-black italic text-emerald-400">R$ {Number(p.value).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                ))}
                
                {(!projetosParaImportar || projetosParaImportar.length === 0) && (
                  <div className="p-20 text-center opacity-30">
                    <Box size={40} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest italic">Nenhum projeto identificado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
        <div className="p-4 pt-0">
           <button className="btn btn-outline w-full h-14 font-black italic tracking-widest mt-6" onClick={() => setShowImportModal(false)}>VOLTAR PARA ENGENHARIA</button>
        </div>
      </Modal>

      <PrintEtiquetas resultado={resultado} />
      {ConfirmDialogElement}
    </div>
  );
};

export default CuttingPlanPage;
