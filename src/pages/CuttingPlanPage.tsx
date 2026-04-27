import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Scissors, Plus, Save, Trash2, Maximize, ZoomIn, ZoomOut, 
  Printer, FileText, Download, Layout, Layers, RefreshCcw,
  Maximize2, Box, Info, Settings2, X, CheckCircle, ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import type { 
  PecaInput, 
  GrupoMaterial, 
  ResultadoPlano
} from '../utils/planodeCorte';
import { useCuttingWorker } from '../modules/plano-corte/infrastructure/hooks/useCuttingWorker';
import { retalhosRepository } from '../modules/plano-corte/infrastructure/repositories/RetalhosRepository';
import { PainelRetalhos } from '../modules/plano-corte/ui/components/PainelRetalhos';
import { CanvasAvancado } from '../modules/plano-corte/ui/components/CanvasAvancado';
import { ImportadorEngenharia } from '../modules/plano-corte/ui/components/ImportadorEngenharia';
import { ExportacaoModal } from '../modules/plano-corte/ui/components/ExportacaoModal';
import { Search } from 'lucide-react';

const ESPESSURAS_PADRAO = [6, 15, 18, 25];
const TIPOS_PADRAO = ['Branco', 'Madeirado', 'Lacca', 'Estrutura', 'Fundo'];

