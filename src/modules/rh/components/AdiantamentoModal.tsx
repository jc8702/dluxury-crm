import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { api } from '../../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  colaboradores: any[];
  onCreated?: () => void;
}

export function AdiantamentoModal({ isOpen, onClose, colaboradores, onCreated }: Props) {
  const [form, setForm] = useState<any>({
    colaborador_id: '',
    valor: '',
    data: new Date().toISOString().slice(0, 10),
    competencia_desconto: new Date().toISOString().slice(0, 7),
    observacao: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ limite: number; usado: number; disponivel: number } | null>(
    null,
  );

  const selected = colaboradores.find((c) => c.id === form.colaborador_id);

  const competencia = form.competencia_desconto;

  useEffect(() => {
    if (!selected || !competencia) {
      setInfo(null);
      return;
    }
    const salario = Number(selected.salario_base);
    const limite = salario * 0.5;
    // fetch usados
    api.rh.adiantamentos
      .list({ competencia, status: 'pendente' })
      .then((rows) => {
        const usados = (rows as any[])
          .filter((r) => r.colaborador_id === selected.id)
          .reduce((s, r) => s + Number(r.valor), 0);
        setInfo({ limite, usado: usados, disponivel: limite - usados });
      })
      .catch(() => setInfo({ limite, usado: 0, disponivel: limite }));
  }, [selected, competencia]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.colaborador_id) {
      setError('Selecione colaborador');
      return;
    }
    const valor = Number(form.valor);
    if (!valor || valor <= 0) {
      setError('Valor deve ser >0');
      return;
    }
    if (info && valor > info.disponivel) {
      setError(
        `Limite excedido. Disponível R$ ${info.disponivel.toFixed(2)} de R$ ${info.limite.toFixed(2)} (50% de R$ ${Number(selected.salario_base).toFixed(2)}). Usado R$ ${info.usado.toFixed(2)}.`,
      );
      return;
    }
    setLoading(true);
    try {
      await api.rh.adiantamentos.create({
        colaborador_id: form.colaborador_id,
        valor,
        data: form.data,
        competencia_desconto: form.competencia_desconto,
        observacao: form.observacao || null,
      });
      onCreated?.();
      onClose();
      setForm({
        colaborador_id: '',
        valor: '',
        data: new Date().toISOString().slice(0, 10),
        competencia_desconto: new Date().toISOString().slice(0, 7),
        observacao: '',
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar');
    } finally {
      setLoading(false);
    }
  };

  const pct = info ? Math.min(100, (info.usado / info.limite) * 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Adiantamento / Vale" size="md">
      <form onSubmit={submit} className="space-y-4" data-testid="adiantamento-form">
        {error && (
          <div
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            data-testid="form-error"
          >
            {error}
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-medium">Colaborador *</label>
          <select
            value={form.colaborador_id}
            onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })}
            className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm"
            data-testid="select-colaborador"
          >
            <option value="">Selecione</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — R$ {Number(c.salario_base).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valor (R$) *"
            type="number"
            step="0.01"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            placeholder="600"
            data-testid="input-valor"
          />
          <Input
            label="Data *"
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            data-testid="input-data"
          />
        </div>
        <Input
          label="Competência Desconto * (YYYY-MM)"
          value={form.competencia_desconto}
          onChange={(e) => setForm({ ...form, competencia_desconto: e.target.value })}
          placeholder="2026-09"
          data-testid="input-competencia"
        />
        <Input
          label="Observação"
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
          placeholder="Vale adiantamento"
          data-testid="input-obs"
        />

        {selected && info && (
          <div
            className="p-3 rounded-xl bg-muted border border-border space-y-2"
            data-testid="barra-limite"
          >
            <div className="flex justify-between text-xs">
              <span>
                Usado R$ {info.usado.toFixed(2)} / Limite R$ {info.limite.toFixed(2)} (50% de R${' '}
                {Number(selected.salario_base).toFixed(2)})
              </span>
              <span
                className={
                  info.disponivel < 0 ? 'text-destructive font-bold' : 'text-muted-foreground'
                }
              >
                Disponível R$ {info.disponivel.toFixed(2)}
              </span>
            </div>
            <div className="h-2 w-full bg-background rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {info.disponivel < 0 && (
              <div className="text-xs text-destructive">Limite excedido!</div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} data-testid="btn-cancel">
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading} data-testid="btn-salvar-adiantamento">
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
