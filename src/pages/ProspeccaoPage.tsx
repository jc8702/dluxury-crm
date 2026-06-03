import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  Search,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
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
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Prospeccao {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  uf?: string;
  status: string;
  temperatura: string;
  origem: string;
  interesse?: string;
  orcamento_estimado?: number;
  prazo_desejado_dias?: number;
  responsavel_nome?: string;
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  motivo_perda?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  ultimas_interacoes?: Interacao[];
}

interface Interacao {
  id: string;
  tipo: string;
  titulo?: string;
  descricao?: string;
  status_anterior?: string;
  status_novo?: string;
  realizado_por?: string;
  data_interacao: string;
}

interface Metrics {
  funil: Array<{ status: string; total: string; valor_total: string }>;
  resumo: {
    total: number;
    ganhos: number;
    perdidos: number;
    ativos: number;
    taxaConversao: number;
    cicloMedioDias: number | null;
    ticketMedio: number | null;
  };
  origens: Array<{ origem: string; total: string; ganhos: string }>;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  novo_contato: { label: 'Novo Contato', color: '#6366f1', bg: '#eef2ff' },
  primeiro_contato_feito: { label: '1º Contato Feito', color: '#0ea5e9', bg: '#e0f2fe' },
  aguardando_retorno: { label: 'Aguard. Retorno', color: '#f59e0b', bg: '#fef3c7' },
  visita_agendada: { label: 'Visita Agendada', color: '#8b5cf6', bg: '#f5f3ff' },
  proposta_enviada: { label: 'Proposta Enviada', color: '#3b82f6', bg: '#eff6ff' },
  negociacao: { label: 'Negociação', color: '#f97316', bg: '#fff7ed' },
  ganho: { label: 'Ganho ✓', color: '#22c55e', bg: '#f0fdf4' },
  perdido: { label: 'Perdido', color: '#ef4444', bg: '#fef2f2' },
  desqualificado: { label: 'Desqualificado', color: '#94a3b8', bg: '#f8fafc' },
};

const ORIGENS = [
  'indicacao',
  'instagram',
  'google',
  'tiktok',
  'facebook',
  'feira',
  'passante',
  'whatsapp',
  'ligacao_ativa',
  'outro',
];

function fmtCurrency(val?: number | string | null): string {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
}

