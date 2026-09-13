import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initial?: any | null;
}

export function ColaboradorForm({ isOpen, onClose, onSubmit, initial }: Props) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<any>({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    tipo: 'colaborador_fixo',
    vinculo: 'informal',
    cargo: '',
    salario_base: '',
    participacao_lucros: '0',
    chave_pix: '',
    data_admissao: '',
    ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        nome: initial.nome || '',
        cpf: initial.cpf || '',
        telefone: initial.telefone || '',
        email: initial.email || '',
        tipo: initial.tipo || 'colaborador_fixo',
        vinculo: initial.vinculo || 'informal',
        cargo: initial.cargo || '',
        salario_base: initial.salario_base || '',
        participacao_lucros: initial.participacao_lucros || '0',
        chave_pix: initial.chave_pix || '',
        data_admissao: initial.data_admissao ? String(initial.data_admissao).slice(0, 10) : '',
        ativo: initial.ativo ?? true,
      });
    } else {
      setForm({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        tipo: 'colaborador_fixo',
        vinculo: 'informal',
        cargo: '',
        salario_base: '',
        participacao_lucros: '0',
        chave_pix: '',
        data_admissao: '',
        ativo: true,
      });
    }
    setError(null);
  }, [initial, isOpen]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.nome || form.nome.trim().length < 2) {
      setError('Nome obrigatório (mín 2 chars)');
      return;
    }
    const salario = Number(form.salario_base);
    if (!salario || salario <= 0) {
      setError('Salário deve ser >0');
      return;
    }
    const part = Number(form.participacao_lucros || 0);
    if (part < 0 || part > 100) {
      setError('Participação 0-100');
      return;
    }
    if (!['socio', 'colaborador_fixo'].includes(form.tipo)) {
      setError('Tipo inválido');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        nome: form.nome.trim(),
        cpf: form.cpf || null,
        telefone: form.telefone || null,
        email: form.email || null,
        tipo: form.tipo,
        vinculo: form.vinculo,
        cargo: form.cargo || null,
        salario_base: salario,
        participacao_lucros: part,
        chave_pix: form.chave_pix || null,
        data_admissao: form.data_admissao || null,
        ativo: !!form.ativo,
      };
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}
      size="lg"
    >
      <form onSubmit={handle} className="space-y-4" data-testid="colaborador-form">
        {error && (
          <div
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            data-testid="form-error"
          >
            {error}
          </div>
        )}
        <Input
          label="Nome *"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Ex: João Silva"
          data-testid="input-nome"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="CPF"
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            placeholder="000.000.000-00"
            data-testid="input-cpf"
          />
          <Input
            label="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            placeholder="(11) 99999-0000"
            data-testid="input-telefone"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@ex.com"
            data-testid="input-email"
          />
          <Input
            label="Chave PIX"
            value={form.chave_pix}
            onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
            placeholder="CPF, telefone ou aleatória"
            data-testid="input-pix"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm"
              data-testid="select-tipo"
            >
              <option value="colaborador_fixo">Colaborador Fixo</option>
              <option value="socio">Sócio</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/90">Vínculo</label>
            <select
              value={form.vinculo}
              onChange={(e) => setForm({ ...form, vinculo: e.target.value })}
              className="flex w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm"
              data-testid="select-vinculo"
            >
              <option value="informal">Informal</option>
              <option value="mei">MEI</option>
              <option value="clt">CLT</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cargo"
            value={form.cargo}
            onChange={(e) => setForm({ ...form, cargo: e.target.value })}
            placeholder="Marceneiro, Ajudante, Sócio"
            data-testid="input-cargo"
          />
          <Input
            label="Data Admissão"
            type="date"
            value={form.data_admissao}
            onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
            data-testid="input-admissao"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Salário Base (R$) *"
            type="number"
            step="0.01"
            min="0"
            value={form.salario_base}
            onChange={(e) => setForm({ ...form, salario_base: e.target.value })}
            placeholder="3000"
            data-testid="input-salario"
          />
          {form.tipo === 'socio' && (
            <Input
              label="Participação Lucros (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.participacao_lucros}
              onChange={(e) => setForm({ ...form, participacao_lucros: e.target.value })}
              placeholder="50"
              data-testid="input-participacao"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            id="ativo"
            data-testid="input-ativo"
          />
          <label htmlFor="ativo" className="text-sm">
            Ativo
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} data-testid="btn-cancel">
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading} data-testid="btn-salvar">
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
