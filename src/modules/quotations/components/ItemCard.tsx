import React, { useState, useEffect } from 'react';
import { Package, Pencil, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { SKUAutocomplete } from './SKUAutocomplete';
import { Card, Input, Textarea, Button, Badge } from '@/components/ui';
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
    <Card
      padding="none"
      variant={isEditing ? 'default' : 'default'}
      className={`relative overflow-hidden group/card transition-all ${
        isEditing
          ? 'border-[var(--ui-color-teal-500)] shadow-[var(--ui-shadow-2)]'
          : 'border-[var(--ui-border)]'
      }`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--ui-color-teal-500)]/5 blur-3xl -z-10 group-hover/card:bg-[var(--ui-color-teal-500)]/10 transition-colors pointer-events-none" />
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-10 h-10 rounded-[var(--ui-radius-md)] flex items-center justify-center ${
                  temSKU
                    ? 'bg-[var(--ui-color-teal-500)] text-white'
                    : 'bg-[var(--ui-bg-subtle)] text-[var(--ui-text-secondary)]'
                }`}
              >
                <Package size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[var(--ui-text-primary)] font-semibold text-xl tracking-tight truncate leading-none">
                  {tituloExibicao}
                </h3>
                {subtituloExibicao && (
                  <div className="mt-2">
                    <span className="text-[10px] text-[var(--ui-color-teal-700)] font-medium uppercase tracking-wide bg-[var(--ui-color-teal-50)] px-2 py-1 rounded border border-[var(--ui-color-teal-200)]">
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onDelete && confirm('Deseja remover este item?') && onDelete(item.id)
                  }
                  aria-label="Remover"
                >
                  <Trash2 size={16} />
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="md" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmit(onSubmit)}
                  isLoading={isSaving}
                  leftIcon={isSaving ? undefined : undefined}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
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
                        size="md"
                        className="w-full font-medium"
                        invalid={!!errors.nomeCustomizado}
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
                      size="sm"
                      className="w-full"
                      invalid={!!errors.quantidade}
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
                <Badge tone={Number(item.margemLucro) >= 30 ? 'success' : 'danger'}>
                  {Number(item.margemLucro || 0).toFixed(1)}%
                </Badge>
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
          <div className="mt-4 pt-4 border-t border-[var(--ui-border)] flex flex-col gap-2">
            <span className="text-[9px] font-medium text-[var(--ui-color-teal-700)] uppercase tracking-wide flex items-center gap-1">
              <Package size={12} /> Composição Dinâmica Ativa
            </span>
            <div className="flex flex-wrap gap-2">
              {item.metadata.chapa && (
                <Badge tone="neutral">
                  Chapa: <span className="font-semibold text-[var(--ui-text-primary)]">{item.metadata.chapa.codigo}</span>
                </Badge>
              )}
              {item.metadata.fitaBorda?.sku && (
                <Badge tone="neutral">
                  Fita: <span className="font-semibold text-[var(--ui-text-primary)]">{item.metadata.fitaBorda.sku.codigo}</span> (
                  {Object.entries(item.metadata.fitaBorda.lados || {})
                    .filter(([_, v]) => v)
                    .map(([k]) => k[0].toUpperCase())
                    .join(',')}
                  )
                </Badge>
              )}
              {item.metadata.ferragens?.map((f: any, i: number) => (
                <Badge key={i} tone="neutral">
                  {f.quantidade}x <span className="font-semibold text-[var(--ui-text-primary)]">{f.sku.codigo}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

      {item.observacoes && !isEditing && (
        <div className="mt-4 pt-4 border-t border-[var(--ui-border)] flex gap-2">
          <div className="w-1 h-full bg-[var(--ui-color-teal-500)]/50 rounded-full" />
          <p className="text-[var(--ui-text-xs)] text-[var(--ui-text-secondary)] italic leading-relaxed">
            {item.observacoes}
          </p>
        </div>
      )}

      {isEditing && (
        <div className="mt-4 pt-4 border-t border-[var(--ui-border)] space-y-4">
          <h4 className="text-[10px] font-medium text-[var(--ui-text-secondary)] uppercase tracking-wide flex items-center gap-2">
            <Package size={12} className="text-[var(--ui-color-teal-500)]" /> Composição Avançada de Materiais
          </h4>

          <div className="bg-[var(--ui-bg-subtle)] rounded-[var(--ui-radius-md)] p-4 border border-[var(--ui-border)] space-y-4">
            {/* CHAPA */}
            <div className="space-y-2">
              <label className="text-[9px] font-medium text-[var(--ui-text-secondary)] uppercase tracking-wide flex justify-between">
                <span>Chapa / Material Base</span>
                {watchAll.metadata?.chapa && (
                  <span className="text-[var(--ui-color-teal-700)] font-mono">
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
            <div className="space-y-2 border-t border-[var(--ui-border)] pt-4">
              <label className="text-[9px] font-medium text-[var(--ui-text-secondary)] uppercase tracking-wide flex justify-between">
                <span>Fita de Borda</span>
                {watchAll.metadata?.fitaBorda?.sku && (
                  <span className="text-[var(--ui-color-teal-700)] font-mono">
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
                      <Button
                        type="button"
                        variant="danger"
                        size="icon"
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
                        aria-label="Remover fita de borda"
                        title="Remover fita de borda"
                      >
                        <Trash2 size={14} />
                      </Button>
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
                          className="w-3 h-3 accent-[var(--ui-color-teal-500)]"
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
                    <span className="text-[10px] uppercase font-medium text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-text-primary)]">
                      {lado}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* FERRAGENS E ACESSÓRIOS */}
            <div className="space-y-2 border-t border-[var(--ui-border)] pt-4">
              <label className="text-[9px] font-medium text-[var(--ui-text-secondary)] uppercase tracking-wide flex justify-between">
                <span>Ferragens e Acessórios</span>
              </label>
              {watchAll.metadata?.ferragens?.map((f: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 mb-2 bg-[var(--ui-bg-subtle)] p-2 rounded-[var(--ui-radius-sm)] border border-[var(--ui-border)]"
                >
                  <span className="flex-1 text-xs text-[var(--ui-text-primary)] truncate font-medium">
                    {f.sku?.nome || f.sku?.codigo}{' '}
                    <span className="text-[var(--ui-text-secondary)] font-mono ml-2">
                      R$ {Number(f.sku?.precoUnitario).toFixed(2)} un
                    </span>
                  </span>
                  <Controller
                    name={`metadata.ferragens.${i}.quantidade` as any}
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        size="sm"
                        className="w-16 text-center font-mono"
                        value={field.value}
                        onChange={(e: any) => {
                          field.onChange(Number(e.target.value));
                          setTimeout(() => triggerCostRecalculation(getValues('metadata')), 0);
                        }}
                      />
                    )}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newF = [...(watchAll.metadata?.ferragens || [])].filter(
                        (_, idx) => idx !== i,
                      );
                      triggerCostRecalculation({ ...getValues('metadata'), ferragens: newF });
                    }}
                    aria-label="Remover"
                  >
                    <Trash2 size={12} />
                  </Button>
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
          <label className="text-[9px] font-medium text-[var(--ui-text-secondary)] uppercase tracking-wide block mb-1">
            Observações Internas
          </label>
          <Controller
            name="observacoes"
            control={control}
            render={({ field }) => (
              <Textarea
                rows={3}
                placeholder="Notas sobre este item..."
                className="min-h-[64px]"
                {...field}
              />
            )}
          />
        </div>
      )}
      </div>
    </Card>
  );
}
