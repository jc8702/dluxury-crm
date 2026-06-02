import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Hammer,
  Calendar,
  User,
  Box,
  Package,
  Scissors,
  CheckCircle2,
  Play,
  Pause,
  XCircle,
  Download,
  Printer,
  Loader2,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  Layers,
  FileText,
  Clock,
} from 'lucide-react';
import { designSystem } from '@/styles/design-system';
import { Button, Card, CardContent, Badge } from '../../components/common';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

type ProductionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'AGUARDANDO'
  | 'PRODUCAO'
  | 'MONTAGEM'
  | 'PINTURA'
  | 'INSPECAO'
  | 'PRONTO'
  | 'FINALIZADO';

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}
interface PecaItem {
  nome: string;
  largura?: number;
  altura?: number;
  espessura?: number;
  quantidade?: number;
  material?: string;
  operator_checked?: boolean;
}
interface MaterialItem {
  descricao: string;
  quantidade: number;
  unidade?: string;
  sku?: string;
}

interface ProductionOrder {
  id: string;
  op_id: string;
  produto: string;
  pecas: number;
  status: ProductionStatus;
  quotation_id?: string | null;
  quotation_numero?: string | null;
  cliente?: string | null;
  projeto_id?: string;
  visita_id?: string;
  data_inicio?: string;
  data_fim?: string;
  data_prevista_entrega?: string;
  created_at?: string;
  updated_at?: string;
  checklist?: ChecklistItem[];
  metadata?: {
    pecas?: PecaItem[];
    materiais?: MaterialItem[];
    cutting_plan_id?: string;
  };
}

const STATUS_META: Record<
  string,
  { label: string; bg: string; fg: string; border: string; bucket: string }
> = {
  PENDING: {
    label: 'PENDENTE',
    bg: '#FFF4E0',
    fg: '#8A5A00',
    border: '#F0CB7A',
    bucket: 'PENDING',
  },
  AGUARDANDO: {
    label: 'AGUARDANDO',
    bg: '#F0F0F0',
    fg: '#666666',
    border: '#CCCCCC',
    bucket: 'PENDING',
  },
  PAUSED: { label: 'PAUSADO', bg: '#FBE9EB', fg: '#B02A37', border: '#F0A8AE', bucket: 'PAUSED' },
  IN_PROGRESS: {
    label: 'EM PRODUÇÃO',
    bg: '#E0EFFF',
    fg: '#0D5FB8',
    border: '#99C5F0',
    bucket: 'IN_PROGRESS',
  },
  PRODUCAO: {
    label: 'EM PRODUÇÃO',
    bg: '#E0EFFF',
    fg: '#0D5FB8',
    border: '#99C5F0',
    bucket: 'IN_PROGRESS',
  },
  CORTE: { label: 'CORTE', bg: '#E0EFFF', fg: '#0D5FB8', border: '#99C5F0', bucket: 'IN_PROGRESS' },
  MONTAGEM: {
    label: 'MONTAGEM',
    bg: '#EDE7F6',
    fg: '#5E35B1',
    border: '#B39DDB',
    bucket: 'IN_PROGRESS',
  },
  PINTURA: {
    label: 'PINTURA',
    bg: '#FCE4EC',
    fg: '#AD1457',
    border: '#F48FB1',
    bucket: 'IN_PROGRESS',
  },
  INSPECAO: {
    label: 'INSPEÇÃO',
    bg: '#FFF3CD',
    fg: '#856404',
    border: '#FFE082',
    bucket: 'IN_PROGRESS',
  },
  COMPLETED: {
    label: 'CONCLUÍDO',
    bg: '#E6F4EA',
    fg: '#1E7E34',
    border: '#A8D5B6',
    bucket: 'COMPLETED',
  },
  PRONTO: {
    label: 'PRONTO',
    bg: '#E0F7FA',
    fg: '#006064',
    border: '#80DEEA',
    bucket: 'IN_PROGRESS',
  },
  FINALIZADO: {
    label: 'CONCLUÍDO',
    bg: '#E6F4EA',
    fg: '#1E7E34',
    border: '#A8D5B6',
    bucket: 'COMPLETED',
  },
  CANCELLED: {
    label: 'CANCELADO',
    bg: '#FBE9EB',
    fg: '#B02A37',
    border: '#F0A8AE',
    bucket: 'CANCELLED',
  },
};

