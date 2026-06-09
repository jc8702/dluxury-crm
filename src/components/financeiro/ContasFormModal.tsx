import { Modal, Button, Input } from '../common';
import { ChevronRight } from 'lucide-react';
import type { ContaInterna, TipoContaInterna } from '../../modules/financeiro/domain/types';
import type { ContaForm } from '../../hooks/financeiro/useContasHook';

interface Props {
  isOpen: boolean;
  editing: ContaInterna | null;
  form: ContaForm;
  onClose: () => void;
  onFormChange: (form: ContaForm) => void;
  onSave: () => void;
}

export function ContasFormModal({ isOpen, editing, form, onClose, onFormChange, onSave }: Props) {
  const set = (k: keyof ContaForm, v: any) => onFormChange({ ...form, [k]: v });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={editing ? 'REVISÃO DE CONTA' : 'ABERTURA DE CONTA'}
      size="md"
    >
      <div className="space-y-8 p-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 block italic">
            IDENTIFICAÇÃO OPERACIONAL
          </label>
          <Input
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            placeholder="Ex: ITAÚ EMPRESARIAL"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">
              TIPO DE ATIVO
            </label>
            <div className="relative">
              <select
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary/50 transition-all appearance-none font-bold"
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as TipoContaInterna)}
              >
                <option value="conta_corrente">CONTA CORRENTE</option>
                <option value="poupanca">POUPANÇA</option>
                <option value="caixa">CAIXA INTERNO</option>
                <option value="aplicacao">APLICAÇÃO/INVESTIMENTO</option>
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-primary pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">
              CÓDIGO BANCO
            </label>
            <Input
              className="font-mono"
              value={form.banco_codigo}
              onChange={(e) => set('banco_codigo', e.target.value)}
              placeholder="Ex: 341, 001..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">
              AGÊNCIA
            </label>
            <Input
              className="font-mono"
              placeholder="0001"
              value={form.agencia}
              onChange={(e) => set('agencia', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2 block italic">
              NÚMERO DA CONTA
            </label>
            <Input
              className="font-mono"
              placeholder="12345-6"
              value={form.conta}
              onChange={(e) => set('conta', e.target.value)}
            />
          </div>
        </div>

        {!editing && (
          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block italic text-center">
              APORTE INICIAL DE CAPITAL
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary opacity-50 z-10">
                R$
              </span>
              <Input
                type="number"
                className="pl-14 text-3xl font-mono text-primary italic tracking-tighter"
                value={form.saldo_inicial}
                onChange={(e) => set('saldo_inicial', Number(e.target.value))}
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            className="h-14 font-black italic border-border hover:bg-muted/40"
            onClick={onClose}
          >
            DESCARTAR
          </Button>
          <Button
            variant="primary"
            className="flex-[2] h-14 font-black italic text-lg"
            onClick={onSave}
          >
            FINALIZAR CONFIGURAÇÃO
          </Button>
        </div>
      </div>
    </Modal>
  );
}
