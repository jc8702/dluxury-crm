import { useState } from 'react';
import {
  Target,
  Plus,
  Search,
  TrendingUp,
  Users,
  CheckCircle,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Edit2,
  Trash2,
  MoreVertical,
  ArrowUpRight,
  Flame,
  Snowflake,
  Thermometer,
  BarChart2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  STATUS_CONFIG,
  KANBAN_COLS,
  fmtCurrency,
  fmtDate,
  useProspeccaoFilters,
} from '../../hooks/crm/useProspeccaoFilters';
import type { Prospeccao, Metrics } from '../../hooks/crm/useProspeccaoHook';

interface Props {
  leads: Prospeccao[];
  metrics: Metrics | null;
  loading: boolean;
  search: string;
  filterStatus: string;
  filterTemp: string;
  view: 'kanban' | 'lista';
  onSearchChange: (v: string) => void;
  onFilterStatusChange: (v: string) => void;
  onFilterTempChange: (v: string) => void;
  onViewToggle: () => void;
  onRefresh: () => void;
  onNew: () => void;
  onEdit: (lead: Prospeccao) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

function TemperaturaIcon({ t }: { t: string }) {
  if (t === 'quente') return <Flame size={14} className="text-orange-500" />;
  if (t === 'morno') return <Thermometer size={14} className="text-yellow-500" />;
  return <Snowflake size={14} className="text-sky-400" />;
}

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  lead: Prospeccao;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo_contato;
  const bantScore = [lead.budget, lead.authority, lead.need, lead.timeline].filter(Boolean).length;

