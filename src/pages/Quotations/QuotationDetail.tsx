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
      window.open(`/api/quotations/export-pdf?id=${quotation.id}`, '_blank');
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{ color: '#0D66CC', display: 'inline-flex', marginTop: 2 }}>{icon}</span>
      <div>
        <div
          style={{
            fontSize: '12px',
            color: '#666666',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: '#1A1A1A',
            fontWeight: 600,
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
        gap: '24px',
        padding: '24px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#1A1A1A',
      }}
    >
      <style>{`
        @media print {
          .ds-quotation-detail .ds-no-print { display: none !important; }
          .ds-quotation-detail { padding: 0 !important; gap: 16px !important; }
          .ds-quotation-detail section { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        .ds-quotation-detail .ds-item-row:hover { background: #FAFAFA; }
      `}</style>

      <header
        className="ds-no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              background: '#FFFFFF',
              color: '#1A1A1A',
              border: `1px solid #E0E0E0`,
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1A1A1A',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Orçamento{' '}
              <span style={{ color: '#0D5FB8', fontFamily: 'monospace' }}>
                #{quotation.numeroOrcamento}
              </span>
            </h1>
            <p
              style={{
                color: '#666666',
                fontSize: '14px',
                margin: `4px 0 0 0`,
              }}
            >
              Visualização completa da proposta
            </p>
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: `4px 16px`,
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              background: statusMeta.bg,
              color: statusMeta.fg,
              border: `1px solid ${statusMeta.border}`,
              letterSpacing: '0.04em',
            }}
          >
            {statusMeta.label}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              background: '#FFFFFF',
              color: '#0D5FB8',
              border: `1px solid #E0EFFF`,
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
            <Edit3 size={16} /> Editar
          </button>
          <button
            type="button"
            onClick={handlePrint}
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
            <Printer size={16} /> Imprimir
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
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
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <FileDown size={16} /> Exportar PDF
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              background: 'transparent',
              color: '#DC3545',
              border: `1px solid #F0A8AE`,
              borderRadius: '8px',
              padding: `8px 24px`,
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
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
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1A1A1A',
            margin: 0,
            marginBottom: '24px',
            borderBottom: `2px solid #0D66CC`,
            paddingBottom: '8px',
          }}
        >
          Itens ({items.length})
        </h2>

        {items.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: '#666666',
            }}
          >
            <AlertCircle size={32} style={{ display: 'block', margin: '0 auto', opacity: 0.4 }} />
            <p style={{ marginTop: '8px' }}>Nenhum item neste orçamento.</p>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
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
                        borderBottom: `1px solid #E0E0E0`,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td
                        style={{
                          padding: '16px',
                          color: '#666666',
                          fontFamily: 'monospace',
                        }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </td>
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
                        {qtd}{' '}
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#666666',
                          }}
                        >
                          {item.unidadeMedida || 'UN'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {formatCurrency(preco)}
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
                        {fitaSku ? (
                          <div>
                            <div
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                color: '#1A1A1A',
                              }}
                            >
                              {fitaSku}
                            </div>
                            {ladosAtivos.length > 0 && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#666666',
                                  marginTop: 2,
                                }}
                              >
                                {ladosAtivos.join(' · ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#CCCCCC' }}>—</span>
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
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '24px',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1A1A1A',
            margin: 0,
            marginBottom: '24px',
            borderBottom: `2px solid #0D66CC`,
            paddingBottom: '8px',
          }}
        >
          Resumo Financeiro
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
          <SummaryRow
            label={`Margem (${margemPct}%)`}
            value={formatCurrency(valorMargem)}
            color={'#E2AC00'}
          />
          <SummaryRow
            label={`Taxa Financeira (${taxaPct}%)`}
            value={formatCurrency(valorTaxa)}
            color={'#17A2B8'}
          />
          <SummaryRow label="Total Geral" value={formatCurrency(total)} highlight />
        </div>
      </section>
    </div>
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

const SummaryRow: React.FC<{
  label: string;
  value: string;
  color?: string;
  highlight?: boolean;
}> = ({ label, value, color, highlight }) => (
  <div
    style={{
      background: highlight ? '#F0F7FF' : '#FAFAFA',
      border: `1px solid ${highlight ? '#0D66CC' : '#E0E0E0'}`,
      borderRadius: '8px',
      padding: '16px',
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
        fontSize: highlight ? '24px' : '18px',
        fontWeight: 700,
        color: color || '#1A1A1A',
      }}
    >
      {value}
    </div>
  </div>
);

export default QuotationDetail;
