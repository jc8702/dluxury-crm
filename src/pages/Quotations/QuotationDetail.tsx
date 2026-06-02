import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Edit3,
  Printer,
  FileDown,
  Trash2,
  Calendar,
  User,
  Hash,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { designSystem } from '@/styles/design-system';
import { exportBudgetToPDF } from '../../modules/quotations/services/export-pdf';
import type { Quotation, QuotationStatus } from './QuotationList';

export interface DetailItem {
  id: string;
  nomeCustomizado?: string;
  skuDescricao?: string;
  skuCodigo?: string;
  quantidade: number;
  unidadeMedida?: string;
  precoVendaUnitario?: number;
  precoUnitario?: number;
  metadata?: {
    fitaBorda?: {
      sku?: { codigo?: string; precoUnitario?: number } | null;
      lados?: { topo?: boolean; base?: boolean; esquerda?: boolean; direita?: boolean };
    };
  };
}

interface QuotationDetailProps {
  quotation: Quotation;
  items?: DetailItem[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_META: Record<
  QuotationStatus,
  { label: string; bg: string; fg: string; border: string }
> = {
  RASCUNHO: { label: 'RASCUNHO', bg: '#F0F0F0', fg: '#666666', border: '#CCCCCC' },
  ENVIADO: { label: 'ENVIADO', bg: '#E0EFFF', fg: '#0D5FB8', border: '#99C5F0' },
  APROVADO: { label: 'APROVADO', bg: '#E6F4EA', fg: '#1E7E34', border: '#A8D5B6' },
  REJEITADO: { label: 'REJEITADO', bg: '#FBE9EB', fg: '#B02A37', border: '#F0A8AE' },
  NEGOCIACAO: { label: 'NEGOCIAÇÃO', bg: '#FFF4E0', fg: '#8A5A00', border: '#F0CB7A' },
  FECHADA: { label: 'FECHADA', bg: '#E6F4EA', fg: '#1E7E34', border: '#A8D5B6' },
  PERDIDA: { label: 'PERDIDA', bg: '#FBE9EB', fg: '#B02A37', border: '#F0A8AE' },
};

const formatCurrency = (v?: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const LADOS_LABELS: Record<string, string> = {
  topo: 'Topo',
  base: 'Base',
  esquerda: 'Esquerda',
  direita: 'Direita',
};

export const QuotationDetail: React.FC<QuotationDetailProps> = ({
  quotation,
  items = [],
  onBack,
  onEdit,
  onDelete,
}) => {
  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, i) =>
          acc +
          (Number(i.quantidade) || 0) * (Number(i.precoVendaUnitario ?? i.precoUnitario) || 0),
        0,
      ),
    [items],
  );
  const margemPct = Number(quotation.margemLucroPercentual) || 0;
  const taxaPct = Number(quotation.taxaFinanceiraPercentual) || 0;
  const valorMargem = subtotal * (margemPct / 100);
  const valorTaxa = (subtotal + valorMargem) * (taxaPct / 100);
  const total = quotation.valorTotalVenda ?? subtotal + valorMargem + valorTaxa;
  const statusMeta = STATUS_META[quotation.status] || STATUS_META.RASCUNHO;

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    try {
      exportBudgetToPDF({
        ...quotation,
        itens: items,
        validadeDias: quotation.validadeDias,
        taxaFinanceiraPercentual: taxaPct,
        valorTotalVenda: total,
      });
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      window.open(`/api/orcamentos/export-pdf?id=${quotation.id}`, '_blank');
    }
  };

  const handleDelete = () => {
    const ok = window.confirm(
      `Excluir o orçamento #${quotation.numeroOrcamento}? Esta ação não pode ser desfeita.`,
    );
    if (ok) onDelete();
  };

  const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
    icon,
    label,
    value,
  }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: designSystem.spacing.sm }}>
      <span
        style={{ color: designSystem.colors.primary[500], display: 'inline-flex', marginTop: 2 }}
      >
        {icon}
      </span>
      <div>
        <div
          style={{
            fontSize: designSystem.typography.fontSizes.xs,
            color: designSystem.colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: designSystem.typography.fontWeights.semibold,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: designSystem.typography.fontSizes.md,
            color: designSystem.colors.text.primary,
            fontWeight: designSystem.typography.fontWeights.semibold,
            marginTop: 2,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="ds-quotation-detail"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: designSystem.spacing.lg,
        padding: designSystem.spacing.lg,
        fontFamily: designSystem.typography.fontFamily,
        color: designSystem.colors.text.primary,
      }}
    >
      <style>{`
        @media print {
          .ds-quotation-detail .ds-no-print { display: none !important; }
          .ds-quotation-detail { padding: 0 !important; gap: 16px !important; }
          .ds-quotation-detail section { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        .ds-quotation-detail .ds-item-row:hover { background: ${designSystem.colors.background}; }
      `}</style>

      <header
        className="ds-no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: designSystem.spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: designSystem.spacing.md }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              background: designSystem.colors.surface,
              color: designSystem.colors.text.primary,
              border: `1px solid ${designSystem.colors.border}`,
              borderRadius: designSystem.borderRadius.md,
              cursor: 'pointer',
              boxShadow: designSystem.shadows.sm,
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1
              style={{
                fontSize: designSystem.typography.fontSizes['2xl'],
                fontWeight: designSystem.typography.fontWeights.bold,
                color: designSystem.colors.text.primary,
                margin: 0,
                lineHeight: designSystem.typography.lineHeights.tight,
              }}
            >
              Orçamento{' '}
              <span style={{ color: designSystem.colors.primary[600], fontFamily: 'monospace' }}>
                #{quotation.numeroOrcamento}
              </span>
            </h1>
            <p
              style={{
                color: designSystem.colors.text.secondary,
                fontSize: designSystem.typography.fontSizes.sm,
                margin: `${designSystem.spacing.xs} 0 0 0`,
              }}
            >
              Visualização completa da proposta
            </p>
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
              borderRadius: designSystem.borderRadius.full,
              fontSize: designSystem.typography.fontSizes.xs,
              fontWeight: designSystem.typography.fontWeights.bold,
              background: statusMeta.bg,
              color: statusMeta.fg,
              border: `1px solid ${statusMeta.border}`,
              letterSpacing: '0.04em',
            }}
          >
            {statusMeta.label}
          </span>
        </div>

        <div style={{ display: 'flex', gap: designSystem.spacing.sm, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              background: designSystem.colors.surface,
              color: designSystem.colors.primary[600],
              border: `1px solid ${designSystem.colors.primary[100]}`,
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
              fontSize: designSystem.typography.fontSizes.sm,
              fontWeight: designSystem.typography.fontWeights.semibold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: designSystem.spacing.sm,
              cursor: 'pointer',
              fontFamily: designSystem.typography.fontFamily,
            }}
          >
            <Edit3 size={16} /> Editar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: designSystem.colors.surface,
              color: designSystem.colors.text.primary,
              border: `1px solid ${designSystem.colors.border}`,
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
              fontSize: designSystem.typography.fontSizes.sm,
              fontWeight: designSystem.typography.fontWeights.semibold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: designSystem.spacing.sm,
              cursor: 'pointer',
              fontFamily: designSystem.typography.fontFamily,
            }}
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            style={{
              background: designSystem.colors.primary[500],
              color: designSystem.colors.surface,
              border: 'none',
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
              fontSize: designSystem.typography.fontSizes.sm,
              fontWeight: designSystem.typography.fontWeights.semibold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: designSystem.spacing.sm,
              boxShadow: `0 4px 12px ${designSystem.colors.primary[500]}40`,
              cursor: 'pointer',
              fontFamily: designSystem.typography.fontFamily,
            }}
          >
            <FileDown size={16} /> Exportar PDF
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              background: 'transparent',
              color: designSystem.colors.error,
              border: `1px solid #F0A8AE`,
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
              fontSize: designSystem.typography.fontSizes.sm,
              fontWeight: designSystem.typography.fontWeights.semibold,
              display: 'inline-flex',
              alignItems: 'center',
              gap: designSystem.spacing.sm,
              cursor: 'pointer',
              fontFamily: designSystem.typography.fontFamily,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#FBE9EB';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <Trash2 size={16} /> Deletar
          </button>
        </div>
      </header>

      <section
        style={{
          background: designSystem.colors.surface,
          borderRadius: designSystem.borderRadius.lg,
          boxShadow: designSystem.shadows.md,
          padding: designSystem.spacing.lg,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: designSystem.spacing.lg,
          }}
        >
          <InfoItem
            icon={<User size={16} />}
            label="Cliente"
            value={quotation.cliente?.nome || quotation.clienteNome || '—'}
          />
          <InfoItem
            icon={<Hash size={16} />}
            label="Número"
            value={`#${quotation.numeroOrcamento}`}
          />
          <InfoItem icon={<Tag size={16} />} label="Status" value={statusMeta.label} />
          <InfoItem
            icon={<Calendar size={16} />}
            label="Criado em"
            value={formatDate(quotation.createdAt)}
          />
          <InfoItem
            icon={<Calendar size={16} />}
            label="Validade"
            value={`${quotation.validadeDias || 0} dias`}
          />
          <InfoItem
            icon={<Tag size={16} />}
            label="Margem / Taxa"
            value={`${margemPct}% / ${taxaPct}%`}
          />
        </div>
      </section>

      <section
        style={{
          background: designSystem.colors.surface,
          borderRadius: designSystem.borderRadius.lg,
          boxShadow: designSystem.shadows.md,
          padding: designSystem.spacing.lg,
        }}
      >
        <h2
          style={{
            fontSize: designSystem.typography.fontSizes.lg,
            fontWeight: designSystem.typography.fontWeights.bold,
            color: designSystem.colors.text.primary,
            margin: 0,
            marginBottom: designSystem.spacing.lg,
            borderBottom: `2px solid ${designSystem.colors.primary[500]}`,
            paddingBottom: designSystem.spacing.sm,
          }}
        >
          Itens ({items.length})
        </h2>

        {items.length === 0 ? (
          <div
            style={{
              padding: designSystem.spacing['2xl'],
              textAlign: 'center',
              color: designSystem.colors.text.secondary,
            }}
          >
            <AlertCircle size={32} style={{ display: 'block', margin: '0 auto', opacity: 0.4 }} />
            <p style={{ marginTop: designSystem.spacing.sm }}>Nenhum item neste orçamento.</p>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: designSystem.typography.fontSizes.sm,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: designSystem.colors.background,
                    borderBottom: `2px solid ${designSystem.colors.border}`,
                  }}
                >
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Descrição / SKU</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Qtd</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 120 }}>Preço Unit.</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 130 }}>Total</th>
                  <th style={{ ...thStyle, minWidth: 180 }}>Fita de Borda</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qtd = Number(item.quantidade) || 0;
                  const preco = Number(item.precoVendaUnitario ?? item.precoUnitario) || 0;
                  const totalItem = qtd * preco;
                  const fitaSku = item.metadata?.fitaBorda?.sku?.codigo;
                  const lados = item.metadata?.fitaBorda?.lados || {};
                  const ladosAtivos = Object.entries(lados)
                    .filter(([, v]) => v)
                    .map(([k]) => LADOS_LABELS[k] || k);

                  return (
                    <tr
                      key={item.id}
                      className="ds-item-row"
                      style={{
                        borderBottom: `1px solid ${designSystem.colors.border}`,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          color: designSystem.colors.text.secondary,
                          fontFamily: 'monospace',
                        }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        <div
                          style={{
                            fontWeight: designSystem.typography.fontWeights.semibold,
                            color: designSystem.colors.text.primary,
                          }}
                        >
                          {item.skuDescricao || item.nomeCustomizado || '—'}
                        </div>
                        {item.skuCodigo && (
                          <div
                            style={{
                              fontSize: designSystem.typography.fontSizes.xs,
                              color: designSystem.colors.text.secondary,
                              fontFamily: 'monospace',
                              marginTop: 2,
                            }}
                          >
                            {item.skuCodigo}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: designSystem.spacing.md, textAlign: 'center' }}>
                        {qtd}{' '}
                        <span
                          style={{
                            fontSize: designSystem.typography.fontSizes.xs,
                            color: designSystem.colors.text.secondary,
                          }}
                        >
                          {item.unidadeMedida || 'UN'}
                        </span>
                      </td>
                      <td style={{ padding: designSystem.spacing.md, textAlign: 'right' }}>
                        {formatCurrency(preco)}
                      </td>
                      <td
                        style={{
                          padding: designSystem.spacing.md,
                          textAlign: 'right',
                          fontWeight: designSystem.typography.fontWeights.bold,
                          color: designSystem.colors.text.primary,
                        }}
                      >
                        {formatCurrency(totalItem)}
                      </td>
                      <td style={{ padding: designSystem.spacing.md }}>
                        {fitaSku ? (
                          <div>
                            <div
                              style={{
                                fontFamily: 'monospace',
                                fontSize: designSystem.typography.fontSizes.xs,
                                color: designSystem.colors.text.primary,
                              }}
                            >
                              {fitaSku}
                            </div>
                            {ladosAtivos.length > 0 && (
                              <div
                                style={{
                                  fontSize: designSystem.typography.fontSizes.xs,
                                  color: designSystem.colors.text.secondary,
                                  marginTop: 2,
                                }}
                              >
                                {ladosAtivos.join(' · ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: designSystem.colors.text.disabled }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        style={{
          background: designSystem.colors.surface,
          borderRadius: designSystem.borderRadius.lg,
          boxShadow: designSystem.shadows.md,
          padding: designSystem.spacing.lg,
        }}
      >
        <h2
          style={{
            fontSize: designSystem.typography.fontSizes.lg,
            fontWeight: designSystem.typography.fontWeights.bold,
            color: designSystem.colors.text.primary,
            margin: 0,
            marginBottom: designSystem.spacing.lg,
            borderBottom: `2px solid ${designSystem.colors.primary[500]}`,
            paddingBottom: designSystem.spacing.sm,
          }}
        >
          Resumo Financeiro
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: designSystem.spacing.md,
          }}
        >
          <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
          <SummaryRow
            label={`Margem (${margemPct}%)`}
            value={formatCurrency(valorMargem)}
            color={designSystem.colors.accent}
          />
          <SummaryRow
            label={`Taxa Financeira (${taxaPct}%)`}
            value={formatCurrency(valorTaxa)}
            color={designSystem.colors.info}
          />
          <SummaryRow label="Total Geral" value={formatCurrency(total)} highlight />
        </div>
      </section>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: designSystem.spacing.md,
  fontSize: designSystem.typography.fontSizes.xs,
  fontWeight: designSystem.typography.fontWeights.semibold,
  color: designSystem.colors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const SummaryRow: React.FC<{
  label: string;
  value: string;
  color?: string;
  highlight?: boolean;
}> = ({ label, value, color, highlight }) => (
  <div
    style={{
      background: highlight ? designSystem.colors.primary[50] : designSystem.colors.background,
      border: `1px solid ${highlight ? designSystem.colors.primary[500] : designSystem.colors.border}`,
      borderRadius: designSystem.borderRadius.md,
      padding: designSystem.spacing.md,
      display: 'flex',
      flexDirection: 'column',
      gap: designSystem.spacing.xs,
    }}
  >
    <div
      style={{
        fontSize: designSystem.typography.fontSizes.xs,
        fontWeight: designSystem.typography.fontWeights.semibold,
        color: designSystem.colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: highlight
          ? designSystem.typography.fontSizes['2xl']
          : designSystem.typography.fontSizes.lg,
        fontWeight: designSystem.typography.fontWeights.bold,
        color: color || designSystem.colors.text.primary,
      }}
    >
      {value}
    </div>
  </div>
);

export default QuotationDetail;
