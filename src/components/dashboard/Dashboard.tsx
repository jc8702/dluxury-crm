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

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Painel Geral</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Visão executiva — D'Luxury CRM (Fatto OS)
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40 border border-border/80 rounded-xl px-4 py-2 bg-card text-foreground font-semibold text-sm">
              <SelectValue placeholder="Período..." />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border/80 rounded-xl shadow-lg">
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* KPIs principais */}
      <section aria-label="Indicadores principais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm border-l-4 border-l-primary transition-all hover:scale-[1.015] hover:shadow-md">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Total Clientes
            </p>
            <h3 className="text-2xl font-black text-primary">{clients.length}</h3>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm border-l-4 border-l-info transition-all hover:scale-[1.015] hover:shadow-md">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Projetos Ativos
            </p>
            <h3 className="text-2xl font-black text-info">
              {projects.filter((p) => p.status !== 'concluido').length}
            </h3>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm border-l-4 border-l-warning transition-all hover:scale-[1.015] hover:shadow-md">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Em Produção
            </p>
            <h3 className="text-2xl font-black text-warning">{inProduction}</h3>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm border-l-4 border-l-success transition-all hover:scale-[1.015] hover:shadow-md">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Concluídos
            </p>
            <h3 className="text-2xl font-black text-success">{concluidos}</h3>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm border-l-4 border-l-accent transition-all hover:scale-[1.015] hover:shadow-md">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Ticket Médio
            </p>
            <h3 className="text-xl font-black text-foreground truncate">
              {formatCurrency(ticketMedio)}
            </h3>
          </div>
        </div>
      </section>

      {/* Meta + Pipeline por etapa */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center justify-center gap-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Meta do Período
          </h3>
          <div
            className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${percentualMeta * 3.6}deg, hsl(var(--border)) 0deg)`,
            }}
          >
            <div className="w-28 h-28 rounded-full bg-card flex flex-col items-center justify-center border border-border/30 shadow-sm">
              <span className="text-2xl font-black text-foreground">{percentualMeta}%</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                atingido
              </span>
            </div>
          </div>
          <p className="text-sm text-foreground text-center">
            <strong className="text-base font-bold text-primary">
              {formatCurrency(totalPeriodo)}
            </strong>{' '}
            <span className="text-muted-foreground">/ {formatCurrency(currentMeta)}</span>
          </p>
          <Button
            onClick={() => {
              setEditGoal(true);
              setGoalValue(currentMeta.toString());
            }}
            variant="outline"
            className="px-6 py-2 rounded-xl text-xs"
          >
            Editar Meta
          </Button>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
            Evolução Financeira (6 meses)
          </h3>
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
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(val) => `R$${val / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Bar
                  dataKey="Entradas"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Saidas"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Ações Rápidas */}
      <section aria-label="Ações rápidas">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/clientes"
            className="flex flex-col items-center justify-center gap-2 h-24 p-4 bg-card text-card-foreground border border-border/50 rounded-2xl shadow-sm hover:border-success/50 hover:shadow-success/5 hover:scale-[1.02] transition-all duration-200"
          >
            <UserPlus size={24} className="text-success" />
            <span className="text-sm font-semibold">Novo Cliente</span>
          </Link>
          <Link
            to="/orcamentos"
            className="flex flex-col items-center justify-center gap-2 h-24 p-4 bg-card text-card-foreground border border-border/50 rounded-2xl shadow-sm hover:border-primary/50 hover:shadow-primary/5 hover:scale-[1.02] transition-all duration-200"
          >
            <FileText size={24} className="text-primary" />
            <span className="text-sm font-semibold">Novo Orçamento</span>
          </Link>
          <Link
            to="/plano-de-corte"
            className="flex flex-col items-center justify-center gap-2 h-24 p-4 bg-card text-card-foreground border border-border/50 rounded-2xl shadow-sm hover:border-info/50 hover:shadow-info/5 hover:scale-[1.02] transition-all duration-200"
          >
            <Wrench size={24} className="text-info" />
            <span className="text-sm font-semibold">Plano de Corte</span>
          </Link>
          <Link
            to="/financeiro/contas"
            className="flex flex-col items-center justify-center gap-2 h-24 p-4 bg-card text-card-foreground border border-border/50 rounded-2xl shadow-sm hover:border-accent/50 hover:shadow-accent/5 hover:scale-[1.02] transition-all duration-200"
          >
            <PlusCircle size={24} className="text-accent" />
            <span className="text-sm font-semibold">Nova Despesa</span>
          </Link>
        </div>
      </section>

      {/* Origem de leads + Projetos recentes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
            Origem dos Leads
          </h3>
          {origemCounts.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">Nenhum cliente cadastrado.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {origemCounts.map((o) => {
                const info = origemLabels[o.key] || origemLabels.outro;
                const pct = clients.length > 0 ? Math.round((o.count / clients.length) * 100) : 0;
                return (
                  <div key={o.key} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-24 truncate">
                      {info.label}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-3.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: info.color,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground w-10 text-right">
                      {o.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
            Projetos Recentes
          </h3>
          {recentProjects.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">Nenhum projeto cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                headers={['Ambiente', 'Cliente', 'Valor', 'Etapa']}
                data={recentProjects}
                renderRow={(p: Project) => (
                  <>
                    <td className="px-4 py-3.5 font-bold text-foreground text-sm">{p.ambiente}</td>
                    <td className="px-4 py-3.5 text-muted-foreground text-sm">
                      {p.clientName || '-'}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-primary text-sm">
                      {p.valorEstimado ? formatCurrency(p.valorEstimado) : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider border border-primary/20">
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                  </>
                )}
              />
            </div>
          )}
        </div>
      </section>

      {/* Dlux Copilot - Insights Rápidos */}
      <section className="bg-card text-card-foreground p-6 rounded-2xl border border-border/50 shadow-sm border-l-4 border-l-primary/60 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">💡</span>
          <h3 className="text-lg font-bold text-foreground">
            Dlux Copilot — Consultoria Técnica &amp; Insights
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Acesse insights operacionais e resolva dúvidas de engenharia moveleira em tempo real com a
          nossa IA especialista.
        </p>
        <div className="flex flex-wrap gap-2.5">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted-hover text-muted-foreground hover:text-foreground rounded-full text-xs font-semibold transition-colors duration-150 border border-border/50"
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
        <div className="flex flex-col gap-4 p-2">
          <label className="text-sm text-muted-foreground">
            Valor da meta para {selectedPeriod}:
          </label>
          <Input
            type="number"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            className="w-full border border-border rounded-xl p-3 text-lg font-bold bg-card text-foreground"
          />
          <Button
            onClick={() => {
              setMonthlyGoal(selectedPeriod, parseFloat(goalValue) || 0);
              setEditGoal(false);
            }}
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold p-3.5 rounded-xl shadow-md transition-all"
          >
            Salvar Meta
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
