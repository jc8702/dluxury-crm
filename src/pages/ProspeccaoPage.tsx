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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--color-card, #fff)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            padding: '24px 28px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            {initial ? 'Editar Prospecção' : 'Nova Prospecção'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.4rem',
              lineHeight: 1,
              color: '#94a3b8',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 28px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Nome *</label>
              <input
                style={inputStyle}
                required
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Nome completo do lead"
              />
            </div>
            <div>
              <label style={labelStyle}>Telefone / WhatsApp</label>
              <input
                style={inputStyle}
                value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <label style={labelStyle}>E-mail</label>
              <input
                style={inputStyle}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Cidade</label>
              <input
                style={inputStyle}
                value={form.cidade}
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div>
              <label style={labelStyle}>UF</label>
              <input
                style={inputStyle}
                value={form.uf}
                onChange={(e) => set('uf', e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
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
              <label style={labelStyle}>Temperatura</label>
              <select
                style={inputStyle}
                value={form.temperatura}
                onChange={(e) => set('temperatura', e.target.value)}
              >
                <option value="frio">❄️ Frio</option>
                <option value="morno">🌡️ Morno</option>
                <option value="quente">🔥 Quente</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Origem</label>
              <select
                style={inputStyle}
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
              <label style={labelStyle}>Orçamento Estimado (R$)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="100"
                value={form.orcamento_estimado}
                onChange={(e) => set('orcamento_estimado', e.target.value)}
                placeholder="15000"
              />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Interesse / Necessidade</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '68px' }}
                value={form.interesse}
                onChange={(e) => set('interesse', e.target.value)}
                placeholder="Ex: Cozinha planejada + home office, metragem 22m²"
              />
            </div>

            {/* BANT */}
            <div style={{ gridColumn: '1/-1' }}>
              <p
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: '4px 0 8px',
                }}
              >
                Qualificação BANT
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {(['budget', 'authority', 'need', 'timeline'] as const).map((k) => (
                  <label
                    key={k}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      background: form[k] ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${form[k] ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: form[k] ? '#16a34a' : '#475569',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form[k]}
                      onChange={(e) => set(k, e.target.checked)}
                      style={{ accentColor: '#16a34a' }}
                    />
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Observações</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
                placeholder="Detalhes adicionais..."
              />
            </div>
          </div>

          <div
            style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{ ...btnBase, background: '#f1f5f9', color: '#475569' }}
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

// ─── CARD DO LEAD ─────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  lead: Prospeccao;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo_contato;
  const bantScore = [lead.budget, lead.authority, lead.need, lead.timeline].filter(Boolean).length;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        transition: 'box-shadow 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <TemperaturaIcon t={lead.temperatura} />
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                margin: 0,
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {lead.nome}
            </h3>
          </div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '99px',
              color: sc.color,
              background: sc.bg,
            }}
          >
            {sc.label}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((m) => !m)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#94a3b8',
              borderRadius: '6px',
            }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: '#fff',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid #e2e8f0',
                zIndex: 100,
                minWidth: '160px',
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => {
                  onEdit();
                  setMenuOpen(false);
                }}
                style={menuItemStyle}
              >
                <Edit2 size={14} /> Editar
              </button>
              {['ganho', 'perdido'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onStatusChange(s);
                    setMenuOpen(false);
                  }}
                  style={menuItemStyle}
                >
                  {s === 'ganho' ? (
                    <CheckCircle size={14} color="#22c55e" />
                  ) : (
                    <XCircle size={14} color="#ef4444" />
                  )}
                  Marcar como {STATUS_CONFIG[s].label}
                </button>
              ))}
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                style={{ ...menuItemStyle, color: '#ef4444' }}
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
        {lead.telefone && (
          <div style={infoRowStyle}>
            <Phone size={12} color="#94a3b8" /> <span>{lead.telefone}</span>
          </div>
        )}
        {lead.cidade && (
          <div style={infoRowStyle}>
            <MapPin size={12} color="#94a3b8" />{' '}
            <span>
              {lead.cidade}
              {lead.uf ? ` / ${lead.uf}` : ''}
            </span>
          </div>
        )}
        {lead.orcamento_estimado && (
          <div style={infoRowStyle}>
            <ArrowUpRight size={12} color="#94a3b8" />{' '}
            <span style={{ fontWeight: 700, color: '#16a34a' }}>
              {fmtCurrency(lead.orcamento_estimado)}
            </span>
          </div>
        )}
      </div>

      {/* BANT + Origem */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['B', 'A', 'N', 'T'] as const).map((l, i) => {
            const k = ['budget', 'authority', 'need', 'timeline'][i] as keyof Prospeccao;
            return (
              <span
                key={l}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: lead[k] ? '#dcfce7' : '#f1f5f9',
                  color: lead[k] ? '#16a34a' : '#94a3b8',
                }}
              >
                {l}
              </span>
            );
          })}
          <span
            style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '4px', alignSelf: 'center' }}
          >
            {bantScore}/4
          </span>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            color: '#94a3b8',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '2px 7px',
            borderRadius: '99px',
          }}
        >
          {lead.origem?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Data */}
      <div
        style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={infoRowStyle}>
          <Clock size={11} color="#cbd5e1" />{' '}
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{fmtDate(lead.created_at)}</span>
        </div>
        {lead.ultimas_interacoes?.length ? (
          <div style={infoRowStyle}>
            <MessageSquare size={11} color="#cbd5e1" />{' '}
            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
              {lead.ultimas_interacoes.length} interact.
            </span>
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
    <div style={{ minHeight: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={18} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
              Prospecção
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Funil de leads e oportunidades de vendas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setView((v) => (v === 'kanban' ? 'lista' : 'kanban'))}
            style={{
              ...btnBase,
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            <BarChart2 size={15} /> {view === 'kanban' ? 'Ver Lista' : 'Ver Kanban'}
          </button>
          <button
            onClick={fetchAll}
            style={{
              ...btnBase,
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => {
              setEditTarget(null);
              setShowModal(true);
            }}
            style={{
              ...btnBase,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff',
            }}
          >
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {[
            {
              label: 'Total Leads',
              value: metrics.resumo.total,
              icon: <Users size={18} />,
              color: '#6366f1',
              bg: '#eef2ff',
            },
            {
              label: 'Ativos',
              value: metrics.resumo.ativos,
              icon: <Target size={18} />,
              color: '#0ea5e9',
              bg: '#e0f2fe',
            },
            {
              label: 'Ganhos',
              value: metrics.resumo.ganhos,
              icon: <CheckCircle size={18} />,
              color: '#22c55e',
              bg: '#f0fdf4',
            },
            {
              label: 'Taxa Conv.',
              value: `${metrics.resumo.taxaConversao}%`,
              icon: <TrendingUp size={18} />,
              color: '#f59e0b',
              bg: '#fef3c7',
            },
            {
              label: 'Ticket Médio',
              value: fmtCurrency(metrics.resumo.ticketMedio),
              icon: <ArrowUpRight size={18} />,
              color: '#8b5cf6',
              bg: '#f5f3ff',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {kpi.label}
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: kpi.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: kpi.color,
                  }}
                >
                  {kpi.icon}
                </div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            style={{ ...inputStyle, paddingLeft: '32px', height: '38px' }}
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          style={{ ...inputStyle, width: 'auto', height: '38px' }}
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
          style={{ ...inputStyle, width: 'auto', height: '38px' }}
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
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          Carregando prospecções...
        </div>
      ) : view === 'kanban' ? (
        // KANBAN VIEW
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '16px' }}>
          {KANBAN_COLS.map((status) => {
            const colLeads = leads.filter((l) => l.status === status);
            const sc = STATUS_CONFIG[status];
            return (
              <div key={status} style={{ minWidth: '260px', maxWidth: '280px', flexShrink: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: sc.bg,
                    marginBottom: '10px',
                    border: `1px solid ${sc.color}22`,
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: sc.color }}>
                    {sc.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: sc.color,
                      background: `${sc.color}18`,
                      padding: '2px 8px',
                      borderRadius: '99px',
                    }}
                  >
                    {colLeads.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {colLeads.length === 0 ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#cbd5e1',
                        fontSize: '0.8rem',
                        border: '1px dashed #e2e8f0',
                        borderRadius: '10px',
                      }}
                    >
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leads.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
                color: '#94a3b8',
                border: '1px dashed #e2e8f0',
                borderRadius: '12px',
              }}
            >
              <Target size={40} color="#e2e8f0" style={{ marginBottom: '12px' }} />
              <p>Nenhum lead encontrado. Crie o primeiro!</p>
            </div>
          ) : (
            leads.map((lead) => {
              const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo_contato;
              return (
                <div
                  key={lead.id}
                  style={{
                    background: '#fff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <TemperaturaIcon t={lead.temperatura} />
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                      {lead.nome}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {lead.telefone || lead.email || '—'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '99px',
                      color: sc.color,
                      background: sc.bg,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sc.label}
                  </span>
                  {lead.orcamento_estimado && (
                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.85rem' }}>
                      {fmtCurrency(lead.orcamento_estimado)}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setEditTarget(lead);
                        setShowModal(true);
                      }}
                      style={{
                        ...btnBase,
                        background: '#f8fafc',
                        color: '#475569',
                        padding: '6px 10px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(lead.id)}
                      style={{
                        ...btnBase,
                        background: '#fef2f2',
                        color: '#ef4444',
                        padding: '6px 10px',
                        border: '1px solid #fecaca',
                      }}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
