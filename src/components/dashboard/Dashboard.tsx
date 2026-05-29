import React from 'react';
import DataTable from '../ui/DataTable';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Modal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../design-system/components';
import { useAppContext } from '../../context/AppContext';
import type { Project, ProjectStatus } from '../../context/AppContext';

const Dashboard: React.FC = () => {
  const { projects, clients, billings, totalPeriodo, currentMeta, selectedPeriod, setSelectedPeriod, setMonthlyGoal } = useAppContext();
  const [editGoal, setEditGoal] = React.useState(false);
  const [goalValue, setGoalValue] = React.useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const periods = [
    { id: '2026-01', label: 'Jan/26' }, { id: '2026-02', label: 'Fev/26' },
    { id: '2026-03', label: 'Mar/26' }, { id: '2026-04', label: 'Abr/26' },
    { id: '2026-05', label: 'Mai/26' }, { id: '2026-06', label: 'Jun/26' },
    { id: '2026-07', label: 'Jul/26' }, { id: '2026-08', label: 'Ago/26' },
    { id: '2026-09', label: 'Set/26' }, { id: '2026-10', label: 'Out/26' },
    { id: '2026-11', label: 'Nov/26' }, { id: '2026-12', label: 'Dez/26' },
  ];

  // ─── KPIs ──────────────────────────────────────────────
  const statusLabels: Record<ProjectStatus, string> = {
    lead: '📥 Lead',
    visita_tecnica: '📐 Visita Técnica',
    orcamento_enviado: '📄 Orçamento Enviado',
    aprovado: '✅ Aprovado',
    em_producao: '🔨 Em Produção',
    pronto_entrega: '📦 Pronto p/ Entrega',
    instalado: '🏠 Instalado',
    concluido: '🏁 Concluído',
  };

  const _statusCounts = Object.keys(statusLabels).map(status => ({
    status: status as ProjectStatus,
    label: statusLabels[status as ProjectStatus],
    count: projects.filter(p => p.status === status).length,
    value: projects.filter(p => p.status === status).reduce((acc, p) => acc + (p.valorEstimado || 0), 0),
  }));

  const _totalPipeline = projects.reduce((acc, p) => acc + (p.valorEstimado || 0), 0);
  const inProduction = projects.filter(p => p.status === 'em_producao').length;
  const concluidos = projects.filter(p => p.status === 'concluido').length;
  const ticketMedio = concluidos > 0
    ? projects.filter(p => p.status === 'concluido').reduce((acc, p) => acc + (p.valorFinal || p.valorEstimado || 0), 0) / concluidos
    : 0;

  // Origem dos leads
  const origemCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      const key = c.origem || 'outro';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  const origemLabels: Record<string, { label: string; color: string }> = {
    indicacao: { label: '👥 Indicação', color: '#10b981' },
    instagram: { label: '📸 Instagram', color: '#e1306c' },
    google: { label: '🔍 Google', color: '#4285f4' },
    feira: { label: '🎪 Feira', color: '#f59e0b' },
    passante: { label: '🚶 Passante', color: '#8b5cf6' },
    outro: { label: '📌 Outro', color: '#6b7280' },
  };

  const percentualMeta = currentMeta > 0 ? Math.min(Math.round((totalPeriodo / currentMeta) * 100), 100) : 0;

  // Recent projects
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 6);

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground font-display">Painel Geral</h2>
          <p className="text-sm text-muted-foreground font-medium">Visão executiva — Fatto OS (Móveis Planejados)</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px] border-foreground/10 rounded-xl focus:ring-[#8B5A2B]">
              <SelectValue placeholder="Período..." />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-primary bg-card shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1 uppercase">Total Clientes</p>
            <h3 className="text-3xl font-black text-primary font-display">{clients.length}</h3>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-card shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1 uppercase">Projetos Ativos</p>
            <h3 className="text-3xl font-black text-blue-600 font-display">
              {projects.filter(p => !['concluido'].includes(p.status)).length}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent bg-card shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1 uppercase">Em Produção</p>
            <h3 className="text-3xl font-black text-accent font-display">{inProduction}</h3>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-600 bg-card shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1 uppercase">Concluídos</p>
            <h3 className="text-3xl font-black text-emerald-700 font-display">{concluidos}</h3>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-foreground bg-card shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1 uppercase">Ticket Médio</p>
            <h3 className="text-xl font-black text-foreground font-display mt-1">{formatCurrency(ticketMedio)}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Meta + Pipeline por etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meta mensal */}
        <Card className="flex flex-col items-center justify-center p-6 text-center bg-card border-none shadow-sm rounded-2xl">
          <CardContent className="flex flex-col items-center gap-4 w-full p-0">
            <h3 className="text-sm font-bold text-muted-foreground tracking-wider uppercase">Meta do Período</h3>
            <div className="w-[140px] h-[140px] rounded-full flex items-center justify-center" style={{
              background: `conic-gradient(#D4AF37 ${percentualMeta * 3.6}deg, rgba(28,46,36,0.06) 0deg)`,
            }}>
              <div className="w-[110px] h-[110px] rounded-full bg-card flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl font-black text-foreground font-display">{percentualMeta}%</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">atingido</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(totalPeriodo)} <span className="text-muted-foreground font-normal">/ {formatCurrency(currentMeta)}</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => { setEditGoal(true); setGoalValue(currentMeta.toString()); }} className="rounded-xl border-primary text-primary hover:bg-primary/5 font-bold px-5">
              Editar Meta
            </Button>
          </CardContent>
        </Card>

        {/* Pipeline resumo */}
        <Card className="p-6 bg-card border-none shadow-sm rounded-2xl">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-base font-black text-foreground tracking-wider uppercase font-display">Evolução Financeira</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col gap-4">
              {periods.slice(0, 6).map(p => {
                const monthBillings = billings.filter(b => b.data && b.data.startsWith(p.id));
                const entradas = monthBillings.filter(b => b.tipo !== 'saida').reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
                const saidas = monthBillings.filter(b => b.tipo === 'saida').reduce((acc, b) => acc + (Number(b.valor) || 0), 0);
                
                const maxVal = Math.max(entradas, saidas, 1000); 
                const percEntrada = (entradas / maxVal) * 100;
                const percSaida = (saidas / maxVal) * 100;

                return (
                  <div key={p.id} className="grid grid-cols-[60px_1fr] gap-4 items-center">
                    <span className="text-xs font-bold text-muted-foreground">{p.label}</span>
                    <div className="flex flex-col gap-1">
                      {/* Barra de Entrada */}
                      <div className="flex items-center h-3.5">
                        <div className="bg-emerald-600 rounded-r-full h-full transition-all duration-500 shadow-[0_2px_4px_rgba(16,185,129,0.1)]" style={{ 
                          width: `${Math.min(percEntrada, 100)}%`
                        }} />
                        {entradas > 0 && <span className="text-[10px] text-emerald-700 ml-2 font-bold">{formatCurrency(entradas)}</span>}
                      </div>
                      {/* Barra de Saída */}
                      <div className="flex items-center h-3.5">
                        <div className="bg-primary rounded-r-full h-full transition-all duration-500 shadow-[0_2px_4px_rgba(139,90,43,0.1)]" style={{ 
                          width: `${Math.min(percSaida, 100)}%`
                        }} />
                        {saidas > 0 && <span className="text-[10px] text-primary ml-2 font-bold">{formatCurrency(saidas)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex gap-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-emerald-600 rounded-lg shadow-sm" />
                <span className="text-xs font-semibold text-muted-foreground">Entradas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-primary rounded-lg shadow-sm" />
                <span className="text-xs font-semibold text-muted-foreground">Saídas (Insumos / Produção)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Origem de leads + Projetos recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-6 bg-card border-none shadow-sm rounded-2xl">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-base font-black text-foreground tracking-wider uppercase font-display">Origem dos Leads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {origemCounts.length === 0 ? (
              <div className="text-muted-foreground text-center py-8 font-medium">Nenhum cliente cadastrado.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {origemCounts.map(o => {
                  const info = origemLabels[o.key] || origemLabels.outro;
                  const pct = clients.length > 0 ? Math.round((o.count / clients.length) * 100) : 0;
                  return (
                    <div key={o.key} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-[120px] truncate">{info.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden shadow-inner">
                        <div className="rounded-full transition-all duration-500 h-full shadow-sm" style={{
                          width: `${pct}%`,
                          backgroundColor: o.key === 'indicacao' ? '#1C2E24' : o.key === 'outro' ? '#8B5A2B' : info.color,
                          minWidth: pct > 0 ? '16px' : '0'
                        }} />
                      </div>
                      <span className="text-xs font-black w-10 text-right text-muted-foreground">{o.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 p-6 bg-card border-none shadow-sm rounded-2xl">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base font-black text-foreground tracking-wider uppercase font-display">Projetos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentProjects.length === 0 ? (
              <div className="text-muted-foreground text-center py-8 font-medium">Nenhum projeto cadastrado.</div>
            ) : (
              <DataTable
                headers={['Ambiente', 'Cliente', 'Valor', 'Etapa']}
                data={recentProjects}
                renderRow={(p: Project) => (
                  <>
                    <td className="p-4 font-bold text-sm text-foreground font-display">{p.ambiente}</td>
                    <td className="p-4 text-sm text-muted-foreground font-semibold">{p.clientName || '-'}</td>
                    <td className="p-4 font-black text-sm text-primary">
                      {p.valorEstimado ? formatCurrency(p.valorEstimado) : '-'}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                  </>
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 💡 Dlux Copilot - Insights Rápidos */}
      <Card className="bg-gradient-to-br from-[#1C2E24]/5 to-[#8B5A2B]/5 border border-primary/15 rounded-2xl p-6">
        <CardContent className="flex flex-col gap-4 p-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h3 className="text-lg font-bold text-foreground font-display">Dlux Copilot — Consultoria Técnica & Insights</h3>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Acesse insights operacionais e resolva dúvidas de engenharia moveleira em tempo real com a nossa IA especialista.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-2">
            {[
              { label: '📊 Saúde Financeira Geral', query: 'Como está a saúde financeira da empresa?' },
              { label: '💎 Ambientes Mais Lucrativos', query: 'Quais os produtos/ambientes mais lucrativos este mês?' },
              { label: '🔮 Previsão de Faturamento', query: 'Previsão de faturamento baseada nos projetos ativos' },
              { label: '🔥 Análise PUR vs Hotmelt', query: 'Qual a diferença prática na colagem de bordas com PUR vs Hotmelt tradicional e onde usar cada um?' },
              { label: '📐 Altura Ergonômica de Bancadas', query: 'Quais as medidas de altura recomendadas para bancadas de pia de cozinha e como calcular o rodapé?' },
              { label: '🪵 MDF vs MDP na Estrutura', query: 'Quando devo usar MDP em vez de MDF no projeto estrutural de um armário planejado?' },
              { label: '📦 Regras de Dobradiça 165°', query: 'Em quais situações em armários de cozinha a dobradiça de 165 graus de abertura é obrigatória?' },
              { label: '📉 Evitar Flambagem em Prateleiras', query: 'Qual é o vão livre máximo recomendado para uma prateleira em MDF de 15mm para mantimentos sem que ela curve?' },
            ].map((item, idx) => (
              <Button
                key={idx}
                variant="secondary"
                size="sm"
                onClick={() => {
                  const event = new CustomEvent('dlux-open-chat', {
                    detail: { query: item.query }
                  });
                  window.dispatchEvent(event);
                }}
                className="bg-card hover:bg-primary/10 hover:text-primary text-muted-foreground border border-border transition-all flex items-center gap-1.5 rounded-xl font-semibold shadow-sm text-xs"
              >
                <span>✨</span>
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal editar meta */}
      <Modal isOpen={editGoal} onClose={() => setEditGoal(false)} title="Definir Meta Mensal" size="sm">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold text-muted-foreground">Valor da meta para {selectedPeriod}:</label>
          <Input type="number" className="text-lg font-bold border-border rounded-xl"
            value={goalValue} onChange={e => setGoalValue(e.target.value)} />
          <Button onClick={() => { setMonthlyGoal(selectedPeriod, parseFloat(goalValue) || 0); setEditGoal(false); }} className="w-full bg-primary hover:bg-[#704822] text-primary-foreground font-bold rounded-xl py-3 shadow-[0_4px_12px_rgba(139,90,43,0.25)]">
            Salvar Meta
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;

