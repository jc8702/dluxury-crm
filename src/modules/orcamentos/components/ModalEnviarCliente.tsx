import React, { useState } from 'react';
import { Modal, Button } from '@/design-system/components';
import { Save, Send, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export function ModalEnviarCliente({ isOpen, onClose, orcamento, onSave }: { 
    isOpen: boolean, 
    onClose: () => void, 
    orcamento: any,
    onSave: () => Promise<void>
}) {
    const [step, setStep] = useState<'save' | 'method'>('save');
    const [method, setMethod] = useState<'email' | 'whatsapp'>('whatsapp');
    const [loading, setLoading] = useState(false);

    const handleSaveAndContinue = async () => {
        setLoading(true);
        try {
            await onSave();
            setStep('method');
        } catch (err) {
            alert('Erro ao salvar orçamento antes do envio.');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        setLoading(true);
        try {
            if (method === 'whatsapp') {
                const text = `Olá! Segue o seu orçamento da D'Luxury: ${orcamento.numeroOrcamento}\n\nValor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorTotalVenda)}\n\nVisualizar: ${window.location.origin}/orcamentos/view?id=${orcamento.id}`;
                const phone = orcamento.cliente?.telefone || '';
                window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
            } else {
                // Simulação de envio de email
                alert('Funcionalidade de e-mail em fase de homologação. O orçamento foi marcado como enviado.');
            }
            
            // Marcar como enviado no banco
            await api.orcamentosPro.update(orcamento.id, { status: 'ENVIADO' });
            
            onClose();
            alert('Orçamento processado com sucesso!');
        } catch (err) {
            alert('Erro ao enviar orçamento.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enviar para Cliente" size="md">
            <div className="py-6">
                {step === 'save' ? (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-orange-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Save className="w-10 h-10 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white mb-2 italic">SALVAR E PROSSEGUIR?</h3>
                            <p className="text-zinc-500">Recomendamos salvar o estado atual do orçamento para que o cliente receba a versão mais recente.</p>
                        </div>
                        <Button 
                            className="w-full bg-orange-600 hover:bg-orange-700 h-14 font-black"
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
                                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${method === 'whatsapp' ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-900 bg-zinc-950 hover:border-zinc-700'}`}
                            >
                                <MessageSquare className={`w-8 h-8 ${method === 'whatsapp' ? 'text-orange-500' : 'text-zinc-600'}`} />
                                <span className="font-black text-xs uppercase tracking-widest">WhatsApp</span>
                            </button>
                            <button 
                                onClick={() => setMethod('email')}
                                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${method === 'email' ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-900 bg-zinc-950 hover:border-zinc-700'}`}
                            >
                                <Mail className={`w-8 h-8 ${method === 'email' ? 'text-orange-500' : 'text-zinc-600'}`} />
                                <span className="font-black text-xs uppercase tracking-widest">E-mail</span>
                            </button>
                        </div>

                        <div className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800">
                            <div className="flex items-center gap-4 mb-4">
                                <CheckCircle2 className="w-5 h-5 text-orange-500" />
                                <span className="font-black text-xs uppercase tracking-widest text-zinc-400">Resumo do Envio</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-600">Cliente:</span>
                                    <span className="text-white font-bold">{orcamento.cliente?.nome || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-600">Valor Final:</span>
                                    <span className="text-orange-500 font-black">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorTotalVenda)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Button 
                            className="w-full bg-orange-600 hover:bg-orange-700 h-14 font-black"
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
