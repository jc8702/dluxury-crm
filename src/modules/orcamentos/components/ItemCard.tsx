import React, { useState, useEffect, useCallback } from 'react';
import { Package, Pencil, Trash2, DollarSign, X, Check, Loader2 } from 'lucide-react';
import { SKUAutocomplete } from './SKUAutocomplete';

interface ItemCardProps {
  item: any;
  onUpdate?: (itemId: string, updates: any) => void;
  onDelete?: (itemId: string) => void;
}

/**
 * ITEM CARD - MÓDULO DE ORÇAMENTOS
 * Estrutura refatorada para separar estados de rascunho, persistidos e calculados.
 */
export function ItemCard({ item, onUpdate, onDelete }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        observacoes: item.observacoes || ''
    },
    // Dados que vieram do banco (Persistidos)
    persisted: { ...item },
    // Flags de controle
    hasChanges: false
  });

  // Atualizar estado quando o item mudar externamente (ex: após save)
  useEffect(() => {
    console.log(`[ItemCard] 🔄 Item atualizado externamente: ${item.id}`);
    setState(prev => ({
        ...prev,
        persisted: { ...item },
        draft: {
            ...prev.draft,
            nomeCustomizado: item.nomeCustomizado || '',
            skuCodigo: item.skuCodigo || (item.skuEngenharia?.codigo) || (item.skuComponente?.codigo) || '',
            skuDescricao: item.skuDescricao || (item.skuEngenharia?.nome) || (item.skuComponente?.nome) || '',
            custoUnitarioCalculado: Number(item.custoUnitarioCalculado) || 0,
            precoVendaUnitario: Number(item.precoVendaUnitario) || 0,
            margemLucro: Number(item.margemLucro) || 0
        },
        hasChanges: false
    }));
  }, [item]);

  // 🎹 SUPORTE A TECLADO (ESC para fechar)
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            console.log("[ItemCard] 🎹 ESC detectado - Cancelando edição");
            handleCancel();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSave();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, state.draft]);

  // 🧮 CÁLCULO FINANCEIRO (Markup Simples)
  const recalculatePrices = (type: 'cost' | 'price' | 'margin', value: number, currentDraft?: any) => {
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

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    console.log(`[ItemCard] 💾 Salvando alterações para o item ${item.id}...`);
    
    const payload = {
        ...state.draft,
        possuiOverride: state.draft.precoVendaSobrescrito !== null,
        // Garantir que campos numéricos vão como número
        quantidade: state.draft.quantidade.toString(),
        custoUnitarioCalculado: state.draft.custoUnitarioCalculado.toFixed(2),
        precoVendaUnitario: state.draft.precoVendaUnitario.toFixed(2),
        precoVendaSobrescrito: state.draft.precoVendaSobrescrito?.toFixed(2) || null
    };

    console.log("[ItemCard] 📤 Payload de envio:", payload);

    try {
        await onUpdate(item.id, payload);
        setIsEditing(false);
        console.log("[ItemCard] ✅ Item salvo com sucesso.");
    } catch (err) {
        console.error("[ItemCard] ❌ Erro ao salvar item:", err);
        alert("Erro ao salvar alterações.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setState(prev => ({
        ...prev,
        draft: {
            ...prev.draft,
            ...prev.persisted, // Reverte para o persistido
            skuId: prev.persisted.skuComponenteId || prev.persisted.skuEngenhariaId || '',
            skuCodigo: prev.persisted.skuCodigo || (prev.persisted.skuEngenharia?.codigo) || '',
            skuDescricao: prev.persisted.skuDescricao || (prev.persisted.skuEngenharia?.nome) || (prev.persisted.skuComponente?.nome) || '',
            custoUnitarioCalculado: Number(prev.persisted.custoUnitarioCalculado) || 0,
            precoVendaUnitario: Number(prev.persisted.precoVendaUnitario) || 0
        },
        hasChanges: false
    }));
    setIsEditing(false);
  };

  // Descrição Oficial (Herdada do SKU Mapeado)
  const currentSKU = (isEditing ? state.draft.skuCodigo : item.skuCodigo) || '';
  const currentDesc = (isEditing ? state.draft.skuDescricao : (item.skuEngenharia?.nome || item.skuComponente?.nome || item.skuDescricao)) || '';
  
  const tituloExibicao = item.nomeCustomizado || 'Item sem nome';
  
  // Unificar SKU-Descrição para evitar redundância (ex: FRG-0003 - FRG-0003)
  const skuLimpo = currentSKU.trim();
  let descLimpa = currentDesc.trim();
  
  // Remover o SKU do início da descrição se ele já estiver lá (evita SKU - SKU - Descrição)
  const prefixoRemover = new RegExp(`^${skuLimpo.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*[-–—:]*\\s*`, 'i');
  descLimpa = descLimpa.replace(prefixoRemover, '').trim();
  
  const isIdentical = descLimpa.toUpperCase() === skuLimpo.toUpperCase() || descLimpa === '';
  const subtituloExibicao = isIdentical ? skuLimpo : (skuLimpo ? `${skuLimpo} - ${descLimpa}` : descLimpa);

  const precoTotal = (state.draft.precoVendaUnitario || 0) * (state.draft.quantidade || 0);
  const temSKU = !!item.skuComponenteId || !!item.skuEngenhariaId || !!item.skuCodigo;

  return (
    <div className={`bg-zinc-950 rounded-2xl border ${isEditing ? 'border-orange-500 shadow-2xl shadow-orange-500/10' : 'border-zinc-900'} p-5 transition-all group/card relative overflow-hidden`}>
      
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -z-10 group-hover/card:bg-orange-500/10 transition-colors" />

      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${temSKU ? 'bg-orange-500 text-black' : 'bg-zinc-900 text-zinc-600'}`}>
                <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="text-white font-black text-xl italic tracking-tight truncate leading-none uppercase">
                    {tituloExibicao}
                </h3>
                {subtituloExibicao && (
                    <div className="mt-2">
                        <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/5 px-2 py-1 rounded border border-orange-500/10">
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
                    className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all"
                    title="Editar Item (E)"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete && confirm('Deseja remover este item?') && onDelete(item.id)}
                    className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 text-zinc-500 hover:text-red-500 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </>
          ) : (
            <div className="flex gap-2">
                <button
                    onClick={handleCancel}
                    className="px-3 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 h-10 rounded-xl bg-orange-600 border border-orange-500 flex items-center justify-center hover:bg-orange-500 text-white text-[10px] font-black uppercase shadow-lg shadow-orange-900/20"
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
                <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Vincular SKU</label>
                        <SKUAutocomplete 
                            onSelect={(sku) => {
                                console.log("[ItemCard] 🔍 Novo SKU selecionado:", sku);
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
                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Nome Customizado</label>
                            <input 
                                type="text"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                                value={state.draft.nomeCustomizado}
                                onChange={(e) => setState(prev => ({ ...prev, draft: { ...prev.draft, nomeCustomizado: e.target.value }, hasChanges: true }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Material / Acabamento</label>
                            <input 
                                type="text"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 outline-none"
                                value={state.draft.material}
                                onChange={(e) => setState(prev => ({ ...prev, draft: { ...prev.draft, material: e.target.value }, hasChanges: true }))}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-4 gap-4">
                <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1">Quantidade</label>
                    {isEditing ? (
                        <input 
                            type="number"
                            className="w-full bg-transparent text-white font-bold outline-none"
                            value={state.draft.quantidade}
                            onChange={(e) => setState(prev => ({ ...prev, draft: { ...prev.draft, quantidade: parseFloat(e.target.value) || 0 }, hasChanges: true }))}
                        />
                    ) : (
                        <span className="text-white font-black">{item.quantidade} <span className="text-zinc-600 text-[10px]">{item.unidadeMedida || 'UN'}</span></span>
                    )}
                </div>
                <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1">Largura</label>
                    <span className="text-zinc-400 font-mono text-sm">{item.largura || '-'} <span className="text-[10px]">cm</span></span>
                </div>
                <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1">Altura</label>
                    <span className="text-zinc-400 font-mono text-sm">{item.altura || '-'} <span className="text-[10px]">cm</span></span>
                </div>
                <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1">Espessura</label>
                    <span className="text-zinc-400 font-mono text-sm">{item.espessura || '-'} <span className="text-[10px]">mm</span></span>
                </div>
            </div>
        </div>

        {/* Lado Direito: Financeiro */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">Custo Unitário</span>
                    </div>
                    {isEditing ? (
                        <input 
                            type="number"
                            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-right w-24 text-sm font-mono text-white"
                            value={state.draft.custoUnitarioCalculado}
                            onChange={(e) => recalculatePrices('cost', parseFloat(e.target.value) || 0)}
                        />
                    ) : (
                        <span className="text-zinc-400 font-mono text-sm">R$ {Number(item.custoUnitarioCalculado || 0).toFixed(2)}</span>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5" />
                        <span className="text-zinc-300 text-xs font-bold uppercase tracking-tighter">Preço de Venda</span>
                    </div>
                    {isEditing ? (
                        <input 
                            type="number"
                            className="bg-zinc-950 border border-orange-500/50 rounded px-2 py-1 text-right w-24 text-sm font-mono text-orange-500 font-black"
                            value={state.draft.precoVendaUnitario}
                            onChange={(e) => recalculatePrices('price', parseFloat(e.target.value) || 0)}
                        />
                    ) : (
                        <span className="text-orange-500 font-mono font-black">R$ {Number(item.precoVendaUnitario || 0).toFixed(2)}</span>
                    )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
                    <span className="text-zinc-600 text-[10px] font-black uppercase">Margem Real (%)</span>
                    {isEditing ? (
                        <input 
                            type="number"
                            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-right w-20 text-[10px] font-black font-mono text-white"
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
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total do Item</span>
                    <span className="text-2xl font-black italic text-white leading-none mt-1">
                        R$ {precoTotal.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
      </div>

      {item.observacoes && !isEditing && (
        <div className="mt-4 pt-4 border-t border-zinc-900/50 flex gap-2">
            <div className="w-1 h-full bg-orange-500/50 rounded-full" />
            <p className="text-[10px] text-zinc-500 italic leading-relaxed">
                {item.observacoes}
            </p>
        </div>
      )}

      {isEditing && (
        <div className="mt-4">
             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Observações Internas</label>
             <textarea 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 outline-none focus:border-orange-500 h-16 resize-none"
                placeholder="Notas sobre este item..."
                value={state.draft.observacoes}
                onChange={(e) => setState(prev => ({ ...prev, draft: { ...prev.draft, observacoes: e.target.value }, hasChanges: true }))}
             />
        </div>
      )}
    </div>
  );
}

