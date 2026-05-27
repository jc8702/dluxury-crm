import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Signature, 
  Send, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  History
} from 'lucide-react';
import { contratoDigitalService } from '../../services/contratoDigitalService';
import type { ContratoDigital, HistoricoAssinatura } from '../../services/contratoDigitalService';

interface Props {
  orcamentoId: string;
  numeroOrcamento: string;
  onClose: () => void;
  onStatusChanged?: (novoStatus: string) => void;
}

export default function ContratoDigitalModal({ orcamentoId, numeroOrcamento, onClose, onStatusChanged }: Props) {
  const [contrato, setContrato] = useState<ContratoDigital | null>(null);
  const [historico, setHistorico] = useState<HistoricoAssinatura[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    carregarContrato();
  }, [orcamentoId]);

  const carregarContrato = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await contratoDigitalService.getStatus(orcamentoId);
      if (res.success) {
        setContrato(res.contrato);
        setHistorico(res.historico || []);
      }
    } catch (e: any) {
      console.error(e);
      setError('Erro ao carregar dados do contrato.');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarContrato = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await contratoDigitalService.gerarEEnviar(orcamentoId);
      if (res.success) {
        await carregarContrato();
        if (onStatusChanged) onStatusChanged('enviado');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao gerar contrato digital.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSimularAssinatura = async () => {
    if (!contrato) return;
    setSimulating(true);
    setError('');
    try {
      const res = await contratoDigitalService.webhookAssinaturaMock(contrato.idAssinaturaExterna, 'completed');
      if (res.success) {
        await carregarContrato();
        if (onStatusChanged) onStatusChanged('APROVADO');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao simular webhook de assinatura.');
    } finally {
      setSimulating(false);
    }
  };

  const formatarAcaoHistorico = (acao: string) => {
    const map: Record<string, string> = {
      'contrato_gerado': 'Contrato Gerado',
      'enviado_para_assinatura': 'Enviado para Assinatura',
      'assinado': 'Assinado Eletronicamente',
      'rejeitado': 'Assinatura Rejeitada'
    };
    return map[acao] || acao;
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-w-xl w-full relative">
        {/* Fechar */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-white transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
            <Signature size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Assinatura Digital de Contrato</h2>
            <p className="text-zinc-500 text-xs">Orçamento Ref: <strong>{numeroOrcamento}</strong></p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-zinc-500">
            <RefreshCw className="animate-spin mx-auto mb-2 text-zinc-400" size={24} />
            <span>Consultando status do documento...</span>
          </div>
        ) : !contrato ? (
          /* Estado 1: Contrato Não Gerado */
          <div className="text-center py-8 space-y-4">
            <FileText size={48} className="text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-white font-bold mb-1">Nenhum contrato ativo para este orçamento</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Você pode gerar o contrato de prestação de serviços com os itens e valores preenchidos automaticamente.
              </p>
            </div>

            <button
              onClick={handleGerarContrato}
              disabled={generating}
              className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {generating ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Emitindo contrato...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Gerar e Enviar para Assinatura
                </>
              )}
            </button>
          </div>
        ) : (
          /* Estado 2: Contrato Gerado e Pendente ou Assinado */
          <div className="space-y-6">
            {/* Box de Status do Contrato */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              contrato.statusAssinatura === 'assinado'
                ? 'bg-green-950/20 border-green-500/20 text-green-400'
                : 'bg-yellow-950/10 border-yellow-500/20 text-yellow-400'
            }`}>
              <div className="flex items-center gap-3">
                {contrato.statusAssinatura === 'assinado' ? (
                  <CheckCircle size={24} />
                ) : (
                  <Clock size={24} className="animate-pulse" />
                )}
                <div>
                  <span className="text-xs uppercase font-semibold block text-zinc-500">Status da Assinatura</span>
                  <strong className="text-white text-sm">
                    {contrato.statusAssinatura === 'assinado' ? 'Totalmente Assinado' : 'Aguardando Assinatura'}
                  </strong>
                </div>
              </div>

              <span className="text-xs font-mono text-zinc-500">
                {contrato.numeroContrato}
              </span>
            </div>

            {/* Informações de Envio e Assinatura */}
            <div className="bg-zinc-900/50 border border-zinc-850 p-4 rounded-xl space-y-3 text-sm text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Cliente Signatário:</span>
                <span className="font-semibold text-white">{contrato.clienteNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Documento do Cliente:</span>
                <span className="font-mono text-zinc-300">{contrato.clienteCpfCnpj || 'Não cadastrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Data de Envio:</span>
                <span className="text-zinc-300">{new Date(contrato.dataSolicitacaoAssinatura).toLocaleString('pt-BR')}</span>
              </div>

              {contrato.statusAssinatura === 'assinado' && (
                <div className="border-t border-zinc-800/80 pt-3 mt-2 space-y-3">
                  <div className="flex justify-between text-green-400">
                    <span className="flex items-center gap-1"><ShieldCheck size={16} /> Validade Jurídica:</span>
                    <span className="font-semibold">ICP-Brasil / MP 2200-2</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Hash de Integridade:</span>
                    <span className="font-mono text-zinc-400 select-all">{contrato.hashDocumento?.substring(0,24)}...</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Validade do Certificado:</span>
                    <span>{contrato.certificadoValidade ? new Date(contrato.certificadoValidade).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ações conforme o Status */}
            {contrato.statusAssinatura === 'pendente' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <a
                    href={contrato.urlAssinatura}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 transition text-sm"
                  >
                    Abrir Link DocuSign
                    <ExternalLink size={16} />
                  </a>

                  <button
                    onClick={handleSimularAssinatura}
                    disabled={simulating}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg transition disabled:opacity-50 text-sm"
                  >
                    {simulating ? 'Processando...' : 'Simular Assinatura'}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 text-center">
                  * A simulação dispara o webhook de aprovação, gerando a OP e atualizando o orçamento.
                </p>
              </div>
            )}

            {contrato.statusAssinatura === 'assinado' && (
              <a
                href={contrato.documentoAssinadoUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Download do PDF assinado iniciado (Simulação).');
                }}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 transition text-sm"
              >
                Visualizar PDF Assinado
                <ExternalLink size={16} />
              </a>
            )}

            {/* Histórico do Contrato */}
            {historico.length > 0 && (
              <div>
                <h3 className="font-bold text-white text-xs mb-2 flex items-center gap-1.5 text-zinc-400">
                  <History size={14} />
                  LOGS DE AUDITORIA DO CONTRATO
                </h3>
                <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 text-xs">
                  {historico.map(log => (
                    <div key={log.id} className="flex justify-between items-start text-zinc-400 pb-1 border-b border-zinc-900 last:border-0">
                      <div>
                        <strong className="text-zinc-300">{formatarAcaoHistorico(log.acao)}</strong>
                        <span className="block text-[10px] text-zinc-500">{log.detalhes}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{new Date(log.timestampAcao).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
