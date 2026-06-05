import React, { useEffect, useMemo, useState } from 'react';
import {
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Search,
  FileText,
  Layers,
  DollarSign,
} from 'lucide-react';

import { useQuotation } from '../../modules/quotations/hooks/useQuotation';
import type { Quotation, QuotationStatus } from './QuotationList';

export interface QuotationItem {
  id: string;
  skuId?: string;
  skuDescricao?: string;
  skuCodigo?: string;
  nomeCustomizado?: string;
  quantidade: number;
  unidadeMedida?: string;
  precoUnitario?: number;
  precoVendaUnitario?: number;
  metadata?: {
    fitaBorda?: {
      sku?: { codigo?: string; precoUnitario?: number } | null;
      lados?: { topo?: boolean; base?: boolean; esquerda?: boolean; direita?: boolean };
    };
  };
}

interface QuotationFormProps {
  orcamentoId?: string;
  initialQuotation?: Partial<Quotation>;
  clients: Array<{ id: string; nome: string }>;
  skus: Array<{
    id: string;
    nome?: string;
    codigo?: string;
    precoUnitario?: number;
    unidadeMedida?: string;
  }>;
  onSaved: (q: Quotation) => void;
  onCancel: () => void;
  onLoadClients?: () => Promise<Array<{ id: string; nome: string }>>;
  onLoadSkus?: (q?: string) => Promise<
    Array<{
      id: string;
      nome?: string;
      codigo?: string;
      precoUnitario?: number;
      unidadeMedida?: string;
    }>
  >;
}

const STATUS_OPTIONS: { value: QuotationStatus; label: string }[] = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
  { value: 'NEGOCIACAO', label: 'Negociação' },
  { value: 'FECHADA', label: 'Fechada' },
  { value: 'PERDIDA', label: 'Perdida' },
];

const LADOS_FITA: Array<{ key: 'topo' | 'base' | 'esquerda' | 'direita'; label: string }> = [
  { key: 'topo', label: 'Topo' },
  { key: 'base', label: 'Base' },
  { key: 'esquerda', label: 'Esquerda' },
  { key: 'direita', label: 'Direita' },
];