const STEP_TEMPLATES: Record<string, string[]> = {
  AGUARDANDO: ['Conferir projeto e medidas', 'Verificar estoque de materiais'],
  PRODUCAO: ['Corte de chapas', 'Aplicação de fita de borda', 'Furações (Minifix / VB)'],
  CORTE: ['Corte de chapas', 'Aplicação de fita de borda', 'Furações (Minifix / VB)'],
  MONTAGEM: ['Pré-montagem', 'Pintura / Acabamento', 'Limpeza técnica'],
  PINTURA: ['Lixamento', 'Aplicação de tinta', 'Secagem controlada'],
  INSPECAO: ['Inspeção de qualidade visual', 'Conferência dimensional'],
  PRONTO: ['Embalagem final', 'Conferência de itens'],
  FINALIZADO: ['Ordem finalizada e arquivada'],
  COMPLETED: ['Ordem finalizada e arquivada'],
  PENDING: ['Conferir projeto e medidas', 'Verificar estoque de materiais'],
  IN_PROGRESS: ['Corte de chapas', 'Aplicação de fita de borda', 'Furações (Minifix / VB)'],
  PAUSED: ['Ordem pausada — aguardando liberação'],
  CANCELLED: ['Ordem cancelada'],
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};
const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
};

interface ProductionDetailProps {
  opId?: string;
  onBack?: () => void;
  onUpdated?: (op: ProductionOrder) => void;
}

