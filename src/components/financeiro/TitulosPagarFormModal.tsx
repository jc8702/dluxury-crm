import { Modal, Button, Input } from '../common';
import { Layers } from 'lucide-react';
import type { Titulo, ContaInterna } from '../../modules/financeiro/domain/types';

interface BaixaProps {
  baixaModal: any;
  contas: ContaInterna[];
  onClose: () => void;
  onConfirm: () => void;
}

interface EditProps {
  editModal: any;
  onClose: () => void;
  onChange: (r: any) => void;
  onSave: () => void;
}

interface LoteProps {
  loteModal: boolean;
  loteData: any;
  loteLoading: boolean;
  selectedCount: number;
  contas: ContaInterna[];
  onClose: () => void;
  onDataChange: (d: any) => void;
  onConfirm: () => void;
}

export function BaixaModal({ baixaModal, contas, onClose, onConfirm }: BaixaProps) {
  if (!baixaModal) return null;
  const hoje = new Date();
  const venc = new Date(baixaModal.data_vencimento);
  const atraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)));
  const valorAberto = Number(baixaModal.valor_aberto || 0);
  const multaPerc = atraso > 0 ? 0.02 : 0;
  const jurosDiarioPerc = 0.00033;
  const valorMulta = valorAberto * multaPerc;
  const valorJuros = valorAberto * jurosDiarioPerc * atraso;
  const valorTotal = valorAberto + valorMulta + valorJuros;

  return (
    <Modal open={!!baixaModal} onClose={onClose} title="Registrar Pagamento Industrial">
      <div className="min-w-[450px] p-2">
        <div className="space-y-6">
          <div className="glass-elevated p-6 rounded-xl space-y-3 bg-red-500/5 border border-red-500/20">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Valor Original
              </span>
              <span className="font-bold text-white italic text-lg tracking-tighter">
                R$ {valorAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {atraso > 0 && (
              <>
                <div className="flex justify-between items-center text-red-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Multa (2% - {atraso} dias)
                  </span>
                  <span className="font-bold italic">
                    + R$ {valorMulta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-red-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Juros (1%/mês)
                  </span>
                  <span className="font-bold italic">
                    + R$ {valorJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}
            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
              <span className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em]">
                Total a Debitar
              </span>
              <span className="text-3xl font-black text-red-500 italic tracking-tighter">
                R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">
              Conta Bancária / Débito
            </label>
            <select id="conta-interna-id-pagar" className="input-base">
              <option value="">Selecione a conta de origem...</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome.toUpperCase()} - DISPONÍVEL: R${' '}
                  {Number(c.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              size="md"
              className="uppercase font-black italic text-xs tracking-widest text-white border-white/20 hover:bg-white/10"
              onClick={onClose}
            >
              CANCELAR
            </Button>
            <Button
              variant="danger"
              size="md"
              className="uppercase font-black italic text-xs tracking-widest bg-red-600 border-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20 text-white"
              onClick={onConfirm}
            >
              CONFIRMAR PAGAMENTO
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function EditTituloModal({ editModal, onClose, onChange, onSave }: EditProps) {
  return (
    <Modal
      open={!!editModal}
      onClose={onClose}
      title="Manutenção de Compromisso Industrial"
      size="lg"
    >
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Número do Título"
            type="text"
            className="font-mono font-bold"
            value={editModal?.numero_titulo || ''}
            onChange={(e) => editModal && onChange({ ...editModal, numero_titulo: e.target.value })}
          />
          <div className="space-y-2">
            <label className="mb-2 block text-sm font-medium text-foreground/90 uppercase tracking-widest text-muted-foreground text-[10px] ml-1">
              Status Operacional
            </label>
            <select
              className="input-base uppercase font-bold"
              value={editModal?.status || ''}
              onChange={(e) =>
                editModal && onChange({ ...editModal, status: e.target.value as any })
              }
            >
              <option value="aberto">ABERTO / PENDENTE</option>
              <option value="pago">PAGO / LIQUIDADO</option>
              <option value="cancelado">CANCELADO</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Valor Original (R$)"
            type="number"
            className="font-bold italic"
            value={editModal?.valor_original || 0}
            onChange={(e) =>
              editModal && onChange({ ...editModal, valor_original: Number(e.target.value) })
            }
          />
          <Input
            label="Data de Vencimento"
            type="date"
            className="font-bold"
            value={
              editModal?.data_vencimento
                ? new Date(editModal.data_vencimento).toISOString().split('T')[0]
                : ''
            }
            onChange={(e) =>
              editModal && onChange({ ...editModal, data_vencimento: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Taxa Financeira (%)"
            type="number"
            value={editModal?.taxa_financeira || 0}
            onChange={(e) =>
              editModal && onChange({ ...editModal, taxa_financeira: Number(e.target.value) })
            }
          />
          <Input
            label="Custo Financeiro (R$)"
            type="number"
            value={editModal?.valor_custo_financeiro || 0}
            onChange={(e) =>
              editModal &&
              onChange({ ...editModal, valor_custo_financeiro: Number(e.target.value) })
            }
          />
        </div>
        <div className="flex gap-4 justify-end pt-6 border-t border-white/5">
          <Button
            variant="outline"
            size="md"
            className="uppercase font-black italic text-xs tracking-widest text-white border-white/20 hover:bg-white/10"
            onClick={onClose}
          >
            CANCELAR
          </Button>
          <Button
            variant="danger"
            size="md"
            className="uppercase font-black italic text-xs tracking-widest bg-red-600 border-red-600 hover:bg-red-700 text-white"
            onClick={onSave}
          >
            SALVAR ALTERAÇÕES
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function LoteModal({
  loteModal,
  loteData,
  loteLoading,
  selectedCount,
  contas,
  onClose,
  onDataChange,
  onConfirm,
}: LoteProps) {
  return (
    <Modal
      open={loteModal}
      onClose={onClose}
      title={`Liquidação em Lote (${selectedCount} Títulos)`}
    >
      <div className="p-2 space-y-6">
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-400 uppercase tracking-wider italic flex items-center gap-3">
          <Layers className="w-5 h-5" /> Atenção: Os {selectedCount} títulos selecionados serão
          baixados pelo valor nominal.
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">
              Conta Bancária Corporativa *
            </label>
            <select
              className="input-base uppercase font-bold"
              value={loteData.conta_interna_id}
              onChange={(e) => onDataChange({ ...loteData, conta_interna_id: e.target.value })}
            >
              <option value="">Selecione a conta para débito...</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome.toUpperCase()} — R${' '}
                  {Number(c.saldo_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">
                Data da Liquidação
              </label>
              <input
                type="date"
                className="input-base font-bold"
                value={loteData.data_baixa}
                onChange={(e) => onDataChange({ ...loteData, data_baixa: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block ml-1">
                Observação Interna
              </label>
              <input
                type="text"
                className="input-base"
                placeholder="Motivo da baixa em lote..."
                value={loteData.observacoes}
                onChange={(e) => onDataChange({ ...loteData, observacoes: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-4 justify-end pt-4 border-t border-white/5">
          <Button
            variant="outline"
            size="md"
            className="uppercase font-black italic text-xs tracking-widest"
            onClick={onClose}
          >
            CANCELAR
          </Button>
          <Button
            variant="primary"
            size="md"
            className="uppercase font-black italic text-xs tracking-widest bg-orange-600 border-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-900/20 text-white"
            onClick={onConfirm}
            isLoading={loteLoading}
          >
            CONFIRMAR PAGAMENTO EM MASSA
          </Button>
        </div>
      </div>
    </Modal>
  );
}
