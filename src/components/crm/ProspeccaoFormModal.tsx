import { useState } from 'react';
import { STATUS_CONFIG, ORIGENS } from '../../hooks/crm/useProspeccaoFilters';
import type { Prospeccao } from '../../hooks/crm/useProspeccaoHook';

interface Props {
  initial?: Prospeccao | null;
  onClose: () => void;
  onSave: (data: Partial<Prospeccao>) => Promise<void>;
}

export function ProspeccaoFormModal({ initial, onClose, onSave }: Props) {
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
                placeholder="Ex: Cozinha planejada + home office"
              />
            </div>
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
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {saving ? 'Salvando...' : initial ? 'Atualizar' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
