import React, { useState, useEffect } from 'react';
import { Package, Pencil, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { SKUAutocomplete } from './SKUAutocomplete';

interface ItemCardProps {
  item: any;
  onUpdate?: (itemId: string, updates: any) => void;
  onDelete?: (itemId: string) => void;
  isEditingExternal?: boolean;
}

/**
 * ITEM CARD - MÓDULO DE ORÇAMENTOS
 * Estrutura refatorada para separar estados de rascunho, persistidos e calculados.
 */
export function ItemCard({ item, onUpdate, onDelete, isEditingExternal }: ItemCardProps) {
  const { error: toastError } = useToast();
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [prevIsEditingExternal, setPrevIsEditingExternal] = useState<boolean | undefined>(undefined);

  // 📝 ESTADO DO ITEM (Refatorado conforme item 6 do pedido)
  const [state, setState] = useState({
    // Dados sendo editados (Rascunho)
    draft: {
        nomeCustomizado: item.nomeCustomizado || '',
        quantidade: Number(item.quantidade) || 1,
        largura: item.largura || '',
        altura: item.altura || '',
        espessura: item.espessura || '',
        material: item.material || '',
        skuId: item.skuComponenteId || item.skuEngenhariaId || '',
        skuTipo: item.skuEngenhariaId ? 'ENGENHARIA' : 'COMPONENTE',
        skuCodigo: item.skuCodigo || (item.skuEngenharia?.codigo) || '',
        skuDescricao: item.skuDescricao || (item.skuEngenharia?.nome) || (item.skuComponente?.nome) || '',
        custoUnitarioCalculado: Number(item.custoUnitarioCalculado) || 0,
        precoVendaUnitario: Number(item.precoVendaUnitario) || 0,
        precoVendaSobrescrito: item.precoVendaSobrescrito ? Number(item.precoVendaSobrescrito) : null,
        margemLucro: Number(item.margemLucro) || 0,
        observacoes: item.observacoes || '',
        metadata: item.metadata || {
            chapa: null,
            fitaBorda: { sku: null, lados: { topo: false, base: false, esquerda: false, direita: false } },
            ferragens: []
        }
    },
    // Dados que vieram do banco (Persistidos)
    persisted: { ...item },
    // Flags de controle
    hasChanges: false
  });

  // Atualizar estado quando o item mudar externamente (ex: após save)
  useEffect(() => {
    setState(prev => ({
        ...prev,
        persisted: { ...item },
        draft: {
            ...prev.draft,
            nomeCustomizado: item.nomeCustomizado || '',
            largura: item.largura || '',
            altura: item.altura || '',
            espessura: item.espessura || '',
            skuCodigo: item.skuCodigo || (item.skuEngenharia?.codigo) || (item.skuComponente?.codigo) || '',
            skuDescricao: item.skuDescricao || (item.skuEngenharia?.nome) || (item.skuComponente?.nome) || '',
            custoUnitarioCalculado: Number(item.custoUnitarioCalculado) || 0,
            precoVendaUnitario: Number(item.precoVendaUnitario) || 0,
            margemLucro: Number(item.margemLucro) || 0,
            metadata: item.metadata || { chapa: null, fitaBorda: { sku: null, lados: { topo: false, base: false, esquerda: false, direita: false } }, ferragens: [] }
        },
        hasChanges: false
    }));
  }, [item]);

  // 💾 AUTO-SAVE DEBOUNCED (Fase 2)
  useEffect(() => {
    if (!state.hasChanges || !onUpdate) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      const payload = {
        ...state.draft,
        possuiOverride: state.draft.precoVendaSobrescrito !== null,
        quantidade: state.draft.quantidade.toString(),
        custoUnitarioCalculado: state.draft.custoUnitarioCalculado.toFixed(2),
        precoVendaUnitario: state.draft.precoVendaUnitario.toFixed(2),
        precoVendaSobrescrito: state.draft.precoVendaSobrescrito?.toFixed(2) || null,
        metadata: state.draft.metadata
      };

      try {
        await onUpdate(item.id, payload);
        setState(prev => ({ ...prev, persisted: { ...item }, hasChanges: false }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("[Auto-Save] Erro ao salvar item:", err);
        setSaveStatus('error');
      }
    }, 1000); // 1 segundo de debounce

    return () => clearTimeout(timer);
  }, [state.draft, state.hasChanges, onUpdate, item.id]);

  // 🎹 SUPORTE A TECLADO (ESC para fechar)
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSave();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, state.draft]);

  const parseBrazilianNumber = (val: any) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    // Remove tudo exceto dígitos, vírgula, ponto e sinal de menos
    const cleanStr = String(val).replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
  };
  
  const recalculateTotalMaterialCost = (draftState: any) => {
      let cost = 0;
      const { largura, altura, metadata } = draftState;
      const l = parseBrazilianNumber(largura); // mm
      const a = parseBrazilianNumber(altura); // mm
      
      // Chapa (preço por m2)
      if (metadata.chapa?.precoUnitario) {
          const areaM2 = (l * a) / 1000000;
          cost += areaM2 * Number(metadata.chapa.precoUnitario);
      }
      
      // Fita (preço por m linear)
      if (metadata.fitaBorda?.sku?.precoUnitario) {
          const lados = metadata.fitaBorda.lados || {};
          let perimetroMm = 0;
          if (lados.topo) perimetroMm += l;
          if (lados.base) perimetroMm += l;
          if (lados.esquerda) perimetroMm += a;
          if (lados.direita) perimetroMm += a;
          cost += (perimetroMm / 1000) * Number(metadata.fitaBorda.sku.precoUnitario);
      }
      
      // Ferragens
      if (metadata.ferragens?.length > 0) {
          metadata.ferragens.forEach(f => {
              cost += (Number(f.quantidade) || 1) * Number(f.sku?.precoUnitario || 0);
          });
      }
      
      return cost;
  };

  // 🧮 CÁLCULO FINANCEIRO (Markup Simples)

  function recalculatePrices(type: 'cost' | 'price' | 'margin', value: number, currentDraft?: any) {
    const draft = { ...(currentDraft || state.draft) };
    const cost = type === 'cost' ? value : draft.custoUnitarioCalculado;
    let price = type === 'price' ? value : draft.precoVendaUnitario;
    let margin = type === 'margin' ? value : draft.margemLucro;

    if (type === 'margin') {
        // Fórmula solicitada: P = C * (1 + M/100)
        price = cost * (1 + (value / 100));
    } else if (type === 'price') {
        // Inverso: M = (P / C - 1) * 100
        margin = cost > 0 ? ((price / cost) - 1) * 100 : 0;
    } else if (type === 'cost') {
        // Se mudou custo, mantém a margem e atualiza preço
        price = cost * (1 + (margin / 100));
    }

    const newDraft = {
        ...draft,
        custoUnitarioCalculado: cost,
        precoVendaUnitario: price,
        margemLucro: margin,
        precoVendaSobrescrito: type === 'price' ? price : draft.precoVendaSobrescrito
    };

    if (currentDraft) return newDraft; // Retorna para uso síncrono

    setState(prev => ({
        ...prev,
        draft: newDraft,
        hasChanges: true
    }));
  };

  async function handleSave() {
    if (!onUpdate) return;
    setIsSaving(true);
    const payload = {
        ...state.draft,
        possuiOverride: state.draft.precoVendaSobrescrito !== null,
        // Garantir que campos numéricos vão como número
        quantidade: state.draft.quantidade.toString(),
        custoUnitarioCalculado: state.draft.custoUnitarioCalculado.toFixed(2),
        precoVendaUnitario: state.draft.precoVendaUnitario.toFixed(2),
        precoVendaSobrescrito: state.draft.precoVendaSobrescrito?.toFixed(2) || null,
        metadata: state.draft.metadata
    };

    try {
        await onUpdate(item.id, payload);
        setState(prev => ({ ...prev, persisted: { ...item }, hasChanges: false }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
        console.error("[ItemCard] ❌ Erro ao salvar item:", err);
        toastError("Erro ao salvar alterações.");
        setSaveStatus('error');
    } finally {
        setIsSaving(false);
    }
  };

  function handleCancel() {
    setState(prev => ({
        ...prev,
        draft: {
            ...prev.draft,
            ...prev.persisted, // Reverte para o persistido
            skuId: prev.persisted.skuComponenteId || prev.persisted.skuEngenhariaId || '',
            skuCodigo: prev.persisted.skuCodigo || (prev.persisted.skuEngenharia?.codigo) || '',
            skuDescricao: prev.persisted.skuDescricao || (prev.persisted.skuEngenharia?.nome) || (prev.persisted.skuComponente?.nome) || '',
            metadata: prev.persisted.metadata || { chapa: null, fitaBorda: { sku: null, lados: { topo: false, base: false, esquerda: false, direita: false } }, ferragens: [] },
            custoUnitarioCalculado: Number(prev.persisted.custoUnitarioCalculado) || 0,
            precoVendaUnitario: Number(prev.persisted.precoVendaUnitario) || 0
        },
        hasChanges: false
    }));
    setIsEditing(false);
  }

  // Monitorar transição de isEditingExternal (declarado após handleSave e handleCancel para evitar TDZ)
  useEffect(() => {
    if (isEditingExternal !== prevIsEditingExternal) {
      if (isEditingExternal === false && state.hasChanges) {
        handleSave();
      }
      if (isEditingExternal !== undefined) {
        setIsEditing(isEditingExternal);
      }
      setPrevIsEditingExternal(isEditingExternal);
    }
  }, [isEditingExternal, state.hasChanges, prevIsEditingExternal]);

  // Descrição Oficial (Herdada do SKU Mapeado)
  const currentSKU = (isEditing ? state.draft.skuCodigo : item.skuCodigo) || '';
  const currentDesc = (isEditing ? state.draft.skuDescricao : (item.skuEngenharia?.nome || item.skuComponente?.nome || item.skuDescricao)) || '';
  
  const tituloExibicao = item.nomeCustomizado || 'Item sem nome';
  
  // Unificar SKU-Descrição para evitar redundância (ex: FRG-0003 - FRG-0003)
  const skuLimpo = currentSKU.trim();
  let descLimpa = currentDesc.trim();
  
  // Remover o SKU do início da descrição se ele já estiver lá (evita SKU - SKU - Descrição)
  // eslint-disable-next-line no-useless-escape
  const prefixoRemover = new RegExp(`^${skuLimpo.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*[-–—:]*\\s*`, 'i');
  descLimpa = descLimpa.replace(prefixoRemover, '').trim();
  
  const isIdentical = descLimpa.toUpperCase() === skuLimpo.toUpperCase() || descLimpa === '';
  const subtituloExibicao = isIdentical ? skuLimpo : (skuLimpo ? `${skuLimpo} - ${descLimpa}` : descLimpa);

  const precoTotal = (state.draft.precoVendaUnitario || 0) * (state.draft.quantidade || 0);
  const temSKU = !!item.skuComponenteId || !!item.skuEngenhariaId || !!item.skuCodigo;

  return (
    <div className={`bg-card rounded-2xl border ${isEditing ? 'border-primary shadow-2xl shadow-primary/10' : 'border-border'} p-5 transition-all group/card relative overflow-hidden`}>
      
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover/card:bg-primary/10 transition-colors" />

      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${temSKU ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                    <h3 className="text-foreground font-black text-xl italic tracking-tight truncate leading-none uppercase">
                        {tituloExibicao}
                    </h3>
                    {saveStatus === 'saving' && (
                        <span className="text-[9px] font-bold text-muted-foreground animate-pulse flex items-center gap-1.5 bg-muted border border-border px-2 py-0.5 rounded">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" /> SALVANDO...
                        </span>
                    )}
                    {saveStatus === 'saved' && (
                        <span className="text-[9px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">
                            ✓ SALVO
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="text-[9px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                            ⚠️ ERRO AO SALVAR
                        </span>
                    )}
                </div>
                {subtituloExibicao && (
                    <div className="mt-2">
                        <span className="text-[10px] text-primary font-black uppercase tracking-widest bg-primary/5 px-2 py-1 rounded border border-primary/15">
                            {subtituloExibicao}
                        </span>
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {!isEditing ? (
            <>
                <button
                    onClick={() => setIsEditing(true)}
                    className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    title="Editar Item (E)"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete && confirm('Deseja remover este item?') && onDelete(item.id)}
                    className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </>
          ) : (
            <div className="flex gap-2">
                <button
                    onClick={handleCancel}
                    className="px-3 h-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-muted/80 text-muted-foreground text-[10px] font-black uppercase cursor-pointer"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 h-10 rounded-xl bg-primary border border-primary flex items-center justify-center hover:bg-primary-hover text-primary-foreground text-[10px] font-black uppercase shadow-lg cursor-pointer"
                >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Lado Esquerdo: Dimensões e Identificação */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
            {isEditing && (
                <div className="bg-background p-4 rounded-xl border border-border space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vincular SKU</label>
                        <SKUAutocomplete 
                            onSelect={(sku) => {
                                const novoCusto = Number(sku.precoUnitario) || 0;
                                
                                // Criar novo rascunho com o SKU atualizado
                                const updatedDraft = {
                                    ...state.draft,
                                    skuId: sku.id,
                                    skuCodigo: sku.codigo,
                                    skuDescricao: sku.nome,
                                    skuTipo: (sku as any).tipo,
                                    custoUnitarioCalculado: novoCusto
                                };

                                // Recalcular preços sincronamente usando o novo rascunho
                                const finalDraft = recalculatePrices('cost', novoCusto, updatedDraft);

                                setState(prev => ({
                                    ...prev,
                                    draft: finalDraft,
                                    hasChanges: true
                                }));
                            }}
                            defaultValue={state.draft.skuCodigo}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Nome Customizado</label>
                            <input 
                                type="text"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
                                value={state.draft.nomeCustomizado}
                                onChange={(e) => setState(prev => ({ ...prev, draft: { ...prev.draft, nomeCustomizado: e.target.value }, hasChanges: true }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Material / Acabamento</label>
                            <SKUAutocomplete 
                                placeholder="Buscar material ou digite..."
                                defaultValue={state.draft.material}
                                onChange={(value) => setState(prev => ({ ...prev, draft: { ...prev.draft, material: value }, hasChanges: true }))}
                                onSelect={(sku) => {
                                    setState(prev => ({ 
                                        ...prev, 
                                        draft: { 
                                            ...prev.draft, 
                                            material: sku.nome
                                        }, 
                                        hasChanges: true 
                                    }));
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-4 gap-4">
                    <div className="bg-muted p-3 rounded-xl border border-border">
                        <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Quantidade</label>
                        {isEditing ? (
                            <input 
                                type="number"
                                className="w-full bg-transparent text-foreground font-bold outline-none"
                                value={state.draft.quantidade}
                                onChange={(e) => setState(prev => ({ ...prev, draft: { ...prev.draft, quantidade: parseFloat(e.target.value) || 0 }, hasChanges: true }))}
                            />
                        ) : (
                            <span className="text-foreground font-black">{item.quantidade} <span className="text-muted-foreground text-[10px]">{item.unidadeMedida || 'UN'}</span></span>
                        )}
                    </div>
                    <div className="bg-muted p-3 rounded-xl border border-border">
                        <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Largura</label>
                        <span className="text-muted-foreground font-mono text-sm">{item.largura || '-'} <span className="text-[10px]">mm</span></span>
                    </div>
                    <div className="bg-muted p-3 rounded-xl border border-border">
                        <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Altura</label>
                        <span className="text-muted-foreground font-mono text-sm">{item.altura || '-'} <span className="text-[10px]">mm</span></span>
                    </div>
                    <div className="bg-muted p-3 rounded-xl border border-border">
                        <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Espessura</label>
                        <span className="text-muted-foreground font-mono text-sm">{item.espessura || '-'} <span className="text-[10px]">mm</span></span>
                    </div>
            </div>
        </div>

        {/* Lado Direito: Financeiro */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
                <div className="bg-muted/50 rounded-2xl p-4 border border-border flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs font-bold uppercase tracking-tighter">Custo Unitário</span>
                        </div>
                        {isEditing ? (
                            <input 
                                type="number"
                                className="bg-background border border-border rounded px-2 py-1 text-right w-24 text-sm font-mono text-foreground focus:outline-none"
                                value={state.draft.custoUnitarioCalculado}
                                onChange={(e) => recalculatePrices('cost', parseFloat(e.target.value) || 0)}
                            />
                        ) : (
                            <span className="text-muted-foreground font-mono text-sm">R$ {Number(item.custoUnitarioCalculado || 0).toFixed(2)}</span>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5" />
                            <span className="text-foreground text-xs font-bold uppercase tracking-tighter">Preço de Venda</span>
                        </div>
                        {isEditing ? (
                            <input 
                                type="number"
                                className="bg-background border border-primary/50 rounded px-2 py-1 text-right w-24 text-sm font-mono text-primary font-black focus:outline-none"
                                value={state.draft.precoVendaUnitario}
                                onChange={(e) => recalculatePrices('price', parseFloat(e.target.value) || 0)}
                            />
                        ) : (
                            <span className="text-primary font-mono font-black">R$ {Number(item.precoVendaUnitario || 0).toFixed(2)}</span>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-muted-foreground text-[10px] font-black uppercase">Margem Real (%)</span>
                        {isEditing ? (
                            <input 
                                type="number"
                                className="bg-background border border-border rounded px-2 py-1 text-right w-20 text-[10px] font-black font-mono text-foreground focus:outline-none"
                                value={state.draft.margemLucro}
                                onChange={(e) => recalculatePrices('margin', parseFloat(e.target.value) || 0)}
                            />
                        ) : (
                            <div className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${Number(item.margemLucro) >= 30 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {Number(item.margemLucro || 0).toFixed(1)}%
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-end mt-auto pt-2 px-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total do Item</span>
                        <span className="text-2xl font-black italic text-foreground leading-none mt-1">
                        R$ {precoTotal.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
      </div>

      
        {!isEditing && item.metadata && (item.metadata.chapa || item.metadata.fitaBorda?.sku || item.metadata.ferragens?.length > 0) && (
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1"><Package className="w-3 h-3" /> Composição Dinâmica Ativa</span>
                <div className="flex flex-wrap gap-2">
                    {item.metadata.chapa && <span className="bg-muted border border-border text-[10px] text-muted-foreground px-2 py-1 rounded">Chapa: <b className="text-foreground">{item.metadata.chapa.codigo}</b></span>}
                    {item.metadata.fitaBorda?.sku && <span className="bg-muted border border-border text-[10px] text-muted-foreground px-2 py-1 rounded">Fita: <b className="text-foreground">{item.metadata.fitaBorda.sku.codigo}</b> ({Object.entries(item.metadata.fitaBorda.lados || {}).filter(([_,v])=>v).map(([k])=>k[0].toUpperCase()).join(',')})</span>}
                    {item.metadata.ferragens?.map((f, i) => (
                        <span key={i} className="bg-muted border border-border text-[10px] text-muted-foreground px-2 py-1 rounded">{f.quantidade}x <b className="text-foreground">{f.sku.codigo}</b></span>
                    ))}
                </div>
            </div>
        )}

        {item.observacoes && !isEditing && (
            <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <div className="w-1 h-full bg-primary/50 rounded-full" />
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                {item.observacoes}
            </p>
        </div>
      )}

      
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Package className="w-3 h-3 text-primary" /> Composição Avançada de Materiais</h4>
            
            <div className="bg-background rounded-xl p-4 border border-border space-y-4">
                {/* CHAPA */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex justify-between">
                        <span>Chapa / Material Base (Preço por m²)</span>
                        {state.draft.metadata?.chapa && <span className="text-primary font-mono">R$ {Number(state.draft.metadata.chapa.precoUnitario).toFixed(2)} / m²</span>}
                    </label>
                    <SKUAutocomplete 
                        placeholder="Buscar chapa de MDF..."
                        defaultValue={state.draft.metadata?.chapa?.codigo || ''}
                        onSelect={(sku) => {
                            const newDraft = { ...state.draft, metadata: { ...state.draft.metadata, chapa: sku } };
                            const cost = recalculateTotalMaterialCost(newDraft);
                            setState(prev => ({ ...prev, draft: cost > 0 ? recalculatePrices('cost', cost, newDraft) : newDraft, hasChanges: true }));
                        }}
                    />
                </div>

                {/* FITA DE BORDA */}
                <div className="space-y-2 border-t border-border pt-4">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex justify-between">
                        <span>Fita de Borda (Preço por ML)</span>
                        {state.draft.metadata?.fitaBorda?.sku && <span className="text-primary font-mono">R$ {Number(state.draft.metadata.fitaBorda.sku.precoUnitario).toFixed(2)} / ML</span>}
                    </label>
                    <SKUAutocomplete 
                        placeholder="Buscar fita de borda..."
                        defaultValue={state.draft.metadata?.fitaBorda?.sku?.codigo || ''}
                        onSelect={(sku) => {
                            const newDraft = { ...state.draft, metadata: { ...state.draft.metadata, fitaBorda: { ...state.draft.metadata?.fitaBorda, sku } } };
                            const cost = recalculateTotalMaterialCost(newDraft);
                            setState(prev => ({ ...prev, draft: cost > 0 ? recalculatePrices('cost', cost, newDraft) : newDraft, hasChanges: true }));
                        }}
                    />
                    <div className="flex gap-4 mt-2">
                        {['topo', 'base', 'esquerda', 'direita'].map(lado => (
                            <label key={lado} className="flex items-center gap-1.5 cursor-pointer group">
                                <input type="checkbox" className="w-3 h-3 accent-primary" 
                                    checked={!!state.draft.metadata?.fitaBorda?.lados?.[lado]}
                                    onChange={(e) => {
                                        const newDraft = { ...state.draft, metadata: { ...state.draft.metadata, fitaBorda: { ...state.draft.metadata?.fitaBorda, lados: { ...state.draft.metadata?.fitaBorda?.lados, [lado]: e.target.checked } } } };
                                        const cost = recalculateTotalMaterialCost(newDraft);
                                        setState(prev => ({ ...prev, draft: cost > 0 ? recalculatePrices('cost', cost, newDraft) : newDraft, hasChanges: true }));
                                    }}
                                />
                                <span className="text-[10px] uppercase font-bold text-muted-foreground group-hover:text-foreground">{lado}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* FERRAGENS E ACESSÓRIOS */}
                <div className="space-y-2 border-t border-border pt-4">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex justify-between">
                        <span>Ferragens e Acessórios</span>
                    </label>
                    {state.draft.metadata?.ferragens?.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2 bg-muted p-2 rounded-lg border border-border">
                            <span className="flex-1 text-xs text-foreground truncate font-bold">{f.sku?.nome || f.sku?.codigo} <span className="text-muted-foreground font-mono ml-2">R$ {Number(f.sku?.precoUnitario).toFixed(2)} un</span></span>
                            <input type="number" min="1" className="w-16 bg-background border border-border rounded px-2 py-1 text-xs text-foreground font-mono text-center outline-none focus:border-primary" value={f.quantidade} 
                                onChange={(e) => {
                                    const newF = [...state.draft.metadata.ferragens];
                                    newF[i].quantidade = Number(e.target.value);
                                    const newDraft = { ...state.draft, metadata: { ...state.draft.metadata, ferragens: newF } };
                                    const cost = recalculateTotalMaterialCost(newDraft);
                                    setState(prev => ({ ...prev, draft: cost > 0 ? recalculatePrices('cost', cost, newDraft) : newDraft, hasChanges: true }));
                                }}
                            />
                            <button onClick={() => {
                                const newF = state.draft.metadata.ferragens.filter((_, idx) => idx !== i);
                                const newDraft = { ...state.draft, metadata: { ...state.draft.metadata, ferragens: newF } };
                                const cost = recalculateTotalMaterialCost(newDraft);
                                setState(prev => ({ ...prev, draft: cost > 0 ? recalculatePrices('cost', cost, newDraft) : newDraft, hasChanges: true }));
                            }} className="w-7 h-7 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    ))}
                    
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <SKUAutocomplete 
                                placeholder="Buscar corrediça, dobradiça..."
                                onSelect={(sku) => {
                                    const newF = [...(state.draft.metadata?.ferragens || []), { sku, quantidade: 1 }];
                                    const newDraft = { ...state.draft, metadata: { ...state.draft.metadata, ferragens: newF } };
                                    const cost = recalculateTotalMaterialCost(newDraft);
                                    setState(prev => ({ ...prev, draft: cost > 0 ? recalculatePrices('cost', cost, newDraft) : newDraft, hasChanges: true }));
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {isEditing && (
        <div className="mt-4">
             <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Observações Internas</label>
             <textarea 
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-muted-foreground outline-none focus:border-primary h-16 resize-none"
                placeholder="Notas sobre este item..."
                value={state.draft.observacoes}
                onChange={(e) => setState(prev => ({ ...prev, draft: { ...prev.draft, observacoes: e.target.value }, hasChanges: true }))}
             />
        </div>
      )}
    </div>
  );
}