const ModalMaterial = ({ materiais, onAddEstoque, onAddManual, onClose }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualEsp, setManualEsp] = useState(15);
  const [manualTipo, setManualTipo] = useState('Branco');

  const filtered = materiais.filter((m: any) => 
    (m.categoria_id === 'chapas' || m.unidade === 'CHAPA') &&
    (m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="modal-overlay hide-on-print" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} tabIndex={-1}>
      <div className="modal-content animate-pop-in" style={{ width: '800px', display: 'flex', gap: '2rem' }} onClick={e => e.stopPropagation()}>
        {/* Esquerda: Cadastro do Estoque */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid var(--border)', paddingRight: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box className="text-[#E2AC00]" /> Selecionar do Estoque
          </h3>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por Nome ou SKU..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 10px 8px 34px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
            />
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '450px', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
            {filtered.map((m: any) => (
              <div key={m.id} onClick={() => onAddEstoque(m)} className="card hover-scale" style={{ padding: '0.75rem', cursor: 'pointer', background: 'var(--surface-hover)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{m.nome}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>{m.sku}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '800' }}>E: {m.espessura || '?'}mm</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Nenhuma chapa encontrada.</p>}
          </div>
        </div>

        {/* Direita: Adição Manual */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings2 className="text-[#E2AC00]" /> Configuração Manual
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="section" style={{ padding: '1rem' }}>
              <label className="label-base">ESPESSURA (mm)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {ESPESSURAS_PADRAO.map(e => (
                  <button 
                    key={e}
                    onClick={() => setManualEsp(e)}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', padding: '0.4rem 0.6rem',
                      background: manualEsp === e ? 'var(--primary)' : 'transparent',
                      color: manualEsp === e ? '#000' : 'var(--text)',
                      border: `1px solid ${manualEsp === e ? 'var(--primary)' : 'var(--border)'}`
                    }}
                  >
                    {e}mm
                  </button>
                ))}
              </div>
            </div>

            <div className="section" style={{ padding: '1rem' }}>
              <label className="label-base">TIPO</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {TIPOS_PADRAO.map(t => (
                  <button 
                    key={t}
                    onClick={() => setManualTipo(t)}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', padding: '0.4rem 0.6rem',
                      background: manualTipo === t ? 'var(--primary)' : 'transparent',
                      color: manualTipo === t ? '#000' : 'var(--text)',
                      border: `1px solid ${manualTipo === t ? 'var(--primary)' : 'var(--border)'}`
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onAddManual({ nome: `MDF ${manualTipo}`, sku: `MDF-${manualTipo.toUpperCase()}-${manualEsp}MM`, espessura: manualEsp, tipo: manualTipo })}
              className="btn btn-primary mt-4" style={{ width: '100%' }}>
              + INSERIR CHAPA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CuttingPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { calcular, isCalculating, progress } = useCuttingWorker();
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [projetosParaImportar, setProjetosParaImportar] = useState<any[]>([]);
  const [materiaisEstoque, setMateriaisEstoque] = useState<any[]>([]);
  const [planosSalvos, setPlanosSalvos] = useState<any[]>([]);
  const [showPlanosModal, setShowPlanosModal] = useState(false);
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
          // O resultado e materiais podem vir no JSONB
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
      api.kanban.list().then(res => {
        // Filtra apenas projetos
        const prjs = (res || []).filter((i: any) => (i.type || '').toLowerCase() === 'project');
        setProjetosParaImportar(prjs);
      }).catch(console.error);
    }
    if (showPlanosModal) {
      api.planoCorte.list().then(setPlanosSalvos).catch(console.error);
    }
  }, [showImportModal, showPlanosModal]);

  const handleCalcular = async () => {
    if (grupos.length === 0 || pecas.length === 0) {
      alert("Adicione ao menos um material e uma peça.");
      return;
    }
    
    try {
      const res = await calcular(pecas, grupos, kerf);
      setResultado(res);
      setActiveChapaIdx(0);
    } catch (e: any) {
      console.error("Erro no cálculo:", e);
      alert(`Erro ao calcular plano de corte: ${e.message || "Verifique as dimensões das peças"}`);
    }
  };

  const handleSave = async () => {
    if (!resultado) {
      alert('Realize o cálculo antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      let currentPlanoId = plano.id || currentUrlId;

      if (!currentPlanoId) {
        // Criar novo
        const createRes = await api.planoCorte.create({
          nome: plano.nome || 'Novo Plano',
          status: 'calculado',
          materiais: grupos,
          resultado: resultado
        });
        
        if (createRes && createRes.id) {
          currentPlanoId = createRes.id;
          // IMPORTANTE: Atualiza o estado local imediatamente para destravar o botão
          setPlano(prev => ({ ...prev, id: currentPlanoId, status: 'calculado' }));
          
          navigate(`/plano-de-corte?id=${currentPlanoId}`, { replace: true });
          alert("Plano criado e salvo com sucesso!");
        } else {
          throw new Error('Falha ao registrar novo plano.');
        }
      } else {
        // Atualizar existente
        const payload = {
          plano_id: currentPlanoId,
          materiais: grupos,
          resultado: resultado
        };

        const res = await api.planoCorte.save(payload);
        if (res) {
          alert(`Plano atualizado com sucesso!`);
          // Forçar atualização local do estado se necessário, mas o id já está na URL
          setPlano(prev => ({ ...prev, id: currentPlanoId, status: 'calculado' }));
        }
      }

      // REGISTRAR NOVOS RETALHOS (DEPARA BLOCO 2)
      const areaMinima = 300 * 300;
      const sobrasAproveitaveis = resultado.sobrasGeradas.filter(s => 
        s.aproveitavel && (s.largura * s.altura >= areaMinima)
      );

      if (sobrasAproveitaveis.length > 0) {
        await Promise.all(sobrasAproveitaveis.map(async s => {
          const grupo = resultado.grupos.find(g => g.superficies.some(sup => sup.id === s.superficieId));
          const skuBase = grupo?.sku || 'MDF-GENERICO';

          try {
            // Registrar na tabela específica de retalhos (Bloco 2)
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
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarProducao = async () => {
    if (!resultado || !plano.id) {
      alert("Salve o plano antes de aprovar a produção.");
      return;
    }

    if (!confirm("Deseja aprovar a produção? Isso irá baixar as chapas do estoque e gerar uma nova OP.")) return;

    setLoading(true);
    try {
      // 1. Calcular consumo de chapas por SKU
      const consumo: Record<string, number> = {};
      resultado.grupos.forEach(g => {
        const sku = g.sku;
        const qtd = g.superficies.filter(s => !s.is_retalho).length;
        if (qtd > 0) {
          consumo[sku] = (consumo[sku] || 0) + qtd;
        }
      });

      const materiaisConsumidos = Object.entries(consumo).map(([sku, qtd]) => ({ sku, qtd }));

      // 2. Chamar API para baixar estoque de chapas inteiras
      await api.planoCorte.aprovarProducao(materiaisConsumidos);

      // 3. Baixar Retalhos Utilizados (Bloco 2)
      const retalhosUtilizadosIds: string[] = [];
      resultado.grupos.forEach(g => {
        g.superficies.forEach(s => {
          // No otimizador, se chapa_id não for nulo e não for prefixo de chapa inteira, é o ID do retalho
          if (s.id && !s.id.startsWith('sup-') && s.id.length > 20) {
            retalhosUtilizadosIds.push(s.id);
          }
        });
      });

      if (retalhosUtilizadosIds.length > 0) {
        console.log(`[RETALHOS] Baixando ${retalhosUtilizadosIds.length} retalhos...`);
        await Promise.all(retalhosUtilizadosIds.map(id => 
          retalhosRepository.usarRetalho(id, plano.id)
        ));
      }

      // 4. Criar Ordem de Produção (OP)
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

      alert(`Produção aprovada! OP ${opId} gerada com sucesso e encaminhada para a linha de produção.`);
      navigate('/producao');
    } catch (e) {
      console.error("Erro ao aprovar produção", e);
      alert("Falha ao aprovar produção.");
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

  const handleImportProjeto = async (prj: any) => {
    setLoading(true);
    try {
      // 1. Buscar todos os orçamentos aprovados deste projeto
      const orcRes = await api.orcamentos.list();
      const approvedOrcs = (orcRes || []).filter((o: any) => 
        String(o.projeto_id) === String(prj.id) && o.status === 'aprovado'
      );

      if (approvedOrcs.length === 0) {
        alert("Este projeto não possui orçamentos aprovados com detalhamento técnico.");
        setLoading(false);
        return;
      }

      const novosGrupos = [...grupos];
      const novasPecas = [...pecas];
      let totalImportado = 0;

      // 2. Para cada orçamento aprovado, buscar a árvore técnica e importar peças
      for (const orc of approvedOrcs) {
        const data = await api.orcamentoTecnico.getTree(orc.id);
        const tree = data.ambientes || [];
        
        if (tree && Array.isArray(tree) && tree.length > 0) {
          tree.forEach(ambiente => {
            ambiente.moveis?.forEach((movel: any) => {
              movel.pecas?.forEach((peca: any) => {
                const espessura = Number(peca.espessura_mm) || Number(peca.espessura) || 15;
                let grupo = novosGrupos.find(g => 
                  (peca.material_id && g.materialId === peca.material_id) || 
                  (peca.sku && g.sku === peca.sku)
                );

                if (grupo && grupo.espessuraMm !== espessura) grupo = undefined;

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
                totalImportado++;
              });
            });
          });
        }
      }

      setGrupos(novosGrupos);
      setPecas(novasPecas);
      setShowImportModal(false);
      
      if (totalImportado > 0) {
        alert(`${totalImportado} peças importadas com sucesso do projeto ${prj.title} (TAG: ${prj.tag || prj.id}).`);
      } else {
        alert("Nenhuma peça encontrada nos orçamentos aprovados deste projeto.");
      }
    } catch (e) { 
      console.error("Erro ao importar projeto", e);
      alert("Falha ao importar peças do projeto.");
    } finally { 
      setLoading(false); 
    }
  };

  const handleImportDae = (pecasDae: PecaInput[]) => {
    const novosGrupos = [...grupos];
    const novasPecas = [...pecas];

    pecasDae.forEach(peca => {
      // Find or create group
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
          <button onClick={() => setShowPlanosModal(true)} className="btn btn-outline" style={{ border: '1px solid var(--primary)', color: 'var(--primary)' }}><Layout size={18} /> Planos Salvos</button>
          <button onClick={() => setShowImportModal(true)} className="btn btn-outline"><Box size={18} /> Projetos (TAG)</button>
          <button onClick={handleCalcular} className="btn btn-primary" style={{ minWidth: '140px' }} disabled={isCalculating}>
            {isCalculating ? <RefreshCcw size={18} className="animate-spin" /> : <RefreshCcw size={18} />} 
            {isCalculating ? `OTIMIZANDO (${progress}%)` : 'OTIMIZAR'}
          </button>
          <button onClick={handleSave} className="btn btn-outline" disabled={loading}>
            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar'}
          </button>
          <button 
            onClick={handleAprovarProducao} 
            className="btn btn-primary" 
            disabled={loading || !resultado || !plano.id}
            style={{ background: '#10B981', borderColor: '#10B981' }}
          >
            <CheckCircle size={18} /> Aprovar Produção
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
        <div className="hide-on-print" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
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

          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem' }}>
            {activeSuperficie ? (
              <CanvasAvancado superficie={activeSuperficie} grupoMaterial={activeGrupo} highlightPecaId={highlightPecaId} />
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.15, marginTop: '20vh' }}>
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
                <button onClick={() => setShowExportModal(true)} className="btn btn-primary" style={{ height: '40px', padding: '0 2rem' }}>
                  <Download size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> EXPORTAR PRODUÇÃO
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EXPORTAÇÃO (NOVO) */}
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

      {/* MODAL: PLANOS SALVOS (NOVO) */}
      {showPlanosModal && (
        <div className="modal-overlay" onClick={() => setShowPlanosModal(false)}>
          <div className="modal-content animate-pop-in" style={{ width: '600px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layout className="text-[#E2AC00]" /> Planos de Corte Salvos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
              {(planosSalvos || []).map(p => (
                <div 
                  key={p.id} 
                  className="card hover-scale" 
                  style={{ padding: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-hover)' }}
                  onClick={() => {
                    navigate(`/plano-de-corte?id=${p.id}`);
                    setShowPlanosModal(false);
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '800' }}>{p.nome}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Salvo em: {p.criado_em ? new Date(p.criado_em).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--primary)' }} />
                </div>
              ))}
              {(!planosSalvos || planosSalvos.length === 0) && <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Nenhum plano encontrado no histórico.</p>}
            </div>
            <button className="btn btn-outline mt-6" style={{ width: '100%' }} onClick={() => setShowPlanosModal(false)}>FECHAR</button>
          </div>
        </div>
      )}

      {/* MODAL: SELEÇÃO DE MATERIAL (NOVO) */}
      {showMaterialModal && (
        <ModalMaterial 
          materiais={materiaisEstoque} 
          onAddEstoque={addGrupoDoEstoque} 
          onAddManual={addGrupoManual} 
          onClose={() => setShowMaterialModal(false)} 
        />
      )}

      {/* MODAL: IMPORTAR PEÇAS */}
      {showImportModal && (
        <div className="modal-overlay hide-on-print" onClick={() => setShowImportModal(false)} onKeyDown={(e) => { if ((e as any).key === 'Escape') setShowImportModal(false); }} tabIndex={-1}>
          <div className="modal-content animate-pop-in" style={{ width: '700px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '900' }}>Importar Peças</h2>
              <button onClick={() => setShowImportModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              
              {/* Importador 3D (CAD/SketchUp/Promob) */}
              <section>
                <h3 className="font-bold text-xs mb-3 text-slate-500 uppercase tracking-widest">Opção 1: Arquivo de Engenharia</h3>
                <ImportadorEngenharia onImport={handleImportDae} />
              </section>

              {/* Importador de Projetos (CRM) */}
              <section>
                <h3 className="font-bold text-xs mb-3 text-slate-500 uppercase tracking-widest">Opção 2: Projetos do Sistema (TAG)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                  {(projetosParaImportar || []).map(p => (
                    <div key={p.id} onClick={() => handleImportProjeto(p)} className="card hover-scale" style={{ padding: '1rem', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '900', color: 'var(--primary)', fontSize: '0.9rem' }}>{p.tag || `PRJ-${p.id}`}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '2px' }}>{p.title}</div>
                        </div>
                        <span className="badge" style={{ background: 'var(--surface-hover)', fontSize: '0.6rem' }}>{p.status}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{p.subtitle}</div>
                    </div>
                  ))}
                  {(!projetosParaImportar || projetosParaImportar.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                      <p className="text-sm">Nenhum projeto encontrado.</p>
                    </div>
                  )}
                </div>
              </section>
              
            </div>
          </div>
        </div>
      )}


      {/* PRINT STYLES E ETIQUETAS */}
      <style>{`
        @media print {
          .hide-on-print, .sidebar, .topbar, nav, header, button, .modal-overlay { 
            display: none !important; 
          }
          .app-content, .page-container, .main-layout, #root, body, html {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            height: auto !important;
          }
          .print-only { 
            display: block !important; 
            position: absolute;
            top: 0; left: 0; width: 100%;
          }
          .print-etiquetas { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; padding: 10mm; }
          .etiqueta { width: 95mm; height: 45mm; border: 1px solid #000; padding: 4mm; color: #000; font-family: sans-serif; position: relative; display: flex; break-inside: avoid; margin-bottom: 2mm; }
          .etiqueta-content { flex: 1; }
          .etiqueta-header { display: flex; justify-content: space-between; font-size: 7pt; border-bottom: 1px solid #ddd; margin-bottom: 1mm; font-weight: bold; }
          .etiqueta-title { font-size: 10pt; font-weight: 800; margin-bottom: 1mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .etiqueta-dim { font-size: 18pt; font-weight: 900; margin: 1mm 0; }
          .etiqueta-footer { position: absolute; bottom: 4mm; left: 4mm; right: 25mm; font-size: 7pt; color: #666; display: flex; justify-content: space-between; }
          .etiqueta-qr { width: 20mm; height: 20mm; margin-left: 2mm; align-self: center; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
      
      <div className="print-only">
        <div className="print-etiquetas">
          {resultado?.grupos.flatMap(g => g.superficies.flatMap(s => s.pecasPositionadas.map(p => (
            <div key={`${p.pecaId}-${p.numeroEtiqueta}`} className="etiqueta">
              <div className="etiqueta-content">
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
              <img 
                className="etiqueta-qr" 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ID:${p.pecaId}|DIM:${p.largura}x${p.altura}|MAT:${g.sku}`} 
                alt="QR Code" 
              />
            </div>
          ))))}
        </div>
      </div>

    </div>
  );
};

export default CuttingPlanPage;
