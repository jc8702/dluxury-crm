import React, { useState, useEffect } from 'react';
import { Package, Pencil, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { SKUAutocomplete } from './SKUAutocomplete';
import { Input } from '@/components/common';
import { recalculateTotalMaterialCost, recalculatePrices } from '@/utils/calculations';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quotationItemSchema } from '@/validators';

interface ItemCardProps {
  item: any;
  onUpdate?: (itemId: string, updates: any) => void;
  onDelete?: (itemId: string) => void;
  isEditingExternal?: boolean;
}

export function ItemCard({ item, onUpdate, onDelete, isEditingExternal }: ItemCardProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [prevIsEditingExternal, setPrevIsEditingExternal] = useState<boolean | undefined>(
    undefined,
  );

  const safeParseMetadata = (meta: any) => {
    let parsed = meta;
    if (typeof meta === 'string') {
      try {
        parsed = JSON.parse(meta);
      } catch (e) {
        parsed = {};
      }
    }
    if (!parsed) parsed = {};
    return {
      chapa: parsed.chapa || null,
      fitaBorda: {
        sku: parsed.fitaBorda?.sku || null,
        lados: {
          topo: !!parsed.fitaBorda?.lados?.topo,
          base: !!parsed.fitaBorda?.lados?.base,
          esquerda: !!parsed.fitaBorda?.lados?.esquerda,
          direita: !!parsed.fitaBorda?.lados?.direita,
        },
      },
      ferragens: Array.isArray(parsed.ferragens) ? parsed.ferragens : [],
    };
  };

  const defaultValues = {
    nomeCustomizado: item.nomeCustomizado || '',
    quantidade: Number(item.quantidade) || 1,
    largura: item.largura || '',
    altura: item.altura || '',
    espessura: item.espessura || '',
    material: item.material || '',
    skuId: item.skuComponenteId || item.skuEngenhariaId || '',
    skuTipo: item.skuEngenhariaId ? 'ENGENHARIA' : 'COMPONENTE',
    skuCodigo: item.skuCodigo || item.skuEngenharia?.codigo || '',
    skuDescricao: item.skuDescricao || item.skuEngenharia?.nome || item.skuComponente?.nome || '',
    custoUnitarioCalculado: Number(item.custoUnitarioCalculado) || 0,
    precoVendaUnitario: Number(item.precoVendaUnitario) || 0,
    precoVendaSobrescrito: item.precoVendaSobrescrito ? Number(item.precoVendaSobrescrito) : null,
    margemLucro: Number(item.margemLucro) || 0,
    observacoes: item.observacoes || '',
    metadata: safeParseMetadata(item.metadata),
  };

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quotationItemSchema),
    defaultValues,
  });

  const watchAll = useWatch({ control });

  useEffect(() => {
    reset(defaultValues);
  }, [item, reset]);

  useEffect(() => {
    if (isEditingExternal !== prevIsEditingExternal) {
      if (isEditingExternal === false) {
        handleSubmit(onSubmit)();
      }
      if (isEditingExternal !== undefined) {
        setIsEditing(isEditingExternal);
      }
      setPrevIsEditingExternal(isEditingExternal);
    }
  }, [isEditingExternal, prevIsEditingExternal, handleSubmit]);

  const handleRecalculatePrices = (
    type: 'cost' | 'price' | 'margin',
    value: number,
    currentDraft: any,
  ) => {
    const { cost, price, margin } = recalculatePrices(type, value, currentDraft);
    setValue('custoUnitarioCalculado', cost);
    setValue('precoVendaUnitario', price);
    setValue('margemLucro', margin);
    if (type === 'price') {
      setValue('precoVendaSobrescrito', price);
    }
  };

  const triggerCostRecalculation = (metadata: any) => {
    const currentValues = getValues();
    const newValues = { ...currentValues, metadata };
    setValue('metadata', metadata);
    const cost = recalculateTotalMaterialCost(newValues);
    if (cost > 0) {
      handleRecalculatePrices('cost', cost, newValues);
    }
  };

  const onSubmit = async (data: any) => {
    if (!onUpdate) return;
    setIsSaving(true);
    const payload = {
      ...data,
      possuiOverride: data.precoVendaSobrescrito !== null,
      quantidade: data.quantidade.toString(),
      custoUnitarioCalculado: data.custoUnitarioCalculado.toFixed(2),
      precoVendaUnitario: data.precoVendaUnitario.toFixed(2),
      precoVendaSobrescrito: data.precoVendaSobrescrito?.toFixed(2) || null,
      metadata: data.metadata,
    };

    try {
      await onUpdate(item.id, payload);
      toastSuccess('Item salvo com sucesso.');
      setIsEditing(false);
    } catch (err) {
      console.error('[ItemCard] ❌ Erro ao salvar item:', err);
      toastError('Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    reset(defaultValues);
    setIsEditing(false);
  };

  // Suporte a Teclado
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(onSubmit)();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, handleSubmit]);

  const currentSKU = watchAll.skuCodigo || '';
  const currentDesc = watchAll.skuDescricao || '';
  const tituloExibicao = watchAll.nomeCustomizado || 'Item sem nome';

  const skuLimpo = currentSKU.trim();
  let descLimpa = currentDesc.trim();
  const prefixoRemover = new RegExp(
    `^${skuLimpo.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*[-–—:]*\\s*`,
    'i',
  );
  descLimpa = descLimpa.replace(prefixoRemover, '').trim();
  const isIdentical = descLimpa.toUpperCase() === skuLimpo.toUpperCase() || descLimpa === '';
  const subtituloExibicao = isIdentical
    ? skuLimpo
    : skuLimpo
      ? `${skuLimpo} - ${descLimpa}`
      : descLimpa;

  const precoTotal = (watchAll.precoVendaUnitario || 0) * (watchAll.quantidade || 0);
  const temSKU = !!watchAll.skuId || !!watchAll.skuCodigo;

  return (
    <div
      className={`bg-card rounded-2xl border ${isEditing ? 'border-primary shadow-2xl shadow-primary/10' : 'border-border'} p-5 transition-all group/card relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover/card:bg-primary/10 transition-colors" />

      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${temSKU ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-foreground font-black text-xl italic tracking-tight truncate leading-none uppercase">
                  {tituloExibicao}
                </h3>
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
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  onDelete && confirm('Deseja remover este item?') && onDelete(item.id)
                }
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
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving}
                className="px-6 h-10 rounded-xl bg-primary border border-primary flex items-center justify-center hover:bg-primary-hover text-primary-foreground text-[10px] font-black uppercase shadow-lg cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {isEditing && (
            <div className="bg-background p-4 rounded-xl border border-border space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  Vincular SKU Principal
                </label>
                <Controller
                  name="skuCodigo"
                  control={control}
                  render={({ field }) => (
                    <SKUAutocomplete
                      onSelect={(sku) => {
                        field.onChange(sku.codigo);
                        setValue('skuId', sku.id);
                        setValue('skuDescricao', sku.nome);
                        setValue('skuTipo', (sku as any).tipo);
                        const cost = Number(sku.precoUnitario) || 0;
                        handleRecalculatePrices('cost', cost, getValues());
                      }}
                      value={field.value}
                      error={errors.skuCodigo?.message as string}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Nome Customizado
                  </label>
                  <Controller
                    name="nomeCustomizado"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="text"
                        className={`w-full text-sm font-bold h-10 px-3 ${errors.nomeCustomizado ? 'border-red-500' : ''}`}
                        {...field}
                      />
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Material
                  </label>
                  <Controller
                    name="material"
                    control={control}
                    render={({ field }) => (
                      <SKUAutocomplete
                        placeholder="Buscar material..."
                        value={field.value}
                        onChange={field.onChange}
                        onSelect={(sku) => field.onChange(sku.nome)}
                        error={errors.material?.message as string}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted p-3 rounded-xl border border-border">
              <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">
                Quantidade
              </label>
              {isEditing ? (
                <Controller
                  name="quantidade"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      className={`w-full h-8 text-foreground font-bold px-2 py-1 ${errors.quantidade ? 'border-red-500' : ''}`}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              ) : (
                <span className="text-foreground font-black">
                  {item.quantidade}{' '}
                  <span className="text-muted-foreground text-[10px]">
                    {item.unidadeMedida || 'UN'}
                  </span>
                </span>
              )}
            </div>
            <div className="bg-muted p-3 rounded-xl border border-border">
              <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">
                Largura
              </label>
              <span className="text-muted-foreground font-mono text-sm">
                {item.largura || '-'} <span className="text-[10px]">mm</span>
              </span>
            </div>
            <div className="bg-muted p-3 rounded-xl border border-border">
              <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">
                Altura
              </label>
              <span className="text-muted-foreground font-mono text-sm">
                {item.altura || '-'} <span className="text-[10px]">mm</span>
              </span>
            </div>
            <div className="bg-muted p-3 rounded-xl border border-border">
              <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">
                Espessura
              </label>
              <span className="text-muted-foreground font-mono text-sm">
                {item.espessura || '-'} <span className="text-[10px]">mm</span>
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
          <div className="bg-muted/50 rounded-2xl p-4 border border-border flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-tighter">
                  Custo Unitário
                </span>
              </div>
              {isEditing ? (
                <Controller
                  name="custoUnitarioCalculado"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      className="w-24 h-8 text-right font-mono text-sm px-2 py-1"
                      value={field.value}
                      onChange={(e) =>
                        handleRecalculatePrices(
                          'cost',
                          parseFloat(e.target.value) || 0,
                          getValues(),
                        )
                      }
                    />
                  )}
                />
              ) : (
                <span className="text-muted-foreground font-mono text-sm">
                  R$ {Number(item.custoUnitarioCalculado || 0).toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5" />
                <span className="text-foreground text-xs font-bold uppercase tracking-tighter">
                  Preço de Venda
                </span>
              </div>
              {isEditing ? (
                <Controller
                  name="precoVendaUnitario"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      className="border-primary/50 text-right w-24 text-sm font-mono text-primary h-8 px-2 py-1 font-black"
                      value={field.value}
                      onChange={(e) =>
                        handleRecalculatePrices(
                          'price',
                          parseFloat(e.target.value) || 0,
                          getValues(),
                        )
                      }
                    />
                  )}
                />
              ) : (
                <span className="text-primary font-mono font-black">
                  R$ {Number(item.precoVendaUnitario || 0).toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-muted-foreground text-[10px] font-black uppercase">
                Margem Real (%)
              </span>
              {isEditing ? (
                <Controller
                  name="margemLucro"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      className="text-right w-20 h-8 text-[10px] px-2 py-1 font-black font-mono bg-background border-border"
                      value={field.value}
                      onChange={(e) =>
                        handleRecalculatePrices(
                          'margin',
                          parseFloat(e.target.value) || 0,
                          getValues(),
                        )
                      }
                    />
                  )}
                />
              ) : (
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${Number(item.margemLucro) >= 30 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                >
                  {Number(item.margemLucro || 0).toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-end mt-auto pt-2 px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Total do Item
              </span>
              <span className="text-2xl font-black italic text-foreground leading-none mt-1">
                R$ {precoTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isEditing &&
        item.metadata &&
        (item.metadata.chapa ||
          item.metadata.fitaBorda?.sku ||
          item.metadata.ferragens?.length > 0) && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
            <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
              <Package className="w-3 h-3" /> Composição Dinâmica Ativa
            </span>
            <div className="flex flex-wrap gap-2">
              {item.metadata.chapa && (
                <span className="bg-muted border border-border text-[10px] text-muted-foreground px-2 py-1 rounded">
                  Chapa: <b className="text-foreground">{item.metadata.chapa.codigo}</b>
                </span>
              )}
              {item.metadata.fitaBorda?.sku && (
                <span className="bg-muted border border-border text-[10px] text-muted-foreground px-2 py-1 rounded">
                  Fita: <b className="text-foreground">{item.metadata.fitaBorda.sku.codigo}</b> (
                  {Object.entries(item.metadata.fitaBorda.lados || {})
                    .filter(([_, v]) => v)
                    .map(([k]) => k[0].toUpperCase())
                    .join(',')}
                  )
                </span>
              )}
              {item.metadata.ferragens?.map((f: any, i: number) => (
                <span
                  key={i}
                  className="bg-muted border border-border text-[10px] text-muted-foreground px-2 py-1 rounded"
                >
                  {f.quantidade}x <b className="text-foreground">{f.sku.codigo}</b>
                </span>
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
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Package className="w-3 h-3 text-primary" /> Composição Avançada de Materiais
          </h4>

          <div className="bg-background rounded-xl p-4 border border-border space-y-4">
            {/* CHAPA */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex justify-between">
                <span>Chapa / Material Base</span>
                {watchAll.metadata?.chapa && (
                  <span className="text-primary font-mono">
                    R$ {Number(watchAll.metadata.chapa.precoUnitario).toFixed(2)} / m²
                  </span>
                )}
              </label>
              <Controller
                name="metadata.chapa"
                control={control}
                render={({ field }) => (
                  <SKUAutocomplete
                    placeholder="Buscar chapa de MDF..."
                    value={field.value?.codigo || ''}
                    onSelect={(sku) => {
                      field.onChange(sku);
                      triggerCostRecalculation({ ...getValues('metadata'), chapa: sku });
                    }}
                  />
                )}
              />
            </div>

            {/* FITA DE BORDA */}
            <div className="space-y-2 border-t border-border pt-4">
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex justify-between">
                <span>Fita de Borda</span>
                {watchAll.metadata?.fitaBorda?.sku && (
                  <span className="text-primary font-mono">
                    R$ {Number(watchAll.metadata.fitaBorda.sku.precoUnitario).toFixed(2)} / ML
                  </span>
                )}
              </label>

              <Controller
                name="metadata.fitaBorda.sku"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SKUAutocomplete
                        placeholder="Buscar fita de borda..."
                        categoria="BRD"
                        value={field.value?.codigo || ''}
                        onChange={(val) => {
                          if (!val) {
                            field.onChange(null);
                            const metadata = getValues('metadata') || {};
                            triggerCostRecalculation({
                              ...metadata,
                              fitaBorda: {
                                sku: null,
                                lados: {
                                  topo: false,
                                  base: false,
                                  esquerda: false,
                                  direita: false,
                                },
                              },
                            });
                          }
                        }}
                        onSelect={(sku) => {
                          field.onChange(sku);
                          const metadata = getValues('metadata') || {};
                          triggerCostRecalculation({
                            ...metadata,
                            fitaBorda: { ...metadata.fitaBorda, sku },
                          });
                        }}
                      />
                    </div>
                    {field.value && (
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange(null);
                          const metadata = getValues('metadata') || {};
                          triggerCostRecalculation({
                            ...metadata,
                            fitaBorda: {
                              sku: null,
                              lados: { topo: false, base: false, esquerda: false, direita: false },
                            },
                          });
                        }}
                        className="w-8 h-10 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl border border-red-500/20 cursor-pointer"
                        title="Remover fita de borda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              />

              <div className="flex gap-4 mt-2">
                {['topo', 'base', 'esquerda', 'direita'].map((lado) => (
                  <label key={lado} className="flex items-center gap-1.5 cursor-pointer group">
                    <Controller
                      name={`metadata.fitaBorda.lados.${lado}` as any}
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          className="w-3 h-3 accent-primary"
                          checked={!!field.value}
                          onChange={(e) => {
                            field.onChange(e.target.checked);
                            const metadata = getValues('metadata') || {};
                            const fitaBorda = metadata.fitaBorda || {};
                            const lados = fitaBorda.lados || {};
                            triggerCostRecalculation({
                              ...metadata,
                              fitaBorda: {
                                ...fitaBorda,
                                lados: { ...lados, [lado]: e.target.checked },
                              },
                            });
                          }}
                        />
                      )}
                    />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground group-hover:text-foreground">
                      {lado}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* FERRAGENS E ACESSÓRIOS */}
            <div className="space-y-2 border-t border-border pt-4">
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex justify-between">
                <span>Ferragens e Acessórios</span>
              </label>
              {watchAll.metadata?.ferragens?.map((f: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 mb-2 bg-muted p-2 rounded-lg border border-border"
                >
                  <span className="flex-1 text-xs text-foreground truncate font-bold">
                    {f.sku?.nome || f.sku?.codigo}{' '}
                    <span className="text-muted-foreground font-mono ml-2">
                      R$ {Number(f.sku?.precoUnitario).toFixed(2)} un
                    </span>
                  </span>
                  <Controller
                    name={`metadata.ferragens.${i}.quantidade` as any}
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="1"
                        className="w-16 h-8 text-xs font-mono text-center px-2 py-1 bg-background border-border"
                        value={field.value}
                        onChange={(e: any) => {
                          field.onChange(Number(e.target.value));
                          setTimeout(() => triggerCostRecalculation(getValues('metadata')), 0);
                        }}
                      />
                    )}
                  />
                  <button
                    onClick={() => {
                      const newF = [...(watchAll.metadata?.ferragens || [])].filter(
                        (_, idx) => idx !== i,
                      );
                      triggerCostRecalculation({ ...getValues('metadata'), ferragens: newF });
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <div className="flex-1">
                  <SKUAutocomplete
                    placeholder="Buscar corrediça, dobradiça..."
                    onSelect={(sku) => {
                      const metadata = getValues('metadata') || {};
                      const newF = [...(metadata.ferragens || []), { sku, quantidade: 1 }];
                      triggerCostRecalculation({ ...metadata, ferragens: newF });
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
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
            Observações Internas
          </label>
          <Controller
            name="observacoes"
            control={control}
            render={({ field }) => (
              <textarea
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-muted-foreground outline-none focus:border-primary h-16 resize-none"
                placeholder="Notas sobre este item..."
                {...field}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}