export const ProductionDetail: React.FC<ProductionDetailProps> = ({ opId, onBack, onUpdated }) => {
  const params = useParams<{ opId: string }>();
  const navigate = useNavigate();
  const targetOpId = opId || params.opId || '';

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cuttingPlan, setCuttingPlan] = useState<any | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const { success: toastSuccess, error: toastError } = useToast();

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const list = await api.production.list();
      const found = (list || []).find((o: any) => (o.op_id || o.id) === targetOpId);
      if (!found) {
        toastError('Ordem não encontrada');
        setOrder(null);
        return;
      }
      const normalized: ProductionOrder = {
        ...found,
        op_id: found.op_id || found.id,
        produto: found.produto || found.nome || '—',
        status: (found.status || 'PENDING').toString().toUpperCase(),
        pecas: Number(found.pecas || 1),
        metadata: found.metadata || {},
      };
      setOrder(normalized);
      setChecklist(normalized.checklist || []);

      const qrPayload = JSON.stringify({
        op_id: normalized.op_id,
        produto: normalized.produto,
        pecas: normalized.pecas,
        status: normalized.status,
        cliente: normalized.cliente || null,
        previsao: normalized.data_prevista_entrega || null,
        url: `${window.location.origin}/producao/${normalized.op_id}`,
      });
      const url = await QRCode.toDataURL(qrPayload, {
        width: 220,
        margin: 1,
        color: { dark: '#0D5FB8', light: '#FFFFFF' },
      });
      setQrDataUrl(url);

      try {
        const plans = await api.production.cutting_plan_list();
        const match = (plans || []).find(
          (p: any) => p.op_id === normalized.op_id || p.projeto_id === normalized.projeto_id,
        );
        setCuttingPlan(match || null);
      } catch {
        setCuttingPlan(null);
      }
    } catch (err: any) {
      toastError('Erro ao carregar ordem', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetOpId) fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetOpId]);

  const steps = useMemo(() => {
    if (!order) return [];
    const templateSteps = STEP_TEMPLATES[order.status] || STEP_TEMPLATES.PENDING;
    return templateSteps.map((task, idx) => {
      const existing = checklist.find((c) => c.task === task);
      return {
        id: existing?.id || `step-${idx}`,
        task,
        completed: !!existing?.completed,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, checklist]);

  const statusMeta = order ? STATUS_META[order.status] || STATUS_META.PENDING : null;
  const isCompleted = order && (order.status === 'COMPLETED' || order.status === 'FINALIZADO');
  const isPaused = order && (order.status === 'PAUSED' || order.status === 'CANCELLED');
  const isRunning =
    order &&
    (order.status === 'IN_PROGRESS' ||
      order.status === 'PRODUCAO' ||
      order.status === 'CORTE' ||
      order.status === 'MONTAGEM' ||
      order.status === 'PINTURA' ||
      order.status === 'INSPECAO' ||
      order.status === 'PRONTO');

  const handleStart = async () => {
    if (!order) return;
    setActionLoading('start');
    try {
      const next = order.status === 'PAUSED' ? 'IN_PROGRESS' : 'IN_PROGRESS';
      const updated = await api.production.updateStatus(order.op_id, next);
      toastSuccess(`Ordem ${order.op_id} iniciada`);
      setOrder((prev) => (prev ? { ...prev, ...updated, status: next } : prev));
      onUpdated?.({ ...order, ...updated, status: next });
    } catch (e: any) {
      toastError('Erro ao iniciar', e?.message || String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async () => {
    if (!order) return;
    setActionLoading('pause');
    try {
      const updated = await api.production.updateStatus(order.op_id, 'PAUSED');
      toastSuccess(`Ordem ${order.op_id} pausada`);
      setOrder((prev) => (prev ? { ...prev, ...updated, status: 'PAUSED' } : prev));
      onUpdated?.({ ...order, ...updated, status: 'PAUSED' });
    } catch (e: any) {
      toastError('Erro ao pausar', e?.message || String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!order) return;
    if (!confirm('Marcar esta ordem como concluída?')) return;
    setActionLoading('complete');
    try {
      const updated = await api.production.updateStatus(order.op_id, 'COMPLETED');
      toastSuccess(`Ordem ${order.op_id} concluída`);
      setOrder((prev) => (prev ? { ...prev, ...updated, status: 'COMPLETED' } : prev));
      onUpdated?.({ ...order, ...updated, status: 'COMPLETED' });
    } catch (e: any) {
      toastError('Erro ao concluir', e?.message || String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!confirm('Cancelar esta ordem? Esta ação não pode ser desfeita.')) return;
    setActionLoading('cancel');
    try {
      const updated = await api.production.updateStatus(order.op_id, 'CANCELLED');
      toastSuccess(`Ordem ${order.op_id} cancelada`);
      setOrder((prev) => (prev ? { ...prev, ...updated, status: 'CANCELLED' } : prev));
      onUpdated?.({ ...order, ...updated, status: 'CANCELLED' });
    } catch (e: any) {
      toastError('Erro ao cancelar', e?.message || String(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStep = async (stepId: string, task: string) => {
    if (!order) return;
    const next: ChecklistItem[] = (() => {
      const idx = checklist.findIndex((c) => c.id === stepId);
      if (idx === -1) {
        return [...checklist, { id: stepId, task, completed: true }];
      }
      return checklist.map((c) => (c.id === stepId ? { ...c, completed: !c.completed } : c));
    })();
    setChecklist(next);
    try {
      const saved = await api.production.updateDetails({ op_id: order.op_id, checklist: next });
      setOrder((prev) => (prev ? { ...prev, ...saved, checklist: next } : prev));
    } catch (e: any) {
      toastError('Erro ao salvar checklist', e?.message || String(e));
    }
  };

  const handlePrint = () => window.print();

  const late =
    order?.data_prevista_entrega &&
    !isCompleted &&
    new Date(order.data_prevista_entrega).getTime() < Date.now();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: designSystem.spacing['2xl'],
          gap: designSystem.spacing.md,
          color: designSystem.colors.text.secondary,
          minHeight: 320,
        }}
      >
        <Loader2 size={32} className="animate-spin" color={designSystem.colors.primary[500]} />
        <span>Sincronizando com o chão de fábrica…</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: designSystem.spacing.xl, textAlign: 'center' }}>
        <AlertTriangle size={32} color={designSystem.colors.warning} style={{ marginBottom: 8 }} />
        <p style={{ color: designSystem.colors.text.secondary }}>
          Ordem de produção não encontrada.
        </p>
        <Button
          onClick={() => (onBack ? onBack() : navigate(-1))}
          style={{
            marginTop: designSystem.spacing.md,
            background: designSystem.colors.primary[500],
            color: designSystem.colors.surface,
            border: 'none',
            borderRadius: designSystem.borderRadius.md,
            padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
            fontSize: designSystem.typography.fontSizes.sm,
            fontWeight: designSystem.typography.fontWeights.semibold,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div
      className="ds-production-detail"
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
        .ds-production-detail input:focus, .ds-production-detail select:focus {
          border-color: ${designSystem.colors.primary[500]} !important;
          box-shadow: 0 0 0 3px ${designSystem.colors.primary[100]};
        }
        @media print {
          .ds-production-detail .no-print { display: none !important; }
          .ds-production-detail { padding: 0; }
        }
      `}</style>

      <header
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: designSystem.spacing.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: designSystem.spacing.md }}>
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            aria-label="Voltar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: designSystem.borderRadius.md,
              border: `1px solid ${designSystem.colors.border}`,
              background: designSystem.colors.surface,
              color: designSystem.colors.text.secondary,
              cursor: 'pointer',
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
                display: 'flex',
                alignItems: 'center',
                gap: designSystem.spacing.sm,
              }}
            >
              <Hammer size={22} color={designSystem.colors.primary[600]} /> Ordem #{order.op_id}
            </h1>
            <p
              style={{
                color: designSystem.colors.text.secondary,
                fontSize: designSystem.typography.fontSizes.sm,
                margin: `${designSystem.spacing.xs} 0 0 0`,
              }}
            >
              {order.produto} • {order.pecas} {order.pecas === 1 ? 'peça' : 'peças'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: designSystem.spacing.sm, flexWrap: 'wrap' }}>
          <Button onClick={fetchOrder} style={secondaryBtnStyle} aria-label="Atualizar">
            <RefreshCw size={14} /> Atualizar
          </Button>
          <Button onClick={handlePrint} style={secondaryBtnStyle} aria-label="Imprimir">
            <Printer size={14} /> Imprimir
          </Button>
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gap: designSystem.spacing.md,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        <SummaryCard icon={<Box size={16} />} label="Status" accent={statusMeta?.fg}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: designSystem.spacing.sm,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                borderRadius: designSystem.borderRadius.full,
                fontSize: designSystem.typography.fontSizes.xs,
                fontWeight: designSystem.typography.fontWeights.bold,
                background: statusMeta?.bg,
                color: statusMeta?.fg,
                border: `1px solid ${statusMeta?.border}`,
              }}
            >
              {statusMeta?.label}
            </span>
            {late && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: designSystem.colors.error,
                  fontSize: designSystem.typography.fontSizes.xs,
                  fontWeight: designSystem.typography.fontWeights.semibold,
                }}
              >
                <AlertTriangle size={12} /> Em atraso
              </span>
            )}
          </div>
        </SummaryCard>
        <SummaryCard icon={<User size={16} />} label="Cliente">
          <div
            style={{
              fontSize: designSystem.typography.fontSizes.sm,
              color: designSystem.colors.text.primary,
              fontWeight: designSystem.typography.fontWeights.semibold,
            }}
          >
            {order.cliente || '—'}
          </div>
          {order.quotation_numero && (
            <div
              style={{ fontSize: '11px', color: designSystem.colors.text.secondary, marginTop: 2 }}
            >
              Orçamento #{order.quotation_numero}
            </div>
          )}
        </SummaryCard>
        <SummaryCard icon={<Calendar size={16} />} label="Previsão de Entrega">
          <div
            style={{
              fontSize: designSystem.typography.fontSizes.sm,
              color: late ? designSystem.colors.error : designSystem.colors.text.primary,
              fontWeight: designSystem.typography.fontWeights.semibold,
            }}
          >
            {formatDate(order.data_prevista_entrega)}
          </div>
          <div
            style={{ fontSize: '11px', color: designSystem.colors.text.secondary, marginTop: 2 }}
          >
            Início: {formatDate(order.data_inicio || order.created_at)}
          </div>
        </SummaryCard>
        <SummaryCard icon={<ClipboardList size={16} />} label="Etapas Concluídas">
          <div
            style={{
              fontSize: designSystem.typography.fontSizes.sm,
              color: designSystem.colors.text.primary,
              fontWeight: designSystem.typography.fontWeights.semibold,
            }}
          >
            {steps.filter((s) => s.completed).length} / {steps.length}
          </div>
          <ProgressBar
            value={
              steps.length === 0
                ? 0
                : (steps.filter((s) => s.completed).length / steps.length) * 100
            }
          />
        </SummaryCard>
      </section>

      <section
        className="no-print"
        style={{
          background: designSystem.colors.surface,
          borderRadius: designSystem.borderRadius.lg,
          boxShadow: designSystem.shadows.md,
          padding: designSystem.spacing.lg,
          display: 'flex',
          flexWrap: 'wrap',
          gap: designSystem.spacing.sm,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            color: designSystem.colors.text.secondary,
            fontSize: designSystem.typography.fontSizes.sm,
          }}
        >
          <strong style={{ color: designSystem.colors.text.primary }}>Ações da OP</strong> —
          atualize o status conforme o avanço da produção.
        </div>
        <div style={{ display: 'flex', gap: designSystem.spacing.sm, flexWrap: 'wrap' }}>
          <Button
            onClick={handleStart}
            disabled={
              !!actionLoading ||
              isRunning ||
              isCompleted ||
              (isPaused === false && order.status === 'CANCELLED')
            }
            style={{
              ...actionBtnStyle,
              background: designSystem.colors.success,
              color: designSystem.colors.surface,
              opacity: actionLoading === 'start' || isRunning || isCompleted ? 0.5 : 1,
            }}
          >
            {actionLoading === 'start' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            Iniciar
          </Button>
          <Button
            onClick={handlePause}
            disabled={!!actionLoading || isCompleted || !isRunning || isPaused}
            style={{
              ...actionBtnStyle,
              background: designSystem.colors.warning,
              color: '#1A1A1A',
              opacity: actionLoading === 'pause' || isCompleted || !isRunning || isPaused ? 0.5 : 1,
            }}
          >
            {actionLoading === 'pause' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Pause size={14} />
            )}
            Pausar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!!actionLoading || isCompleted}
            style={{
              ...actionBtnStyle,
              background: designSystem.colors.primary[500],
              color: designSystem.colors.surface,
              opacity: actionLoading === 'complete' || isCompleted ? 0.5 : 1,
            }}
          >
            {actionLoading === 'complete' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Completar
          </Button>
          <Button
            onClick={handleCancel}
            disabled={!!actionLoading || isCompleted || isPaused}
            style={{
              ...actionBtnStyle,
              background: 'transparent',
              color: designSystem.colors.error,
              border: `1px solid ${designSystem.colors.error}`,
              opacity: actionLoading === 'cancel' || isCompleted || isPaused ? 0.5 : 1,
            }}
          >
            {actionLoading === 'cancel' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <XCircle size={14} />
            )}
            Cancelar
          </Button>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: designSystem.spacing.lg,
        }}
      >
        <Card>
          <CardContent style={{ padding: designSystem.spacing.lg }}>
            <SectionTitle icon={<Scissors size={16} />} title="Passo a passo (Cutting Plan)" />
            {steps.length === 0 ? (
              <p
                style={{
                  color: designSystem.colors.text.secondary,
                  fontSize: designSystem.typography.fontSizes.sm,
                }}
              >
                Nenhuma etapa definida para esta ordem.
              </p>
            ) : (
              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: designSystem.spacing.sm,
                }}
              >
                {steps.map((s, idx) => (
                  <li
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: designSystem.spacing.sm,
                      padding: designSystem.spacing.sm,
                      background: s.completed ? '#E6F4EA' : designSystem.colors.background,
                      border: `1px solid ${s.completed ? '#A8D5B6' : designSystem.colors.border}`,
                      borderRadius: designSystem.borderRadius.md,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleStep(s.id, s.task)}
                      aria-pressed={s.completed}
                      aria-label={`Marcar etapa ${s.task}`}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: designSystem.borderRadius.full,
                        border: `2px solid ${s.completed ? designSystem.colors.success : designSystem.colors.border}`,
                        background: s.completed ? designSystem.colors.success : 'transparent',
                        color: designSystem.colors.surface,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {s.completed && <CheckCircle2 size={14} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: designSystem.typography.fontSizes.xs,
                          color: designSystem.colors.text.secondary,
                          fontWeight: designSystem.typography.fontWeights.semibold,
                        }}
                      >
                        Etapa {idx + 1}
                      </div>
                      <div
                        style={{
                          fontSize: designSystem.typography.fontSizes.sm,
                          color: s.completed
                            ? designSystem.colors.success
                            : designSystem.colors.text.primary,
                          fontWeight: designSystem.typography.fontWeights.semibold,
                          textDecoration: s.completed ? 'line-through' : 'none',
                        }}
                      >
                        {s.task}
                      </div>
                    </div>
                    {s.completed && <Badge variant="success">OK</Badge>}
                  </li>
                ))}
              </ol>
            )}

            {cuttingPlan && (
              <div
                style={{
                  marginTop: designSystem.spacing.md,
                  padding: designSystem.spacing.sm,
                  background: designSystem.colors.background,
                  border: `1px dashed ${designSystem.colors.border}`,
                  borderRadius: designSystem.borderRadius.md,
                  fontSize: designSystem.typography.fontSizes.xs,
                  color: designSystem.colors.text.secondary,
                }}
              >
                <strong>Plano de corte vinculado:</strong> {cuttingPlan.nome || cuttingPlan.id}
                {cuttingPlan.aproveitamento && ` • Aproveitamento ${cuttingPlan.aproveitamento}%`}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: designSystem.spacing.lg }}>
            <SectionTitle icon={<Layers size={16} />} title="Itens a Produzir" />
            {(order.metadata?.pecas?.length ?? 0) === 0 ? (
              <p
                style={{
                  color: designSystem.colors.text.secondary,
                  fontSize: designSystem.typography.fontSizes.sm,
                }}
              >
                Nenhuma peça cadastrada para esta ordem.
              </p>
            ) : (
              <div
                style={{
                  overflowX: 'auto',
                  borderRadius: designSystem.borderRadius.md,
                  border: `1px solid ${designSystem.colors.border}`,
                }}
              >
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
                      <th style={thStyle}>Peça</th>
                      <th style={thStyle}>Dimensões</th>
                      <th style={thStyle}>Qtd</th>
                      <th style={thStyle}>Material</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.metadata!.pecas!.map((p, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: `1px solid ${designSystem.colors.border}` }}
                      >
                        <td
                          style={{
                            padding: designSystem.spacing.sm,
                            fontWeight: designSystem.typography.fontWeights.semibold,
                            color: designSystem.colors.text.primary,
                          }}
                        >
                          {p.nome}
                        </td>
                        <td
                          style={{
                            padding: designSystem.spacing.sm,
                            color: designSystem.colors.text.secondary,
                            fontFamily: 'monospace',
                          }}
                        >
                          {p.largura && p.altura ? `${p.largura} × ${p.altura} mm` : '—'}
                        </td>
                        <td
                          style={{
                            padding: designSystem.spacing.sm,
                            fontWeight: designSystem.typography.fontWeights.bold,
                            color: designSystem.colors.text.primary,
                          }}
                        >
                          {p.quantidade ?? 1}
                        </td>
                        <td
                          style={{
                            padding: designSystem.spacing.sm,
                            color: designSystem.colors.text.secondary,
                          }}
                        >
                          {p.material || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(order.metadata?.materiais?.length ?? 0) > 0 && (
              <div style={{ marginTop: designSystem.spacing.lg }}>
                <h4
                  style={{
                    fontSize: designSystem.typography.fontSizes.sm,
                    fontWeight: designSystem.typography.fontWeights.bold,
                    color: designSystem.colors.text.primary,
                    marginBottom: designSystem.spacing.sm,
                  }}
                >
                  <Package
                    size={14}
                    style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}
                  />{' '}
                  Materiais previstos
                </h4>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: designSystem.spacing.xs }}
                >
                  {order.metadata!.materiais!.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: designSystem.spacing.sm,
                        background: designSystem.colors.background,
                        border: `1px solid ${designSystem.colors.border}`,
                        borderRadius: designSystem.borderRadius.md,
                        fontSize: designSystem.typography.fontSizes.sm,
                      }}
                    >
                      <span
                        style={{
                          color: designSystem.colors.text.primary,
                          fontWeight: designSystem.typography.fontWeights.semibold,
                        }}
                      >
                        {m.descricao}
                      </span>
                      <span
                        style={{
                          color: designSystem.colors.text.secondary,
                          fontWeight: designSystem.typography.fontWeights.semibold,
                        }}
                      >
                        {m.quantidade} {m.unidade || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent
            style={{
              padding: designSystem.spacing.lg,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: designSystem.spacing.md,
            }}
          >
            <SectionTitle icon={<FileText size={16} />} title="QR de Rastreamento" align="center" />
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code da ordem ${order.op_id}`}
                style={{
                  width: 200,
                  height: 200,
                  border: `1px solid ${designSystem.colors.border}`,
                  borderRadius: designSystem.borderRadius.md,
                  padding: 8,
                  background: designSystem.colors.surface,
                }}
              />
            ) : (
              <div
                style={{
                  width: 200,
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: designSystem.colors.text.secondary,
                }}
              >
                <Loader2 className="animate-spin" />
              </div>
            )}
            <p
              style={{
                fontSize: '11px',
                color: designSystem.colors.text.secondary,
                textAlign: 'center',
                maxWidth: 240,
              }}
            >
              Aponte a câmera para abrir esta OP, consultar status e atualizar progresso.
            </p>
            <a
              href={qrDataUrl}
              download={`op-${order.op_id}.png`}
              className="no-print"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: designSystem.typography.fontSizes.xs,
                color: designSystem.colors.primary[600],
                fontWeight: designSystem.typography.fontWeights.semibold,
                textDecoration: 'none',
              }}
            >
              <Download size={12} /> Baixar QR
            </a>

            <div
              style={{
                width: '100%',
                borderTop: `1px solid ${designSystem.colors.border}`,
                marginTop: designSystem.spacing.md,
                paddingTop: designSystem.spacing.md,
              }}
            >
              <h4
                style={{
                  fontSize: designSystem.typography.fontSizes.sm,
                  fontWeight: designSystem.typography.fontWeights.bold,
                  color: designSystem.colors.text.primary,
                  marginBottom: designSystem.spacing.sm,
                }}
              >
                <Clock
                  size={14}
                  style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}
                />{' '}
                Linha do tempo
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: designSystem.typography.fontSizes.xs,
                  color: designSystem.colors.text.secondary,
                }}
              >
                <div>
                  <strong style={{ color: designSystem.colors.text.primary }}>Criada:</strong>{' '}
                  {formatDateTime(order.created_at)}
                </div>
                <div>
                  <strong style={{ color: designSystem.colors.text.primary }}>Iniciada:</strong>{' '}
                  {formatDateTime(order.data_inicio)}
                </div>
                <div>
                  <strong style={{ color: designSystem.colors.text.primary }}>Finalizada:</strong>{' '}
                  {formatDateTime(order.data_fim)}
                </div>
                <div>
                  <strong style={{ color: designSystem.colors.text.primary }}>Atualizada:</strong>{' '}
                  {formatDateTime(order.updated_at)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

const secondaryBtnStyle: React.CSSProperties = {
  background: designSystem.colors.surface,
  color: designSystem.colors.text.primary,
  border: `1px solid ${designSystem.colors.border}`,
  borderRadius: designSystem.borderRadius.md,
  padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
  fontSize: designSystem.typography.fontSizes.xs,
  fontWeight: designSystem.typography.fontWeights.semibold,
  display: 'inline-flex',
  alignItems: 'center',
  gap: designSystem.spacing.xs,
  cursor: 'pointer',
};

const actionBtnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: designSystem.borderRadius.md,
  padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
  fontSize: designSystem.typography.fontSizes.sm,
  fontWeight: designSystem.typography.fontWeights.semibold,
  display: 'inline-flex',
  alignItems: 'center',
  gap: designSystem.spacing.xs,
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  padding: designSystem.spacing.sm,
  fontSize: '11px',
  fontWeight: designSystem.typography.fontWeights.semibold,
  color: designSystem.colors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'left',
};

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  accent?: string;
}> = ({ icon, label, children, accent }) => (
  <div
    style={{
      background: designSystem.colors.surface,
      border: `1px solid ${designSystem.colors.border}`,
      borderRadius: designSystem.borderRadius.lg,
      boxShadow: designSystem.shadows.sm,
      padding: designSystem.spacing.md,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: accent || designSystem.colors.text.secondary,
        fontSize: '11px',
        fontWeight: designSystem.typography.fontWeights.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: designSystem.spacing.xs,
      }}
    >
      {icon} {label}
    </div>
    {children}
  </div>
);

const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  align?: 'left' | 'center';
}> = ({ icon, title, align = 'left' }) => (
  <h3
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: designSystem.colors.text.primary,
      fontSize: designSystem.typography.fontSizes.md,
      fontWeight: designSystem.typography.fontWeights.bold,
      margin: `0 0 ${designSystem.spacing.md} 0`,
      textAlign: align,
      justifyContent: align === 'center' ? 'center' : 'flex-start',
    }}
  >
    {icon} {title}
  </h3>
);

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      style={{
        marginTop: designSystem.spacing.xs,
        width: '100%',
        height: 6,
        background: designSystem.colors.border,
        borderRadius: designSystem.borderRadius.full,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: pct === 100 ? designSystem.colors.success : designSystem.colors.primary[500],
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
};

export default ProductionDetail;
