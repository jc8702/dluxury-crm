import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText, Wrench, UserPlus } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

import DataTable from '../common/DataTable';
import {
  Button,
  Input,
  Modal,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../common';

import { designSystem } from '@/styles/design-system';

import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { useFinanceStore as useFinance } from '../../stores/useFinanceStore';
import type { Project, ProjectStatus } from '../../context/CRMContext';
import { formatCurrency } from '../../utils/calculations';

const Dashboard: React.FC = () => {
  const { projects, clients } = useCRM();
  const { billings, totalPeriodo, currentMeta, selectedPeriod, setSelectedPeriod, setMonthlyGoal } =
    useFinance();
  const [editGoal, setEditGoal] = React.useState(false);
  const [goalValue, setGoalValue] = React.useState('');

  const periods = [
    { id: '2026-01', label: 'Jan/26' },
    { id: '2026-02', label: 'Fev/26' },
    { id: '2026-03', label: 'Mar/26' },
    { id: '2026-04', label: 'Abr/26' },
    { id: '2026-05', label: 'Mai/26' },
    { id: '2026-06', label: 'Jun/26' },
    { id: '2026-07', label: 'Jul/26' },
    { id: '2026-08', label: 'Ago/26' },
    { id: '2026-09', label: 'Set/26' },
    { id: '2026-10', label: 'Out/26' },
    { id: '2026-11', label: 'Nov/26' },
    { id: '2026-12', label: 'Dez/26' },
  ];

  const statusLabels: Record<ProjectStatus, string> = {
    lead: 'Lead',
    visita_tecnica: 'Visita Técnica',
    orcamento_enviado: 'Orçamento Enviado',
    aprovado: 'Aprovado',
    em_producao: 'Em Produção',
    pronto_entrega: 'Pronto p/ Entrega',
    instalado: 'Instalado',
    concluido: 'Concluído',
  };

  const inProduction = projects.filter((p) => p.status === 'em_producao').length;
  const concluidos = projects.filter((p) => p.status === 'concluido').length;
  const ticketMedio =
    concluidos > 0
      ? projects
          .filter((p) => p.status === 'concluido')
          .reduce((acc, p) => acc + (p.valorFinal || p.valorEstimado || 0), 0) / concluidos
      : 0;

  const origemCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach((c) => {
      const key = c.origem || 'outro';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  const origemLabels: Record<string, { label: string; color: string }> = {
    indicacao: { label: 'Indicação', color: designSystem.colors.secondary[500] },
    instagram: { label: 'Instagram', color: '#e1306c' },
    google: { label: 'Google', color: designSystem.colors.primary[500] },
    feira: { label: 'Feira', color: designSystem.colors.accent },
    passante: { label: 'Passante', color: '#8b5cf6' },
    outro: { label: 'Outro', color: designSystem.colors.text.secondary },
  };

  const percentualMeta =
    currentMeta > 0 ? Math.min(Math.round((totalPeriodo / currentMeta) * 100), 100) : 0;

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime(),
    )
    .slice(0, 6);

  const styles = {
    page: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: designSystem.spacing.xl,
      padding: designSystem.spacing.lg,
      color: designSystem.colors.text.primary,
      fontFamily: designSystem.typography.fontFamily,
    },
    headerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap' as const,
      gap: designSystem.spacing.md,
    },
    h1: {
      fontSize: designSystem.typography.fontSizes['3xl'],
      fontWeight: designSystem.typography.fontWeights.bold,
      lineHeight: designSystem.typography.lineHeights.tight,
      color: designSystem.colors.text.primary,
      margin: 0,
    },
    h2: {
      fontSize: designSystem.typography.fontSizes.xl,
      fontWeight: designSystem.typography.fontWeights.semibold,
      lineHeight: designSystem.typography.lineHeights.tight,
      color: designSystem.colors.text.primary,
      margin: 0,
    },
    subtitle: {
      fontSize: designSystem.typography.fontSizes.sm,
      color: designSystem.colors.text.secondary,
      margin: `${designSystem.spacing.xs} 0 0 0`,
    },
    sectionTitle: {
      fontSize: designSystem.typography.fontSizes.lg,
      fontWeight: designSystem.typography.fontWeights.semibold,
      color: designSystem.colors.text.primary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: designSystem.spacing.md,
    },
    kpiLabel: {
      fontSize: designSystem.typography.fontSizes.xs,
      fontWeight: designSystem.typography.fontWeights.semibold,
      color: designSystem.colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: designSystem.spacing.xs,
    },
    kpiValue: {
      fontSize: designSystem.typography.fontSizes['2xl'],
      fontWeight: designSystem.typography.fontWeights.bold,
      lineHeight: designSystem.typography.lineHeights.tight,
      color: designSystem.colors.text.primary,
      margin: 0,
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: designSystem.spacing.lg,
    },
    kpiCard: (accentColor: string) => ({
      background: designSystem.colors.surface,
      padding: designSystem.spacing.lg,
      borderRadius: designSystem.borderRadius.lg,
      boxShadow: designSystem.shadows.md,
      borderLeft: `4px solid ${accentColor}`,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }),
    splitGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: designSystem.spacing.lg,
    },
    card: {
      background: designSystem.colors.surface,
      padding: designSystem.spacing.lg,
      borderRadius: designSystem.borderRadius.lg,
      boxShadow: designSystem.shadows.md,
    },
    quickActionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: designSystem.spacing.md,
    },
    quickAction: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: designSystem.spacing.sm,
      height: 96,
      padding: designSystem.spacing.md,
      background: designSystem.colors.surface,
      border: `1px solid ${designSystem.colors.border}`,
      borderRadius: designSystem.borderRadius.lg,
      boxShadow: designSystem.shadows.sm,
      color: designSystem.colors.text.primary,
      fontFamily: designSystem.typography.fontFamily,
      fontSize: designSystem.typography.fontSizes.sm,
      fontWeight: designSystem.typography.fontWeights.semibold,
      textDecoration: 'none',
      transition: 'box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
    },
    copilotCard: {
      background: designSystem.colors.surface,
      padding: designSystem.spacing.lg,
      borderRadius: designSystem.borderRadius.lg,
      boxShadow: designSystem.shadows.md,
      border: `1px solid ${designSystem.colors.primary[100]}`,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: designSystem.spacing.md,
    },
    copilotChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: designSystem.spacing.xs,
      padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
      background: designSystem.colors.primary[50],
      color: designSystem.colors.primary[600],
      border: `1px solid ${designSystem.colors.primary[100]}`,
      borderRadius: designSystem.borderRadius.full,
      fontSize: designSystem.typography.fontSizes.xs,
      fontWeight: designSystem.typography.fontWeights.semibold,
      cursor: 'pointer',
      fontFamily: designSystem.typography.fontFamily,
    },
  } as const;

  return (
    <div className="ds-dashboard" style={styles.page}>
      <style>{`
        .ds-dashboard * { box-sizing: border-box; }
        .ds-dashboard .ds-kpi-card:hover { box-shadow: 0 10px 15px rgba(0,0,0,0.1); transform: translateY(-1px); }
        .ds-dashboard .ds-quick-action:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-color: ${designSystem.colors.primary[500]}; }
        @media (max-width: 768px) {
          .ds-dashboard .ds-header-row { flex-direction: column; align-items: stretch; }
          .ds-dashboard .ds-chart-box { height: 220px !important; }
        }
        @media (max-width: 480px) {
          .ds-dashboard { padding: ${designSystem.spacing.md} !important; }
          .ds-dashboard .ds-kpi-value { font-size: ${designSystem.typography.fontSizes.xl} !important; }
        }
      `}</style>

      <header className="ds-header-row" style={styles.headerRow}>
        <div>
          <h1 style={styles.h1}>Painel Geral</h1>
          <p style={styles.subtitle}>Visão executiva — D'Luxury CRM (Fatto OS)</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger
            style={{
              width: 160,
              border: `1px solid ${designSystem.colors.border}`,
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
              background: designSystem.colors.surface,
              fontFamily: designSystem.typography.fontFamily,
            }}
          >
            <SelectValue placeholder="Período..." />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {/* KPIs principais */}
      <section aria-label="Indicadores principais">
        <div style={styles.kpiGrid}>
          <div className="ds-kpi-card" style={styles.kpiCard(designSystem.colors.primary[500])}>
            <p style={styles.kpiLabel}>Total Clientes</p>
            <h3 style={{ ...styles.kpiValue, color: designSystem.colors.primary[600] }}>
              {clients.length}
            </h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard(designSystem.colors.info)}>
            <p style={styles.kpiLabel}>Projetos Ativos</p>
            <h3 style={{ ...styles.kpiValue, color: designSystem.colors.info }}>
              {projects.filter((p) => p.status !== 'concluido').length}
            </h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard(designSystem.colors.accent)}>
            <p style={styles.kpiLabel}>Em Produção</p>
            <h3 style={{ ...styles.kpiValue, color: designSystem.colors.accent }}>
              {inProduction}
            </h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard(designSystem.colors.success)}>
            <p style={styles.kpiLabel}>Concluídos</p>
            <h3 style={{ ...styles.kpiValue, color: designSystem.colors.success }}>{concluidos}</h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard(designSystem.colors.text.primary)}>
            <p style={styles.kpiLabel}>Ticket Médio</p>
            <h3 style={{ ...styles.kpiValue, fontSize: designSystem.typography.fontSizes.xl }}>
              {formatCurrency(ticketMedio)}
            </h3>
          </div>
        </div>
      </section>

      {/* Meta + Pipeline por etapa */}
      <section style={styles.splitGrid}>
        <div
          style={{
            ...styles.card,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: designSystem.spacing.md,
          }}
        >
          <h3 style={styles.sectionTitle}>Meta do Período</h3>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: designSystem.borderRadius.full,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `conic-gradient(${designSystem.colors.accent} ${percentualMeta * 3.6}deg, ${designSystem.colors.border} 0deg)`,
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: designSystem.borderRadius.full,
                background: designSystem.colors.surface,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 0 1px ' + designSystem.colors.border,
              }}
            >
              <span
                style={{
                  fontSize: designSystem.typography.fontSizes['2xl'],
                  fontWeight: designSystem.typography.fontWeights.bold,
                }}
              >
                {percentualMeta}%
              </span>
              <span
                style={{
                  fontSize: designSystem.typography.fontSizes.xs,
                  color: designSystem.colors.text.secondary,
                  textTransform: 'uppercase',
                }}
              >
                atingido
              </span>
            </div>
          </div>
          <p
            style={{
              fontSize: designSystem.typography.fontSizes.md,
              color: designSystem.colors.text.primary,
              margin: 0,
            }}
          >
            <strong>{formatCurrency(totalPeriodo)}</strong>{' '}
            <span style={{ color: designSystem.colors.text.secondary }}>
              / {formatCurrency(currentMeta)}
            </span>
          </p>
          <Button
            onClick={() => {
              setEditGoal(true);
              setGoalValue(currentMeta.toString());
            }}
            style={{
              background: 'transparent',
              color: designSystem.colors.primary[600],
              border: `1px solid ${designSystem.colors.primary[500]}`,
              borderRadius: designSystem.borderRadius.md,
              padding: `${designSystem.spacing.xs} ${designSystem.spacing.lg}`,
              fontWeight: designSystem.typography.fontWeights.semibold,
            }}
          >
            Editar Meta
          </Button>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Evolução Financeira (6 meses)</h3>
          <div className="ds-chart-box" style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={periods
                  .slice(0, 6)
                  .reverse()
                  .map((p) => {
                    const monthBillings = billings.filter((b) => b.data && b.data.startsWith(p.id));
                    const entradas = monthBillings
                      .filter((b) => b.tipo !== 'saida')
                      .reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
                    const saidas = monthBillings
                      .filter((b) => b.tipo === 'saida')
                      .reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
                    return { name: p.label, Entradas: entradas, Saidas: saidas };
                  })}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={designSystem.colors.border}
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: designSystem.colors.text.secondary }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(val) => `R$${val / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: designSystem.colors.text.secondary }}
                />
                <Tooltip
                  cursor={{ fill: designSystem.colors.background, opacity: 0.5 }}
                  contentStyle={{
                    backgroundColor: designSystem.colors.surface,
                    borderColor: designSystem.colors.border,
                    borderRadius: designSystem.borderRadius.md,
                    boxShadow: designSystem.shadows.md,
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                <Bar
                  dataKey="Entradas"
                  fill={designSystem.colors.success}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="Saidas"
                  fill={designSystem.colors.primary[500]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Ações Rápidas */}
      <section aria-label="Ações rápidas">
        <h3 style={styles.sectionTitle}>Ações Rápidas</h3>
        <div style={styles.quickActionsGrid}>
          <Link to="/clientes" className="ds-quick-action" style={styles.quickAction}>
            <UserPlus size={24} color={designSystem.colors.success} />
            <span>Novo Cliente</span>
          </Link>
          <Link to="/orcamentos" className="ds-quick-action" style={styles.quickAction}>
            <FileText size={24} color={designSystem.colors.primary[500]} />
            <span>Novo Orçamento</span>
          </Link>
          <Link to="/plano-corte" className="ds-quick-action" style={styles.quickAction}>
            <Wrench size={24} color={designSystem.colors.info} />
            <span>Plano de Corte</span>
          </Link>
          <Link to="/financeiro/contas" className="ds-quick-action" style={styles.quickAction}>
            <PlusCircle size={24} color={designSystem.colors.accent} />
            <span>Nova Despesa</span>
          </Link>
        </div>
      </section>

      {/* Origem de leads + Projetos recentes */}
      <section style={styles.splitGrid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Origem dos Leads</h3>
          {origemCounts.length === 0 ? (
            <div
              style={{
                color: designSystem.colors.text.secondary,
                textAlign: 'center',
                padding: designSystem.spacing.xl,
              }}
            >
              Nenhum cliente cadastrado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: designSystem.spacing.md }}>
              {origemCounts.map((o) => {
                const info = origemLabels[o.key] || origemLabels.outro;
                const pct = clients.length > 0 ? Math.round((o.count / clients.length) * 100) : 0;
                return (
                  <div
                    key={o.key}
                    style={{ display: 'flex', alignItems: 'center', gap: designSystem.spacing.md }}
                  >
                    <span
                      style={{
                        fontSize: designSystem.typography.fontSizes.xs,
                        color: designSystem.colors.text.secondary,
                        width: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {info.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        background: designSystem.colors.background,
                        borderRadius: designSystem.borderRadius.full,
                        height: 16,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          minWidth: pct > 0 ? 16 : 0,
                          height: '100%',
                          backgroundColor: info.color,
                          borderRadius: designSystem.borderRadius.full,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: designSystem.typography.fontSizes.xs,
                        fontWeight: designSystem.typography.fontWeights.semibold,
                        color: designSystem.colors.text.secondary,
                        width: 40,
                        textAlign: 'right',
                      }}
                    >
                      {o.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Projetos Recentes</h3>
          {recentProjects.length === 0 ? (
            <div
              style={{
                color: designSystem.colors.text.secondary,
                textAlign: 'center',
                padding: designSystem.spacing.xl,
              }}
            >
              Nenhum projeto cadastrado.
            </div>
          ) : (
            <DataTable
              headers={['Ambiente', 'Cliente', 'Valor', 'Etapa']}
              data={recentProjects}
              renderRow={(p: Project) => (
                <>
                  <td
                    style={{
                      padding: designSystem.spacing.md,
                      fontSize: designSystem.typography.fontSizes.sm,
                      fontWeight: designSystem.typography.fontWeights.semibold,
                    }}
                  >
                    {p.ambiente}
                  </td>
                  <td
                    style={{
                      padding: designSystem.spacing.md,
                      fontSize: designSystem.typography.fontSizes.sm,
                      color: designSystem.colors.text.secondary,
                    }}
                  >
                    {p.clientName || '-'}
                  </td>
                  <td
                    style={{
                      padding: designSystem.spacing.md,
                      fontSize: designSystem.typography.fontSizes.sm,
                      fontWeight: designSystem.typography.fontWeights.bold,
                      color: designSystem.colors.primary[600],
                    }}
                  >
                    {p.valorEstimado ? formatCurrency(p.valorEstimado) : '-'}
                  </td>
                  <td style={{ padding: designSystem.spacing.md }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: `${designSystem.spacing.xs} ${designSystem.spacing.sm}`,
                        fontSize: designSystem.typography.fontSizes.xs,
                        fontWeight: designSystem.typography.fontWeights.semibold,
                        background: designSystem.colors.primary[50],
                        color: designSystem.colors.primary[600],
                        border: `1px solid ${designSystem.colors.primary[100]}`,
                        borderRadius: designSystem.borderRadius.full,
                        textTransform: 'uppercase',
                      }}
                    >
                      {statusLabels[p.status] || p.status}
                    </span>
                  </td>
                </>
              )}
            />
          )}
        </div>
      </section>

      {/* Dlux Copilot - Insights Rápidos */}
      <section style={styles.copilotCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: designSystem.spacing.sm }}>
          <span style={{ fontSize: designSystem.typography.fontSizes.xl }}>💡</span>
          <h3 style={styles.h2}>Dlux Copilot — Consultoria Técnica &amp; Insights</h3>
        </div>
        <p
          style={{
            color: designSystem.colors.text.secondary,
            fontSize: designSystem.typography.fontSizes.sm,
            margin: 0,
          }}
        >
          Acesse insights operacionais e resolva dúvidas de engenharia moveleira em tempo real com a
          nossa IA especialista.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: designSystem.spacing.sm }}>
          {[
            { label: 'Saúde Financeira Geral', query: 'Como está a saúde financeira da empresa?' },
            {
              label: 'Ambientes Mais Lucrativos',
              query: 'Quais os produtos/ambientes mais lucrativos este mês?',
            },
            {
              label: 'Previsão de Faturamento',
              query: 'Previsão de faturamento baseada nos projetos ativos',
            },
            {
              label: 'Análise PUR vs Hotmelt',
              query:
                'Qual a diferença prática na colagem de bordas com PUR vs Hotmelt tradicional e onde usar cada um?',
            },
            {
              label: 'Altura Ergonômica de Bancadas',
              query:
                'Quais as medidas de altura recomendadas para bancadas de pia de cozinha e como calcular o rodapé?',
            },
            {
              label: 'MDF vs MDP na Estrutura',
              query:
                'Quando devo usar MDP em vez de MDF no projeto estrutural de um armário planejado?',
            },
            {
              label: 'Regras de Dobradiça 165°',
              query:
                'Em quais situações em armários de cozinha a dobradiça de 165 graus de abertura é obrigatória?',
            },
            {
              label: 'Evitar Flambagem em Prateleiras',
              query:
                'Qual é o vão livre máximo recomendado para uma prateleira em MDF de 15mm para mantimentos sem que ela curve?',
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="ds-quick-action"
              style={styles.copilotChip}
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('dlux-open-chat', { detail: { query: item.query } }),
                );
              }}
            >
              ✨ {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* Modal editar meta */}
      <Modal
        isOpen={editGoal}
        onClose={() => setEditGoal(false)}
        title="Definir Meta Mensal"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: designSystem.spacing.md }}>
          <label
            style={{
              fontSize: designSystem.typography.fontSizes.sm,
              color: designSystem.colors.text.secondary,
            }}
          >
            Valor da meta para {selectedPeriod}:
          </label>
          <Input
            type="number"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            style={{
              border: `1px solid ${designSystem.colors.border}`,
              borderRadius: designSystem.borderRadius.md,
              padding: designSystem.spacing.sm,
              fontSize: designSystem.typography.fontSizes.lg,
              fontWeight: designSystem.typography.fontWeights.semibold,
              fontFamily: designSystem.typography.fontFamily,
            }}
          />
          <Button
            onClick={() => {
              setMonthlyGoal(selectedPeriod, parseFloat(goalValue) || 0);
              setEditGoal(false);
            }}
            style={{
              width: '100%',
              background: designSystem.colors.primary[500],
              color: designSystem.colors.surface,
              border: 'none',
              borderRadius: designSystem.borderRadius.md,
              padding: designSystem.spacing.md,
              fontWeight: designSystem.typography.fontWeights.bold,
              boxShadow: `0 4px 12px ${designSystem.colors.primary[500]}40`,
            }}
          >
            Salvar Meta
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