function fmtDate(dt: string): string {
  return new Date(dt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function TemperaturaIcon({ t }: { t: string }) {
  if (t === 'quente') return <Flame size={14} className="text-orange-500" />;
  if (t === 'morno') return <Thermometer size={14} className="text-yellow-500" />;
  return <Snowflake size={14} className="text-sky-400" />;
}

// ─── MODAL FORMULÁRIO ────────────────────────────────────────────────────────

function ProspeccaoModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Prospeccao | null;
  onClose: () => void;
  onSave: (data: Partial<Prospeccao>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nome: initial?.nome || '',
    telefone: initial?.telefone || '',
    email: initial?.email || '',
    cidade: initial?.cidade || '',
    uf: initial?.uf || '',
    status: initial?.status || 'novo_contato',
    temperatura: initial?.temperatura || 'frio',
    origem: initial?.origem || 'outro',
    interesse: initial?.interesse || '',
    orcamento_estimado: initial?.orcamento_estimado?.toString() || '',
    prazo_desejado_dias: initial?.prazo_desejado_dias?.toString() || '',
    budget: initial?.budget || false,
    authority: initial?.authority || false,
    need: initial?.need || false,
    timeline: initial?.timeline || false,
    observacoes: initial?.observacoes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      orcamento_estimado: form.orcamento_estimado ? parseFloat(form.orcamento_estimado) : undefined,
      prazo_desejado_dias: form.prazo_desejado_dias
        ? parseInt(form.prazo_desejado_dias)
        : undefined,
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-[1px] flex justify-end items-center z-[9999] animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-card border border-border shadow-2xl rounded-2xl h-[calc(100vh-2rem)] m-4 w-full max-w-[550px] flex flex-col overflow-hidden animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Drawer */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-primary/5">
          <h2 className="text-lg font-bold text-foreground">
            {initial ? 'Editar Prospecção' : 'Nova Prospecção'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors text-xl font-bold"
          >
            &times;
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-4 text-foreground"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Nome *</label>
              <input
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border"
                required
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Nome completo do lead"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Telefone / WhatsApp
              </label>
              <input
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border"
                value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">E-mail</label>
              <input
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Cidade</label>
              <input
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border"
                value={form.cidade}
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">UF</label>
              <input
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border"
                value={form.uf}
                onChange={(e) => set('uf', e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
              <select
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border cursor-pointer"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Temperatura
              </label>
              <select
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border cursor-pointer"
                value={form.temperatura}
                onChange={(e) => set('temperatura', e.target.value)}
              >
                <option value="frio">❄️ Frio</option>
                <option value="morno">🌡️ Morno</option>
                <option value="quente">🔥 Quente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Origem</label>
              <select
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border cursor-pointer"
                value={form.origem}
                onChange={(e) => set('origem', e.target.value)}
              >
                {ORIGENS.map((o) => (
                  <option key={o} value={o}>
                    {o.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Orçamento Estimado (R$)
              </label>
              <input
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border"
                type="number"
                min="0"
                step="100"
                value={form.orcamento_estimado}
                onChange={(e) => set('orcamento_estimado', e.target.value)}
                placeholder="15000"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Interesse / Necessidade
              </label>
              <textarea
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border min-h-[68px] resize-vertical"
                value={form.interesse}
                onChange={(e) => set('interesse', e.target.value)}
                placeholder="Ex: Cozinha planejada + home office, metragem 22m²"
              />
            </div>

            {/* BANT */}
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest my-2">
                Qualificação BANT
              </p>
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 border border-border rounded-2xl">
                {[
                  { key: 'budget', label: 'Budget (Tem Orçamento?)' },
                  { key: 'authority', label: 'Authority (É o decisor?)' },
                  { key: 'need', label: 'Need (Possui a necessidade?)' },
                  { key: 'timeline', label: 'Timeline (Prazo definido?)' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={!!(form as any)[item.key]}
                      onChange={(e) => set(item.key, e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary focus:ring-offset-background w-4 h-4"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Prazo Desejado (Dias)
              </label>
              <input
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border"
                type="number"
                min="1"
                value={form.prazo_desejado_dias}
                onChange={(e) => set('prazo_desejado_dias', e.target.value)}
                placeholder="Ex: 45"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Observações Internas
              </label>
              <textarea
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 box-border min-h-[80px] resize-vertical"
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
                placeholder="Observações de negociação, concorrência, etc."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ ...btnBase, background: '#1e293b', color: '#fff' }}
            >
              {saving ? 'Salvando...' : initial ? 'Atualizar' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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

  // Cálculo de BANT
  const bantScore = [lead.budget, lead.authority, lead.need, lead.timeline].filter(Boolean).length;

  return (
    <div className="bg-card text-card-foreground border border-border/60 p-4 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.015] transition-all duration-200 relative">
      {/* Header */}
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

      {/* Info */}
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

      {/* BANT + Origem */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1">
          {(['B', 'A', 'N', 'T'] as const).map((l, i) => {
            const k = ['budget', 'authority', 'need', 'timeline'][i] as keyof Prospeccao;
            return (
              <span
                key={l}
                className={`w-5 h-5 rounded text-[10px] font-extrabold flex items-center justify-center border ${
                  lead[k]
                    ? 'bg-success/15 text-success border-success/20'
                    : 'bg-muted text-muted-foreground border-border/40'
                }`}
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

      {/* Data */}
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
// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function ProspeccaoPage() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Prospeccao[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTemp, setFilterTemp] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Prospeccao | null>(null);
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterTemp) params.set('temperatura', filterTemp);
      if (search) params.set('search', search);

      const [leadsRes, metricsRes] = await Promise.all([
        fetch(`/api/prospeccao?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('dluxury_token')}` },
        }).then((r) => r.json()),
        fetch('/api/prospeccao/metrics', {
          headers: { Authorization: `Bearer ${localStorage.getItem('dluxury_token')}` },
        }).then((r) => r.json()),
      ]);

      if (leadsRes.success) setLeads(leadsRes.data || []);
      if (metricsRes.success) setMetrics(metricsRes.data);
    } catch {
      showToast('Erro ao carregar prospecções', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterTemp, search, showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (data: Partial<Prospeccao>) => {
    try {
      const token = localStorage.getItem('dluxury_token');
      if (editTarget) {
        const r = await fetch(`/api/prospeccao/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then((r) => r.json());
        if (!r.success) throw new Error(r.error);
        showToast('Prospecção atualizada!', 'success');
      } else {
        const r = await fetch('/api/prospeccao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then((r) => r.json());
        if (!r.success) throw new Error(r.error);
        showToast('Lead criado com sucesso!', 'success');
      }
      setShowModal(false);
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lead permanentemente?')) return;
    try {
      const r = await fetch(`/api/prospeccao/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('dluxury_token')}` },
      }).then((r) => r.json());
      if (!r.success) throw new Error(r.error);
      showToast('Lead removido', 'info');
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Erro ao excluir', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const r = await fetch(`/api/prospeccao/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dluxury_token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      }).then((r) => r.json());
      if (!r.success) throw new Error(r.error);
      showToast(`Lead marcado como ${STATUS_CONFIG[newStatus]?.label}`, 'success');
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Erro', 'error');
    }
  };

  // Agrupa por status para o kanban
  const KANBAN_COLS = [
    'novo_contato',
    'primeiro_contato_feito',
    'aguardando_retorno',
    'visita_agendada',
    'proposta_enviada',
    'negociacao',
  ];

  return (
    <div className="min-h-full">
      {/* Header */}
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
            onClick={() => setView((v) => (v === 'kanban' ? 'lista' : 'kanban'))}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-sm font-semibold transition-colors"
          >
            <BarChart2 size={15} /> {view === 'kanban' ? 'Ver Lista' : 'Ver Kanban'}
          </button>
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 p-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-sm font-semibold transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => {
              setEditTarget(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/10"
          >
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
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
                  style={{
                    color: kpi.color,
                    backgroundColor: `${kpi.color}15`,
                  }}
                >
                  {kpi.icon}
                </div>
              </div>
              <div className="text-xl font-extrabold text-foreground mt-2">{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 cursor-pointer min-w-[150px]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
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
          onChange={(e) => setFilterTemp(e.target.value)}
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
        // KANBAN VIEW
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
          {KANBAN_COLS.map((status) => {
            const colLeads = leads.filter((l) => l.status === status);
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
                    style={{
                      backgroundColor: `${sc.color}18`,
                    }}
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
                        onEdit={() => {
                          setEditTarget(lead);
                          setShowModal(true);
                        }}
                        onDelete={() => handleDelete(lead.id)}
                        onStatusChange={(s) => handleStatusChange(lead.id, s)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // LIST VIEW
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
                      onClick={() => {
                        setEditTarget(lead);
                        setShowModal(true);
                      }}
                      className="p-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(lead.id)}
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

      {/* Modal */}
      {showModal && (
        <ProspeccaoModal
          initial={editTarget}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
// ─── ESTILOS ─────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.02em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '0.88rem',
  color: '#1e293b',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  transition: 'opacity 0.15s',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '0.8rem',
  color: '#64748b',
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '9px 14px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 500,
  color: '#374151',
  textAlign: 'left',
};