  return (
    <div className="bg-card text-card-foreground border border-border/60 p-4 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.015] transition-all duration-200 relative">
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <TemperaturaIcon t={lead.temperatura} />
            <h3 className="text-sm font-bold text-foreground truncate" title={lead.nome}>
              {lead.nome}
            </h3>
          </div>
          <span
            className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              color: sc.color,
              backgroundColor: `${sc.color}15`,
              borderColor: `${sc.color}25`,
            }}
          >
            {sc.label}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((m) => !m)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 bg-card border border-border shadow-lg rounded-xl z-[100] min-w-[160px] py-1 animate-fade-in"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => {
                  onEdit();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
              >
                <Edit2 size={13} /> Editar
              </button>
              {['ganho', 'perdido'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onStatusChange(s);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  {s === 'ganho' ? (
                    <CheckCircle size={13} className="text-success" />
                  ) : (
                    <XCircle size={13} className="text-destructive" />
                  )}
                  Marcar como {STATUS_CONFIG[s].label}
                </button>
              ))}
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors border-t border-border mt-1 pt-2"
              >
                <Trash2 size={13} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 my-3 text-xs text-muted-foreground">
        {lead.telefone && (
          <div className="flex items-center gap-1.5">
            <Phone size={12} className="text-muted-foreground/60" /> <span>{lead.telefone}</span>
          </div>
        )}
        {lead.cidade && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-muted-foreground/60" />{' '}
            <span className="truncate">
              {lead.cidade}
              {lead.uf ? ` / ${lead.uf}` : ''}
            </span>
          </div>
        )}
        {lead.orcamento_estimado && (
          <div className="flex items-center gap-1.5 font-bold text-success">
            <ArrowUpRight size={12} className="text-success/70" />{' '}
            <span>{fmtCurrency(lead.orcamento_estimado)}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1">
          {(['B', 'A', 'N', 'T'] as const).map((l, i) => {
            const k = ['budget', 'authority', 'need', 'timeline'][i] as keyof Prospeccao;
            return (
              <span
                key={l}
                className={`w-5 h-5 rounded text-[10px] font-extrabold flex items-center justify-center border ${lead[k] ? 'bg-success/15 text-success border-success/20' : 'bg-muted text-muted-foreground border-border/40'}`}
                title={
                  l === 'B' ? 'Budget' : l === 'A' ? 'Authority' : l === 'N' ? 'Need' : 'Timeline'
                }
              >
                {l}
              </span>
            );
          })}
          <span className="text-[10px] text-muted-foreground ml-1.5">{bantScore}/4</span>
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted border border-border/40 px-2.5 py-0.5 rounded-full font-medium capitalize truncate max-w-[80px]">
          {lead.origem?.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-border/20 flex justify-between items-center text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock size={11} className="text-muted-foreground/60" />{' '}
          <span>{fmtDate(lead.created_at)}</span>
        </div>
        {lead.ultimas_interacoes?.length ? (
          <div className="flex items-center gap-1">
            <MessageSquare size={11} className="text-muted-foreground/60" />{' '}
            <span>{lead.ultimas_interacoes.length} interac.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProspeccaoListView({
  leads,
  metrics,
  loading,
  search,
  filterStatus,
  filterTemp,
  view,
  onSearchChange,
  onFilterStatusChange,
  onFilterTempChange,
  onViewToggle,
  onRefresh,
  onNew,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  const { groupedByStatus } = useProspeccaoFilters(leads);

  return (
    <div className="min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
              <Target size={18} className="text-primary-foreground" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground">Prospecção</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Funil de leads e oportunidades de vendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewToggle}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-sm font-semibold transition-colors"
          >
            <BarChart2 size={15} /> {view === 'kanban' ? 'Ver Lista' : 'Ver Kanban'}
          </button>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 p-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-sm font-semibold transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/10"
          >
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-8">
          {[
            {
              label: 'Total Leads',
              value: metrics.resumo.total,
              icon: <Users size={18} />,
              color: '#6366f1',
            },
            {
              label: 'Ativos',
              value: metrics.resumo.ativos,
              icon: <Target size={18} />,
              color: '#0ea5e9',
            },
            {
              label: 'Ganhos',
              value: metrics.resumo.ganhos,
              icon: <CheckCircle size={18} />,
              color: '#22c55e',
            },
            {
              label: 'Taxa Conv.',
              value: `${metrics.resumo.taxaConversao}%`,
              icon: <TrendingUp size={18} />,
              color: '#f59e0b',
            },
            {
              label: 'Ticket Médio',
              value: fmtCurrency(metrics.resumo.ticketMedio),
              icon: <ArrowUpRight size={18} />,
              color: '#8b5cf6',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-card text-card-foreground rounded-2xl border border-border/60 p-4 shadow-sm transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ color: kpi.color, backgroundColor: `${kpi.color}15` }}
                >
                  {kpi.icon}
                </div>
              </div>
              <div className="text-xl font-extrabold text-foreground mt-2">{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 cursor-pointer min-w-[150px]"
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 cursor-pointer min-w-[150px]"
          value={filterTemp}
          onChange={(e) => onFilterTempChange(e.target.value)}
        >
          <option value="">Temperatura</option>
          <option value="frio">❄️ Frio</option>
          <option value="morno">🌡️ Morno</option>
          <option value="quente">🔥 Quente</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-9 h-9 border-3 border-border border-t-primary rounded-full animate-spin mx-auto mb-3" />
          Carregando prospecções...
        </div>
      ) : view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
          {KANBAN_COLS.map((status) => {
            const colLeads = groupedByStatus[status] || [];
            const sc = STATUS_CONFIG[status];
            return (
              <div key={status} className="w-[280px] shrink-0">
                <div
                  className="flex items-center justify-between p-3.5 rounded-2xl mb-3 border"
                  style={{
                    color: sc.color,
                    backgroundColor: `${sc.color}10`,
                    borderColor: `${sc.color}20`,
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{sc.label}</span>
                  <span
                    className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${sc.color}18` }}
                  >
                    {colLeads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3 min-h-[300px]">
                  {colLeads.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground/50 text-xs border border-dashed border-border rounded-2xl bg-card/30">
                      Sem leads
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onEdit={() => onEdit(lead)}
                        onDelete={() => onDelete(lead.id)}
                        onStatusChange={(s) => onStatusChange(lead.id, s)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {leads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
              <Target size={40} className="text-muted-foreground/40 mx-auto mb-3" />
              <p>Nenhum lead encontrado. Crie o primeiro!</p>
            </div>
          ) : (
            leads.map((lead) => {
              const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo_contato;
              return (
                <div
                  key={lead.id}
                  className="bg-card text-card-foreground border border-border/60 p-4 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-200 flex items-center gap-4 flex-wrap"
                >
                  <TemperaturaIcon t={lead.temperatura} />
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-bold text-sm text-foreground">{lead.nome}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {lead.telefone || lead.email || '—'}
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full border whitespace-nowrap"
                    style={{
                      color: sc.color,
                      backgroundColor: `${sc.color}15`,
                      borderColor: `${sc.color}25`,
                    }}
                  >
                    {sc.label}
                  </span>
                  {lead.orcamento_estimado && (
                    <span className="font-extrabold text-sm text-success">
                      {fmtCurrency(lead.orcamento_estimado)}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(lead)}
                      className="p-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(lead.id)}
                      className="p-2 bg-destructive/10 hover:bg-destructive/15 text-destructive border border-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
