import React from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  FileText,
  Wrench,
  UserPlus,
  TrendingUp,
  Target,
  BarChart3,
  Sparkles,
} from 'lucide-react';
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
import { Card, CardStat, CardTitle, Button, Badge } from '../ui';

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

  const statusTone: Record<
    ProjectStatus,
    'primary' | 'info' | 'warning' | 'success' | 'danger' | 'accent' | 'neutral'
  > = {
    lead: 'neutral',
    visita_tecnica: 'info',
    orcamento_enviado: 'warning',
    aprovado: 'accent',
    em_producao: 'warning',
    pronto_entrega: 'info',
    instalado: 'success',
    concluido: 'success',
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
    indicacao: { label: 'Indicação', color: 'var(--ui-color-teal-500)' },
    instagram: { label: 'Instagram', color: '#e1306c' },
    google: { label: 'Google', color: 'var(--ui-color-info)' },
    feira: { label: 'Feira', color: 'var(--ui-color-gold-400)' },
    passante: { label: 'Passante', color: 'var(--ui-color-primary)' },
    outro: { label: 'Outro', color: 'var(--ui-text-muted)' },
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

  return (
    <div className="ui-stack ui-gap-4 p-4 md:p-6 max-w-[1400px] ui-mx-auto">
      {/* ── Header ── */}
      <div className="ui-row-between flex-wrap ui-gap-3">
        <div>
          <h1 className="text-[var(--ui-text-2xl)] font-semibold tracking-tight text-[var(--ui-text-primary)]">
            Painel Geral
          </h1>
          <p className="mt-0.5 text-[var(--ui-text-sm)] text-[var(--ui-text-secondary)]">
            Visão executiva — D'Luxury CRM
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40 border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] px-3 py-2 bg-[var(--ui-surface)] text-[var(--ui-text-primary)] font-semibold text-sm">
            <SelectValue placeholder="Período..." />
          </SelectTrigger>
          <SelectContent className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] shadow-[var(--ui-shadow-2)]">
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── KPIs principais (5 stats) ── */}
      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 ui-gap-3 auto-rows-fr">
          <CardStat
            label="Total Clientes"
            value={clients.length}
            icon={<UserPlus className="h-4 w-4" />}
            tone="info"
          />
          <CardStat
            label="Projetos Ativos"
            value={projects.filter((p) => p.status !== 'concluido').length}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="default"
          />
          <CardStat
            label="Em Produção"
            value={inProduction}
            icon={<Wrench className="h-4 w-4" />}
            tone="warning"
          />
          <CardStat
            label="Concluídos"
            value={concluidos}
            icon={<Target className="h-4 w-4" />}
            tone="success"
          />
          <CardStat
            label="Ticket Médio"
            value={formatCurrency(ticketMedio)}
            icon={<BarChart3 className="h-4 w-4" />}
            tone="accent"
          />
        </div>
      </section>

      {/* ── Meta do Período + Evolução Financeira ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 ui-gap-3">
        <Card
          variant="default"
          padding="lg"
          className="flex flex-col items-center justify-center ui-gap-4"
        >
          <CardTitle>Meta do Período</CardTitle>
          <div
            className="relative w-36 h-36 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(var(--ui-color-teal-500) ${percentualMeta * 3.6}deg, var(--ui-bg-subtle) 0deg)`,
              boxShadow: 'var(--ui-shadow-2)',
            }}
          >
            <div className="w-28 h-28 rounded-full bg-[var(--ui-surface)] flex flex-col items-center justify-center border border-[var(--ui-border)]">
              <span className="text-[var(--ui-text-2xl)] font-semibold text-[var(--ui-text-primary)]">
                {percentualMeta}%
              </span>
              <span className="text-[10px] font-medium text-[var(--ui-text-muted)] uppercase tracking-wider">
                atingido
              </span>
            </div>
          </div>
          <p className="text-sm text-center">
            <strong className="text-base font-semibold text-[var(--ui-action-secondary)]">
              {formatCurrency(totalPeriodo)}
            </strong>{' '}
            <span className="text-[var(--ui-text-muted)]">/ {formatCurrency(currentMeta)}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditGoal(true);
              setGoalValue(currentMeta.toString());
            }}
          >
            Editar Meta
          </Button>
        </Card>

        <Card variant="default" padding="lg" className="lg:col-span-2 flex flex-col">
          <CardTitle className="mb-4">Evolução Financeira (6 meses)</CardTitle>
          <div className="w-full h-64">
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
                  stroke="var(--ui-border)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--ui-text-muted)', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(val) => `R$${val / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--ui-text-muted)', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--ui-bg-subtle)', opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: 'var(--ui-surface)',
                    borderColor: 'var(--ui-border)',
                    borderRadius: 'var(--ui-radius-md)',
                    color: 'var(--ui-text-primary)',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Bar
                  dataKey="Entradas"
                  fill="var(--ui-color-gold-400)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Saidas"
                  fill="var(--ui-border)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* ── Ações Rápidas ── */}
      <section aria-label="Ações rápidas">
        <h3 className="text-sm font-semibold text-[var(--ui-text-primary)] uppercase tracking-wider mb-3">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 ui-gap-3">
          <Link
            to="/clientes"
            className="group flex items-center ui-gap-3 h-20 p-4 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] shadow-[var(--ui-shadow-1)] hover:shadow-[var(--ui-shadow-2)] hover:border-[var(--ui-color-teal-300)] hover:-translate-y-px transition-all duration-[var(--ui-duration-base)]"
          >
            <div className="h-10 w-10 rounded-[var(--ui-radius-md)] flex items-center justify-center bg-[var(--ui-color-success-soft)] text-[var(--ui-color-success)] shrink-0">
              <UserPlus size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ui-text-primary)] truncate">
                Novo Cliente
              </p>
              <p className="text-[11px] text-[var(--ui-text-muted)]">Cadastrar lead</p>
            </div>
          </Link>
          <Link
            to="/quotations"
            className="group flex items-center ui-gap-3 h-20 p-4 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] shadow-[var(--ui-shadow-1)] hover:shadow-[var(--ui-shadow-2)] hover:border-[var(--ui-color-navy-400)] hover:-translate-y-px transition-all duration-[var(--ui-duration-base)]"
          >
            <div className="h-10 w-10 rounded-[var(--ui-radius-md)] flex items-center justify-center bg-[var(--ui-color-navy-50)] text-[var(--ui-color-navy-700)] shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ui-text-primary)] truncate">
                Novo Orçamento
              </p>
              <p className="text-[11px] text-[var(--ui-text-muted)]">Criar proposta</p>
            </div>
          </Link>
          <Link
            to="/plano-de-corte"
            className="group flex items-center ui-gap-3 h-20 p-4 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] shadow-[var(--ui-shadow-1)] hover:shadow-[var(--ui-shadow-2)] hover:border-[var(--ui-color-info)] hover:-translate-y-px transition-all duration-[var(--ui-duration-base)]"
          >
            <div className="h-10 w-10 rounded-[var(--ui-radius-md)] flex items-center justify-center bg-[var(--ui-color-info-soft)] text-[var(--ui-color-info)] shrink-0">
              <Wrench size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ui-text-primary)] truncate">
                Plano de Corte
              </p>
              <p className="text-[11px] text-[var(--ui-text-muted)]">Otimizar material</p>
            </div>
          </Link>
          <Link
            to="/financeiro/contas"
            className="group flex items-center ui-gap-3 h-20 p-4 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] shadow-[var(--ui-shadow-1)] hover:shadow-[var(--ui-shadow-2)] hover:border-[var(--ui-color-gold-400)] hover:-translate-y-px transition-all duration-[var(--ui-duration-base)]"
          >
            <div className="h-10 w-10 rounded-[var(--ui-radius-md)] flex items-center justify-center bg-[var(--ui-color-gold-50)] text-[var(--ui-color-gold-500)] shrink-0">
              <PlusCircle size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ui-text-primary)] truncate">
                Nova Despesa
              </p>
              <p className="text-[11px] text-[var(--ui-text-muted)]">Lançar saída</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Origem dos Leads + Projetos Recentes ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 ui-gap-3">
        <Card variant="default" padding="lg" className="flex flex-col">
          <CardTitle className="mb-4">Origem dos Leads</CardTitle>
          {origemCounts.length === 0 ? (
            <div className="text-[var(--ui-text-muted)] text-center py-8">
              Nenhum cliente cadastrado.
            </div>
          ) : (
            <div className="flex flex-col ui-gap-3">
              {origemCounts.map((o) => {
                const info = origemLabels[o.key] || origemLabels.outro;
                const pct = clients.length > 0 ? Math.round((o.count / clients.length) * 100) : 0;
                return (
                  <div key={o.key} className="flex items-center ui-gap-3">
                    <span className="text-xs text-[var(--ui-text-secondary)] w-24 truncate">
                      {info.label}
                    </span>
                    <div className="flex-1 bg-[var(--ui-bg-subtle)] rounded-full h-3.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: info.color,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[var(--ui-text-secondary)] w-10 text-right tabular-nums">
                      {o.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card variant="default" padding="lg" className="flex flex-col">
          <CardTitle className="mb-4">Projetos Recentes</CardTitle>
          {recentProjects.length === 0 ? (
            <div className="text-[var(--ui-text-muted)] text-center py-8">
              Nenhum projeto cadastrado.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <DataTable
                headers={['Ambiente', 'Cliente', 'Valor', 'Etapa']}
                data={recentProjects}
                renderRow={(p: Project) => (
                  <>
                    <td className="px-3 py-3 font-semibold text-[var(--ui-text-primary)] text-sm">
                      {p.ambiente}
                    </td>
                    <td className="px-3 py-3 text-[var(--ui-text-secondary)] text-sm">
                      {p.clientName || '-'}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[var(--ui-text-primary)] text-sm tabular-nums">
                      {p.valorEstimado ? formatCurrency(p.valorEstimado) : '-'}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone[p.status]} size="sm">
                        {statusLabels[p.status] || p.status}
                      </Badge>
                    </td>
                  </>
                )}
              />
            </div>
          )}
        </Card>
      </section>

      {/* ── Dlux Copilot — Insights Rápidos ── */}
      <Card variant="accent" padding="lg" className="flex flex-col ui-gap-3">
        <div className="flex items-center ui-gap-2">
          <div className="h-9 w-9 rounded-[var(--ui-radius-md)] flex items-center justify-center bg-[var(--ui-color-gold-100)] text-[var(--ui-color-gold-500)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--ui-text-primary)]">
              Dlux Copilot — Consultoria &amp; Insights
            </h3>
            <p className="text-xs text-[var(--ui-text-secondary)]">
              Acesse insights operacionais e tire dúvidas de engenharia moveleira em tempo real.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap ui-gap-2">
          {[
            { label: 'Saúde Financeira', query: 'Como está a saúde financeira da empresa?' },
            {
              label: 'Ambientes Lucrativos',
              query: 'Quais os produtos/ambientes mais lucrativos este mês?',
            },
            {
              label: 'Previsão de Faturamento',
              query: 'Previsão de faturamento baseada nos projetos ativos',
            },
            {
              label: 'PUR vs Hotmelt',
              query:
                'Qual a diferença prática na colagem de bordas com PUR vs Hotmelt tradicional?',
            },
            {
              label: 'Altura de Bancadas',
              query: 'Quais as medidas de altura recomendadas para bancadas de pia de cozinha?',
            },
            {
              label: 'MDF vs MDP',
              query: 'Quando devo usar MDP em vez de MDF no projeto estrutural de um armário?',
            },
            {
              label: 'Dobradiça 165°',
              query: 'Em quais situações a dobradiça de 165 graus de abertura é obrigatória?',
            },
            {
              label: 'Flambagem em Prateleiras',
              query: 'Qual o vão livre máximo recomendado para prateleira em MDF 15mm sem curvar?',
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('dlux-open-chat', { detail: { query: item.query } }),
                );
              }}
              className="inline-flex items-center ui-gap-1 px-3 py-1.5 bg-[var(--ui-surface)] hover:bg-[var(--ui-bg-subtle)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] rounded-[var(--ui-radius-full)] text-xs font-medium transition-colors duration-[var(--ui-duration-fast)] border border-[var(--ui-border)]"
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Modal: editar meta ── */}
      <Modal
        isOpen={editGoal}
        onClose={() => setEditGoal(false)}
        title="Definir Meta Mensal"
        size="sm"
      >
        <div className="flex flex-col ui-gap-3 p-2">
          <label className="text-sm text-[var(--ui-text-secondary)]">
            Valor da meta para {selectedPeriod}:
          </label>
          <Input
            type="number"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            className="w-full border border-[var(--ui-border)] rounded-[var(--ui-radius-md)] p-3 text-lg font-semibold bg-[var(--ui-surface)] text-[var(--ui-text-primary)]"
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setMonthlyGoal(selectedPeriod, parseFloat(goalValue) || 0);
              setEditGoal(false);
            }}
            className="w-full"
          >
            Salvar Meta
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
