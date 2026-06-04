import React, { useState } from 'react';
import { Modal, Button, Card } from '@/components/ui';
import { Save, Send, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export function ModalEnviarCliente({
  isOpen,
  onClose,
  orcamento,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  orcamento: any;
  onSave: () => Promise<void>;
}) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [step, setStep] = useState<'save' | 'method'>('save');
  const [method, setMethod] = useState<'email' | 'whatsapp'>('whatsapp');
  const [loading, setLoading] = useState(false);

  const handleSaveAndContinue = async () => {
    setLoading(true);
    try {
      await onSave();
      setStep('method');
    } catch {
      toastError('Erro ao salvar orçamento antes do envio.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const linkData = await api.aprovacao.gerarLink(orcamento.id);
      const urlAprovacao =
        linkData.url_aprovacao || `${window.location.origin}/#/aprovar/${linkData.token_aprovacao}`;

      if (method === 'whatsapp') {
        const urlPdf = `${window.location.origin}/api/orcamentos/export-pdf?id=${orcamento.id}`;
        const text = `Olá! Segue a proposta comercial D'Luxury para o seu projeto: ${orcamento.numeroOrcamento || orcamento.numero}\n\nValor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorTotalVenda)}\n\nBaixar PDF da Proposta: ${urlPdf}\n\nVisualizar e Assinar Proposta: ${urlAprovacao}`;
        const phone = orcamento.cliente?.telefone || '';
        window.open(
          `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`,
          '_blank',
        );
      } else {
        toastSuccess('E-mail em homologação', `Link de aprovação gerado: ${urlAprovacao}`);
      }

      onClose();
      toastSuccess('Orçamento processado com sucesso!');
    } catch (err: any) {
      toastError(err.message || 'Erro ao enviar orçamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Enviar para Cliente"
      size="md"
    >
      {step === 'save' ? (
        <div className="text-center py-2 space-y-6">
          <div className="w-16 h-16 bg-[var(--ui-color-teal-50)] rounded-[var(--ui-radius-lg)] flex items-center justify-center mx-auto">
            <Save size={32} className="text-[var(--ui-color-teal-500)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--ui-text-primary)] mb-2">
              Salvar e prosseguir?
            </h3>
            <p className="text-[var(--ui-text-secondary)] text-sm">
              Recomendamos salvar o estado atual do orçamento para que o cliente receba a versão
              mais recente.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            block
            onClick={handleSaveAndContinue}
            isLoading={loading}
          >
            SALVAR E CONTINUAR
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('whatsapp')}
              className={`p-5 rounded-[var(--ui-radius-lg)] border-2 transition-colors flex flex-col items-center gap-3 ${
                method === 'whatsapp'
                  ? 'border-[var(--ui-color-teal-500)] bg-[var(--ui-color-teal-50)] text-[var(--ui-color-teal-700)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-color-teal-500)]/50'
              }`}
            >
              <MessageSquare
                size={28}
                className={method === 'whatsapp' ? 'text-[var(--ui-color-teal-500)]' : ''}
              />
              <span className="font-semibold text-xs uppercase tracking-wide">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`p-5 rounded-[var(--ui-radius-lg)] border-2 transition-colors flex flex-col items-center gap-3 ${
                method === 'email'
                  ? 'border-[var(--ui-color-teal-500)] bg-[var(--ui-color-teal-50)] text-[var(--ui-color-teal-700)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text-secondary)] hover:border-[var(--ui-color-teal-500)]/50'
              }`}
            >
              <Mail
                size={28}
                className={method === 'email' ? 'text-[var(--ui-color-teal-500)]' : ''}
              />
              <span className="font-semibold text-xs uppercase tracking-wide">E-mail</span>
            </button>
          </div>

          <Card padding="md" variant="outlined">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 size={18} className="text-[var(--ui-color-teal-500)]" />
              <span className="font-semibold text-xs uppercase tracking-wide text-[var(--ui-text-secondary)]">
                Resumo do Envio
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--ui-text-secondary)]">Cliente:</span>
                <span className="text-[var(--ui-text-primary)] font-semibold">
                  {orcamento.cliente?.nome || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ui-text-secondary)]">Valor Final:</span>
                <span className="text-[var(--ui-color-teal-700)] font-semibold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    orcamento.valorTotalVenda,
                  )}
                </span>
              </div>
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            block
            leftIcon={<Send size={18} />}
            onClick={handleSend}
            isLoading={loading}
          >
            CONFIRMAR ENVIO
          </Button>
        </div>
      )}
    </Modal>
  );
}
