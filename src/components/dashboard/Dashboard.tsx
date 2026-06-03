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
    indicacao: { label: 'Indicação', color: '#00A99D' },
    instagram: { label: 'Instagram', color: '#e1306c' },
    google: { label: 'Google', color: '#0D66CC' },
    feira: { label: 'Feira', color: '#E2AC00' },
    passante: { label: 'Passante', color: '#8b5cf6' },
    outro: { label: 'Outro', color: '#666666' },
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
      gap: '32px',
      padding: '24px',
      color: '#1A1A1A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    headerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap' as const,
      gap: '16px',
    },
    h1: {
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1A1A1A',
      margin: 0,
    },
    h2: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.2,
      color: '#1A1A1A',
      margin: 0,
    },
    subtitle: {
      fontSize: '14px',
      color: '#666666',
      margin: `4px 0 0 0`,
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#1A1A1A',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: '16px',
    },
    kpiLabel: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#666666',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: '4px',
    },
    kpiValue: {
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1A1A1A',
      margin: 0,
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '24px',
    },
    kpiCard: (accentColor: string) => ({
      background: '#FFFFFF',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${accentColor}`,
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    }),
    splitGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '24px',
    },
    card: {
      background: '#FFFFFF',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    quickActionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
    },
    quickAction: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      height: 96,
      padding: '16px',
      background: '#FFFFFF',
      border: `1px solid #E0E0E0`,
      borderRadius: '12px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      color: '#1A1A1A',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: '14px',
      fontWeight: 600,
      textDecoration: 'none',
      transition: 'box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
    },
    copilotCard: {
      background: '#FFFFFF',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      border: `1px solid #E0EFFF`,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    copilotChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: `4px 8px`,
      background: '#F0F7FF',
      color: '#0D5FB8',
      border: `1px solid #E0EFFF`,
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
  } as const;

  return (
    <div className="ds-dashboard" style={styles.page}>
      <style>{`
        .ds-dashboard * { box-sizing: border-box; }
        .ds-dashboard .ds-kpi-card:hover { box-shadow: 0 10px 15px rgba(0,0,0,0.1); transform: translateY(-1px); }
        .ds-dashboard .ds-quick-action:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-color: #0D66CC; }
        @media (max-width: 768px) {
          .ds-dashboard .ds-header-row { flex-direction: column; align-items: stretch; }
          .ds-dashboard .ds-chart-box { height: 220px !important; }
        }
        @media (max-width: 480px) {
          .ds-dashboard { padding: 16px !important; }
          .ds-dashboard .ds-kpi-value { font-size: 20px !important; }
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
              border: `1px solid #E0E0E0`,
              borderRadius: '8px',
              padding: `4px 16px`,
              background: '#FFFFFF',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          <div className="ds-kpi-card" style={styles.kpiCard('#0D66CC')}>
            <p style={styles.kpiLabel}>Total Clientes</p>
            <h3 style={{ ...styles.kpiValue, color: '#0D5FB8' }}>{clients.length}</h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard('#17A2B8')}>
            <p style={styles.kpiLabel}>Projetos Ativos</p>
            <h3 style={{ ...styles.kpiValue, color: '#17A2B8' }}>
              {projects.filter((p) => p.status !== 'concluido').length}
            </h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard('#E2AC00')}>
            <p style={styles.kpiLabel}>Em Produção</p>
            <h3 style={{ ...styles.kpiValue, color: '#E2AC00' }}>{inProduction}</h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard('#28A745')}>
            <p style={styles.kpiLabel}>Concluídos</p>
            <h3 style={{ ...styles.kpiValue, color: '#28A745' }}>{concluidos}</h3>
          </div>
          <div className="ds-kpi-card" style={styles.kpiCard('#1A1A1A')}>
            <p style={styles.kpiLabel}>Ticket Médio</p>
            <h3 style={{ ...styles.kpiValue, fontSize: '20px' }}>{formatCurrency(ticketMedio)}</h3>
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
            gap: '16px',
          }}
        >
          <h3 style={styles.sectionTitle}>Meta do Período</h3>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `conic-gradient(#E2AC00 ${percentualMeta * 3.6}deg, #E0E0E0 0deg)`,
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: '9999px',
                background: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 0 1px ' + '#E0E0E0',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                }}
              >
                {percentualMeta}%
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#666666',
                  textTransform: 'uppercase',
                }}
              >
                atingido
              </span>
            </div>
          </div>
          <p
            style={{
              fontSize: '16px',
              color: '#1A1A1A',
              margin: 0,
            }}
          >
            <strong>{formatCurrency(totalPeriodo)}</strong>{' '}
            <span style={{ color: '#666666' }}>/ {formatCurrency(currentMeta)}</span>
          </p>
          <Button
            onClick={() => {
              setEditGoal(true);
              setGoalValue(currentMeta.toString());
            }}
            style={{
              background: 'transparent',
              color: '#0D5FB8',
              border: `1px solid #0D66CC`,
              borderRadius: '8px',
              padding: `4px 24px`,
              fontWeight: 600,
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
                  stroke={'#E0E0E0'}
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666666' }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(val) => `R$${val / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666666' }}
                />
                <Tooltip
                  cursor={{ fill: '#FAFAFA', opacity: 0.5 }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E0E0E0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                <Bar dataKey="Entradas" fill={'#28A745'} radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Saidas" fill={'#0D66CC'} radius={[4, 4, 0, 0]} maxBarSize={40} />
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
            <UserPlus size={24} color={'#28A745'} />
            <span>Novo Cliente</span>
          </Link>
          <Link to="/orcamentos" className="ds-quick-action" style={styles.quickAction}>
            <FileText size={24} color={'#0D66CC'} />
            <span>Novo Orçamento</span>
          </Link>
          <Link to="/plano-corte" className="ds-quick-action" style={styles.quickAction}>
            <Wrench size={24} color={'#17A2B8'} />
            <span>Plano de Corte</span>
          </Link>
          <Link to="/financeiro/contas" className="ds-quick-action" style={styles.quickAction}>
            <PlusCircle size={24} color={'#E2AC00'} />
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
                color: '#666666',
                textAlign: 'center',
                padding: '32px',
              }}
            >
              Nenhum cliente cadastrado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {origemCounts.map((o) => {
                const info = origemLabels[o.key] || origemLabels.outro;
                const pct = clients.length > 0 ? Math.round((o.count / clients.length) * 100) : 0;
                return (
                  <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#666666',
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
                        background: '#FAFAFA',
                        borderRadius: '9999px',
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
                          borderRadius: '9999px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#666666',
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
                color: '#666666',
                textAlign: 'center',
                padding: '32px',
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
                      padding: '16px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {p.ambiente}
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: '#666666',
                    }}
                  >
                    {p.clientName || '-'}
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0D5FB8',
                    }}
                  >
                    {p.valorEstimado ? formatCurrency(p.valorEstimado) : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: `4px 8px`,
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#F0F7FF',
                        color: '#0D5FB8',
                        border: `1px solid #E0EFFF`,
                        borderRadius: '9999px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <h3 style={styles.h2}>Dlux Copilot — Consultoria Técnica &amp; Insights</h3>
        </div>
        <p
          style={{
            color: '#666666',
            fontSize: '14px',
            margin: 0,
          }}
        >
          Acesse insights operacionais e resolva dúvidas de engenharia moveleira em tempo real com a
          nossa IA especialista.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label
            style={{
              fontSize: '14px',
              color: '#666666',
            }}
          >
            Valor da meta para {selectedPeriod}:
          </label>
          <Input
            type="number"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            style={{
              border: `1px solid #E0E0E0`,
              borderRadius: '8px',
              padding: '8px',
              fontSize: '18px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />
          <Button
            onClick={() => {
              setMonthlyGoal(selectedPeriod, parseFloat(goalValue) || 0);
              setEditGoal(false);
            }}
            style={{
              width: '100%',
              background: '#0D66CC',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '16px',
              fontWeight: 700,
              boxShadow: `0 4px 12px #0D66CC40`,
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
