import React, { useState } from 'react';
import { Modal, Button } from '@/components/common';
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
      // Gerar token e URL de aprovação no backend (muda o status para 'enviado' e retorna a url)
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
        // Simulação de envio de email
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
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar para Cliente" size="md">
      <div className="py-6">
        {step === 'save' ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Save className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground mb-2 italic">
                SALVAR E PROSSEGUIR?
              </h3>
              <p className="text-muted-foreground">
                Recomendamos salvar o estado atual do orçamento para que o cliente receba a versão
                mais recente.
              </p>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-hover h-14 font-black text-primary-foreground"
              onClick={handleSaveAndContinue}
              disabled={loading}
            >
              {loading ? 'Sincronizando...' : 'SALVAR E CONTINUAR'}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMethod('whatsapp')}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 cursor-pointer ${method === 'whatsapp' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}
              >
                <MessageSquare
                  className={`w-8 h-8 ${method === 'whatsapp' ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className="font-black text-xs uppercase tracking-widest">WhatsApp</span>
              </button>
              <button
                onClick={() => setMethod('email')}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 cursor-pointer ${method === 'email' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}
              >
                <Mail
                  className={`w-8 h-8 ${method === 'email' ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className="font-black text-xs uppercase tracking-widest">E-mail</span>
              </button>
            </div>

            <div className="bg-muted/20 p-6 rounded-3xl border border-border">
              <div className="flex items-center gap-4 mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                  Resumo do Envio
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="text-foreground font-bold">
                    {orcamento.cliente?.nome || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Final:</span>
                  <span className="text-primary font-black">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      orcamento.valorTotalVenda,
                    )}
                  </span>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary-hover h-14 font-black text-primary-foreground"
              onClick={handleSend}
              disabled={loading}
            >
              <Send className="w-5 h-5 mr-2" /> {loading ? 'ENVIANDO...' : 'CONFIRMAR ENVIO'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