const formatCurrency = (v?: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export const QuotationForm: React.FC<QuotationFormProps> = ({
  orcamentoId,
  initialQuotation,
  clients,
  onSaved,
  onCancel,
  onLoadSkus,
}) => {
  const { quotation, loading, error, setHeader, addItem, removerItem, applyGlobalMargin } =
    useQuotation(orcamentoId);

  // Local form state
  const [clienteId, setClienteId] = useState(initialQuotation?.clienteId || '');
  const [margem, setMargem] = useState(initialQuotation?.margemLucroPercentual ?? 30);
  const [taxaFinanceira, setTaxaFinanceira] = useState(
    initialQuotation?.taxaFinanceiraPercentual ?? 0,
  );
  const [validadeDias, setValidadeDias] = useState(initialQuotation?.validadeDias ?? 15);
  const [status, setStatus] = useState<QuotationStatus>(initialQuotation?.status || 'RASCUNHO');
  const [itens, setItens] = useState<QuotationItem[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [skus, setSkus] = useState<QuotationFormProps['skus']>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Hydrate from loaded quotation
  useEffect(() => {
    if (quotation) {
      setClienteId(quotation.clienteId || '');
      setMargem(Number(quotation.margemLucroPercentual) || 0);
      setTaxaFinanceira(Number(quotation.taxaFinanceiraPercentual) || 0);
      setValidadeDias(Number(quotation.validadeDias) || 0);
      setStatus(quotation.status || 'RASCUNHO');
      setItens(Array.isArray(quotation.itens) ? quotation.itens : []);
    }
  }, [quotation]);

  // Load SKUs (debounced)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (onLoadSkus) {
        const data = await onLoadSkus(skuSearch);
        if (!cancelled) setSkus(data);
      }
    };
    const timer = setTimeout(load, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [skuSearch, onLoadSkus]);

  // Computed values
  const subtotal = useMemo(
    () =>
      itens.reduce(
        (acc, i) =>
          acc +
          (Number(i.quantidade) || 0) * (Number(i.precoVendaUnitario ?? i.precoUnitario) || 0),
        0,
      ),
    [itens],
  );
  const valorMargem = useMemo(() => subtotal * (margem / 100), [subtotal, margem]);
  const valorTaxa = useMemo(
    () => (subtotal + valorMargem) * (taxaFinanceira / 100),
    [subtotal, valorMargem, taxaFinanceira],
  );
  const total = useMemo(
    () => subtotal + valorMargem + valorTaxa,
    [subtotal, valorMargem, valorTaxa],
  );

  // Add item
  const handleAddItem = (sku: {
    id: string;
    nome?: string;
    codigo?: string;
    precoUnitario?: number;
    unidadeMedida?: string;
  }) => {
    const novoItem: QuotationItem = {
      id: `local-${Date.now()}`,
      skuId: sku.id,
      skuDescricao: sku.nome || '',
      skuCodigo: sku.codigo || '',
      quantidade: 1,
      unidadeMedida: sku.unidadeMedida || 'UN',
      precoVendaUnitario: sku.precoUnitario || 0,
      metadata: {
        fitaBorda: {
          sku: null,
          lados: { topo: false, base: false, esquerda: false, direita: false },
        },
      },
    };
    setItens((prev) => [...prev, novoItem]);
    setSkuSearch('');
    if (orcamentoId && addItem) void addItem(sku.id, 1);
  };

  const handleRemoveItem = (id: string) => {
    setItens((prev) => prev.filter((i) => i.id !== id));
    if (orcamentoId && removerItem) void removerItem(id);
  };

  const handleItemChange = (id: string, field: keyof QuotationItem, value: unknown) => {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleFitaBordaLado = (
    itemId: string,
    lado: 'topo' | 'base' | 'esquerda' | 'direita',
    value: boolean,
  ) => {
    setItens((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const lados = {
          topo: false,
          base: false,
          esquerda: false,
          direita: false,
          ...(i.metadata?.fitaBorda?.lados || {}),
        };
        lados[lado] = value;
        return {
          ...i,
          metadata: {
            ...(i.metadata || {}),
            fitaBorda: {
              ...(i.metadata?.fitaBorda || {}),
              lados,
              sku: i.metadata?.fitaBorda?.sku || null,
            },
          },
        };
      }),
    );
  };

  const handleFitaBordaSku = (itemId: string, codigo: string) => {
    setItens((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        return {
          ...i,
          metadata: {
            ...(i.metadata || {}),
            fitaBorda: {
              ...(i.metadata?.fitaBorda || {}),
              sku: codigo
                ? { codigo, precoUnitario: i.metadata?.fitaBorda?.sku?.precoUnitario || 0 }
                : null,
              lados: i.metadata?.fitaBorda?.lados || {
                topo: false,
                base: false,
                esquerda: false,
                direita: false,
              },
            },
          },
        };
      }),
    );
  };

  // Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!clienteId) errs.clienteId = 'Selecione um cliente';
    if (itens.length === 0) errs.itens = 'Adicione pelo menos 1 item ao orçamento';
    if (margem < 0 || margem > 100) errs.margem = 'A margem deve estar entre 0% e 100%';
    if (taxaFinanceira < 0 || taxaFinanceira > 100)
      errs.taxaFinanceira = 'A taxa financeira deve estar entre 0% e 100%';
    if (validadeDias < 1) errs.validadeDias = 'A validade deve ser de pelo menos 1 dia';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (orcamentoId && setHeader) {
        await setHeader({
          clienteId,
          margemLucroPercentual: margem,
          taxaFinanceiraPercentual: taxaFinanceira,
          validadeDias,
          status,
        });
        if (applyGlobalMargin) await applyGlobalMargin(margem);
      }
      onSaved({
        id: orcamentoId || 'draft',
        numeroOrcamento: quotation?.numeroOrcamento || '—',
        clienteId,
        clienteNome: clients.find((c) => c.id === clienteId)?.nome,
        margemLucroPercentual: margem,
        taxaFinanceiraPercentual: taxaFinanceira,
        validadeDias,
        status,
        valorTotalVenda: total,
        itens: itens as unknown as Quotation['itens'],
      } as Quotation);
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1A1A1A',
    marginBottom: '4px',
  };

  const requiredMark: React.CSSProperties = { color: '#DC3545', marginLeft: 2 };

  const errorText: React.CSSProperties = {
    fontSize: '12px',
    color: '#DC3545',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 600,
  };

  const fieldInput = (hasError: boolean, extra: React.CSSProperties = {}): React.CSSProperties => ({
    width: '100%',
    background: '#FFFFFF',
    border: `1px solid ${hasError ? '#DC3545' : '#E0E0E0'}`,
    borderRadius: '8px',
    padding: `8px 16px`,
    fontSize: '14px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: '#1A1A1A',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
    ...extra,
  });

  const sectionTitle = (icon: React.ReactNode, text: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '18px',
        fontWeight: 700,
        color: '#1A1A1A',
        paddingBottom: '8px',
        marginBottom: '24px',
        borderBottom: `2px solid #0D66CC`,
      }}
    >
      <span style={{ color: '#0D66CC', display: 'inline-flex' }}>{icon}</span>
      <span>{text}</span>
    </div>
  );

  if (loading && !quotation) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: '#666666',
        }}
      >
        Carregando orçamento...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: '#DC3545',
        }}
      >
        <AlertCircle size={32} style={{ display: 'block', margin: '0 auto' }} />
        <p style={{ marginTop: '8px' }}>{error}</p>
      </div>
    );
  }

  return (
    <form
      className="ds-quotation-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        padding: '24px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#1A1A1A',
      }}
      noValidate
    >
      <style>{`
        .ds-quotation-form input:focus, .ds-quotation-form select:focus, .ds-quotation-form textarea:focus {
          border-color: #0D66CC !important;
          box-shadow: 0 0 0 3px #E0EFFF;
        }
        .ds-quotation-form input[aria-invalid="true"], .ds-quotation-form select[aria-invalid="true"] {
          border-color: #DC3545;
        }
      `}</style>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#1A1A1A',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {orcamentoId
              ? `Editar Orçamento #${quotation?.numeroOrcamento || ''}`
              : 'Novo Orçamento'}
          </h1>
          <p
            style={{
              color: '#666666',
              fontSize: '14px',
              margin: `4px 0 0 0`,
            }}
          >
            Preencha as 3 seções para gerar a proposta industrial
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: '#FFFFFF',
              color: '#1A1A1A',
              border: `1px solid #E0E0E0`,
              borderRadius: '8px',
              padding: `8px 24px`,
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <X size={16} /> Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: '#0D66CC',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: `8px 24px`,
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: `0 4px 12px #0D66CC40`,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Proposta'}
          </button>
        </div>
      </header>

      {/* ─── SEÇÃO 1: Dados Principais ─── */}
      <section
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
        }}
      >
        {sectionTitle(<FileText size={20} />, '1. Dados Principais')}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <label htmlFor="clienteId" style={fieldLabel}>
              Cliente<span style={requiredMark}>*</span>
            </label>
            <select
              id="clienteId"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              aria-invalid={!!errors.clienteId}
              style={fieldInput(!!errors.clienteId, { cursor: 'pointer' })}
            >
              <option value="">Selecione um cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {errors.clienteId && (
              <p style={errorText} role="alert">
                <AlertCircle size={12} /> {errors.clienteId}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="numero" style={fieldLabel}>
              Número
            </label>
            <input
              id="numero"
              type="text"
              value={quotation?.numeroOrcamento || 'Gerado automaticamente ao salvar'}
              disabled
              style={fieldInput(false, {
                background: '#FAFAFA',
                color: '#666666',
                cursor: 'not-allowed',
              })}
            />
          </div>

          <div>
            <label htmlFor="margem" style={fieldLabel}>
              Margem de Lucro (%)<span style={requiredMark}>*</span>
            </label>
            <input
              id="margem"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={margem}
              onChange={(e) => setMargem(parseFloat(e.target.value) || 0)}
              aria-invalid={!!errors.margem}
              style={fieldInput(!!errors.margem)}
            />
            {errors.margem ? (
              <p style={errorText} role="alert">
                <AlertCircle size={12} /> {errors.margem}
              </p>
            ) : (
              <p
                style={{
                  fontSize: '12px',
                  color: '#666666',
                  marginTop: '4px',
                }}
              >
                Valor entre 0% e 100%
              </p>
            )}
          </div>

          <div>
            <label htmlFor="taxa" style={fieldLabel}>
              Taxa Financeira (%)
            </label>
            <input
              id="taxa"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={taxaFinanceira}
              onChange={(e) => setTaxaFinanceira(parseFloat(e.target.value) || 0)}
              aria-invalid={!!errors.taxaFinanceira}
              style={fieldInput(!!errors.taxaFinanceira)}
            />
            {errors.taxaFinanceira && (
              <p style={errorText} role="alert">
                <AlertCircle size={12} /> {errors.taxaFinanceira}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="validade" style={fieldLabel}>
              Validade (dias)<span style={requiredMark}>*</span>
            </label>
            <input
              id="validade"
              type="number"
              min={1}
              value={validadeDias}
              onChange={(e) => setValidadeDias(parseInt(e.target.value) || 0)}
              aria-invalid={!!errors.validadeDias}
              style={fieldInput(!!errors.validadeDias)}
            />
            {errors.validadeDias && (
              <p style={errorText} role="alert">
                <AlertCircle size={12} /> {errors.validadeDias}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="status" style={fieldLabel}>
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as QuotationStatus)}
              style={fieldInput(false, { cursor: 'pointer' })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── SEÇÃO 2: Itens ─── */}
      <section
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
        }}
      >
        {sectionTitle(<Layers size={20} />, '2. Itens do Projeto')}

        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666666',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Buscar SKU de engenharia para adicionar…"
            value={skuSearch}
            onChange={(e) => setSkuSearch(e.target.value)}
            style={{ ...fieldInput(false), paddingLeft: '48px' }}
          />
          {skuSearch && skus.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                maxHeight: 320,
                overflowY: 'auto',
                background: '#FFFFFF',
                border: `1px solid #E0E0E0`,
                borderRadius: '8px',
                boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
                zIndex: 100,
              }}
            >
              {skus.map((sku) => (
                <button
                  key={sku.id}
                  type="button"
                  onClick={() => handleAddItem(sku)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid #E0E0E0`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#F0F7FF';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#1A1A1A',
                        fontSize: '14px',
                      }}
                    >
                      {sku.nome}
                    </div>
                    {sku.codigo && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666666',
                          fontFamily: 'monospace',
                          marginTop: 2,
                        }}
                      >
                        {sku.codigo}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        color: '#666666',
                        fontSize: '12px',
                      }}
                    >
                      {formatCurrency(sku.precoUnitario)}
                    </span>
                    <Plus size={16} color={'#0D66CC'} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {errors.itens && (
          <p style={{ ...errorText, marginBottom: '16px' }} role="alert">
            <AlertCircle size={12} /> {errors.itens}
          </p>
        )}

        {itens.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: '#666666',
              border: `2px dashed #E0E0E0`,
              borderRadius: '8px',
              background: '#FAFAFA',
            }}
          >
            <Layers size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto' }} />
            <p style={{ margin: `8px 0 0 0` }}>
              Nenhum item adicionado. Use a busca acima para incluir SKUs de engenharia.
            </p>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              overflowX: 'auto',
              borderRadius: '8px',
              border: `1px solid #E0E0E0`,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#FAFAFA',
                    borderBottom: `2px solid #E0E0E0`,
                  }}
                >
                  <th style={thStyle}>SKU / Item</th>
                  <th style={{ ...thStyle, width: 80, textAlign: 'center' }}>Qtd</th>
                  <th style={{ ...thStyle, width: 120, textAlign: 'right' }}>Preço Unit.</th>
                  <th style={{ ...thStyle, width: 130, textAlign: 'right' }}>Total</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>Fita de Borda</th>
                  <th style={{ ...thStyle, width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const qtd = Number(item.quantidade) || 0;
                  const preco = Number(item.precoVendaUnitario ?? item.precoUnitario) || 0;
                  const totalItem = qtd * preco;
                  const fitaSku = item.metadata?.fitaBorda?.sku?.codigo || '';
                  const lados = item.metadata?.fitaBorda?.lados || {};
                  const fitaAtiva = !!(
                    fitaSku ||
                    lados.topo ||
                    lados.base ||
                    lados.esquerda ||
                    lados.direita
                  );
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: `1px solid #E0E0E0`,
                        verticalAlign: 'top',
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#1A1A1A',
                          }}
                        >
                          {item.skuDescricao || item.nomeCustomizado || '—'}
                        </div>
                        {item.skuCodigo && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666666',
                              fontFamily: 'monospace',
                              marginTop: 2,
                            }}
                          >
                            {item.skuCodigo}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.quantidade}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantidade', parseFloat(e.target.value) || 0)
                          }
                          style={{ ...fieldInput(false), textAlign: 'center', width: 60 }}
                        />
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666666',
                            marginTop: 2,
                          }}
                        >
                          {item.unidadeMedida || 'UN'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.precoVendaUnitario ?? item.precoUnitario ?? 0}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              'precoVendaUnitario',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          style={{ ...fieldInput(false), textAlign: 'right', width: 100 }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#1A1A1A',
                        }}
                      >
                        {formatCurrency(totalItem)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <input
                            type="text"
                            placeholder="SKU da fita (opcional)"
                            value={fitaSku}
                            onChange={(e) => handleFitaBordaSku(item.id, e.target.value)}
                            style={{
                              ...fieldInput(false),
                              fontSize: '12px',
                              padding: `4px 8px`,
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                            }}
                          >
                            {LADOS_FITA.map((lado) => {
                              const checked = !!lados[lado.key];
                              return (
                                <label
                                  key={lado.key}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: `2px 8px`,
                                    background: checked ? '#F0F7FF' : '#FAFAFA',
                                    color: checked ? '#0D5FB8' : '#666666',
                                    border: `1px solid ${checked ? '#0D66CC' : '#E0E0E0'}`,
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      handleFitaBordaLado(item.id, lado.key, e.target.checked)
                                    }
                                    style={{
                                      position: 'absolute',
                                      opacity: 0,
                                      pointerEvents: 'none',
                                    }}
                                  />
                                  {checked && <Check size={10} />}
                                  {lado.label}
                                </label>
                              );
                            })}
                          </div>
                          {fitaAtiva && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#28A745',
                                fontWeight: 600,
                              }}
                            >
                              Fita configurada
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label="Remover item"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            background: 'transparent',
                            color: '#DC3545',
                            border: `1px solid #F0A8AE`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = '#FBE9EB';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── SEÇÃO 3: Resumo ─── */}
      <section
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
        }}
      >
        {sectionTitle(<DollarSign size={20} />, '3. Resumo Financeiro')}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <SummaryCard
            label="Subtotal"
            value={formatCurrency(subtotal)}
            color={'#666666'}
            bg={'#FAFAFA'}
          />
          <SummaryCard
            label={`Margem (${margem}%)`}
            value={formatCurrency(valorMargem)}
            color={'#E2AC00'}
            bg={'#E2AC00' + '15'}
          />
          <SummaryCard
            label={`Taxa Financeira (${taxaFinanceira}%)`}
            value={formatCurrency(valorTaxa)}
            color={'#17A2B8'}
            bg={'#17A2B8' + '15'}
          />
          <SummaryCard
            label="Total Geral"
            value={formatCurrency(total)}
            color={'#0D5FB8'}
            bg={'#F0F7FF'}
            highlight
          />
        </div>

        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#FAFAFA',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#666666',
          }}
        >
          <strong style={{ color: '#1A1A1A' }}>Validade da proposta:</strong> {validadeDias} dias
          &nbsp;·&nbsp;
          <strong style={{ color: '#1A1A1A' }}>Itens:</strong> {itens.length}
          &nbsp;·&nbsp;
          <strong style={{ color: '#1A1A1A' }}>Cliente:</strong>{' '}
          {clients.find((c) => c.id === clienteId)?.nome || '—'}
        </div>
      </section>
    </form>
  );
};

const thStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#666666',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const SummaryCard: React.FC<{
  label: string;
  value: string;
  color: string;
  bg: string;
  highlight?: boolean;
}> = ({ label, value, color, bg, highlight }) => (
  <div
    style={{
      background: bg,
      border: `1px solid ${highlight ? '#0D66CC' : '#E0E0E0'}`,
      borderRadius: '8px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}
  >
    <div
      style={{
        fontSize: '12px',
        fontWeight: 600,
        color: '#666666',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: highlight ? '24px' : '20px',
        fontWeight: 700,
        color,
      }}
    >
      {value}
    </div>
  </div>
);

export default QuotationForm;
