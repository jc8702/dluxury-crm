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
  History,
} from 'lucide-react';
import { contratoDigitalService } from '../../services/contratoDigitalService';
import type { ContratoDigital, HistoricoAssinatura } from '../../services/contratoDigitalService';
import { api } from '../../lib/api';

interface Props {
  orcamentoId: string;
  numeroOrcamento: string;
  onClose: () => void;
  onStatusChanged?: (novoStatus: string) => void;
}

export default function ContratoDigitalModal({
  orcamentoId: propOrcamentoId,
  numeroOrcamento: propNumeroOrcamento,
  onClose,
  onStatusChanged,
}: Props) {
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState(propOrcamentoId);
  const [selectedNumeroOrcamento, setSelectedNumeroOrcamento] = useState(propNumeroOrcamento);
  const [orcamentosList, setOrcamentosList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedOrcamentoDet, setSelectedOrcamentoDet] = useState<any>(null);

  const [contrato, setContrato] = useState<ContratoDigital | null>(null);
  const [historico, setHistorico] = useState<HistoricoAssinatura[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');

  const normalizarOrcamento = (orc: any) => {
    if (!orc) return null;
    const clienteId = orc.clienteId || orc.cliente_id;
    const cliente =
      orc.cliente || clientsList.find((c) => String(c.id) === String(clienteId)) || null;
    return {
      ...orc,
      id: orc.id,
      clienteId,
      cliente,
      numeroOrcamento: orc.numeroOrcamento || orc.numero || '',
      valorTotalVenda: Number(orc.valorTotalVenda || orc.valor_final || orc.valor_base || 0),
      prazoEntregaDias: orc.prazoEntregaDias || orc.prazo_entrega_dias || 45,
    };
  };

  const orcDetNorm = selectedOrcamentoDet ? normalizarOrcamento(selectedOrcamentoDet) : null;

  useEffect(() => {
    if (selectedOrcamentoId) {
      carregarContrato(selectedOrcamentoId);
    }
  }, [selectedOrcamentoId]);

  useEffect(() => {
    Promise.all([api.quotations.list().catch(() => []), api.clients.list().catch(() => [])])
      .then(([quotations, clientes]) => {
        setClientsList(clientes || []);
        setOrcamentosList(quotations || []);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados do modal de contrato:', err);
      });
  }, []);

  const carregarContrato = async (id: string) => {
    setLoading(true);
    setError('');
    setSelectedOrcamentoDet(null);
    try {
      const res = await contratoDigitalService.getStatus(id);
      if (res.success) {
        setContrato(res.contrato);
        setHistorico(res.historico || []);

        if (!res.contrato) {
          const orcDet = await api.quotations.get(id).catch(() => null);
          setSelectedOrcamentoDet(orcDet);
        }
      }
    } catch (e: any) {
      console.error(e);
      setError('Erro ao carregar dados do contrato.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrcamentoChange = (id: string) => {
    setSelectedOrcamentoId(id);
    const selected = orcamentosList.find((o) => o.id === id);
    if (selected) {
      setSelectedNumeroOrcamento(selected.numeroOrcamento || selected.numero || '');
    }
  };

  const handleGerarContrato = async () => {
    if (!selectedOrcamentoId) return setError('Selecione um orçamento de referência.');

    const orcRaw =
      selectedOrcamentoDet || (await api.quotations.get(selectedOrcamentoId).catch(() => null));
    const orcVal = normalizarOrcamento(orcRaw);
    if (!orcVal || !orcVal.clienteId) {
      setError(
        'O orçamento selecionado não possui cliente associado. Por favor, associe um cliente ao orçamento antes de gerar o contrato.',
      );
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await contratoDigitalService.gerarEEnviar(selectedOrcamentoId);
      if (res.success) {
        await carregarContrato(selectedOrcamentoId);
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
      const res = await contratoDigitalService.webhookAssinaturaMock(
        contrato.idAssinaturaExterna,
        'completed',
      );
      if (res.success) {
        await carregarContrato(selectedOrcamentoId);
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
      contrato_gerado: 'Contrato Gerado',
      enviado_para_assinatura: 'Enviado para Assinatura',
      assinado: 'Assinado Eletronicamente',
      rejeitado: 'Assinatura Rejeitada',
    };
    return map[acao] || acao;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl w-full relative">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="bg-blue-500/10 text-blue-500 dark:text-blue-400 p-2 rounded-lg">
            <Signature size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Assinatura Digital de Contrato</h2>
            <p className="text-muted-foreground text-xs">
              Orçamento Ref: <strong className="text-foreground">{selectedNumeroOrcamento}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm p-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="animate-spin mx-auto mb-2 text-muted-foreground/80" size={24} />
            <span>Consultando status do documento...</span>
          </div>
        ) : !contrato ? (
          /* Estado 1: Contrato Não Gerado */
          <div className="text-center py-6 space-y-4">
            <FileText size={44} className="text-muted-foreground mx-auto" />

            {/* Seletor de Orçamento */}
            <div className="text-left max-w-sm mx-auto space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                Selecione o Orçamento de Referência
              </label>
              <select
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all cursor-pointer font-bold"
                value={selectedOrcamentoId}
                onChange={(e) => handleOrcamentoChange(e.target.value)}
              >
                <option value="">Selecione...</option>
                {orcamentosList.map((o) => {
                  const oNorm = normalizarOrcamento(o);
                  if (!oNorm) return null;
                  return (
                    <option key={oNorm.id} value={oNorm.id}>
                      {oNorm.numeroOrcamento} - {oNorm.cliente?.nome || 'Sem Cliente'} (
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(oNorm.valorTotalVenda)}
                      )
                    </option>
                  );
                })}
              </select>
            </div>

            {orcDetNorm && (
              <div className="bg-muted/30 border border-border p-4 rounded-xl max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente Signatário:</span>
                  <span className="font-bold text-foreground">
                    {orcDetNorm.cliente?.nome || (
                      <span className="text-red-500 font-bold">⚠️ Sem Cliente Vinculado</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total do Contrato:</span>
                  <span className="font-black text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      orcDetNorm.valorTotalVenda,
                    )}
                  </span>
                </div>
                {!orcDetNorm.clienteId && (
                  <p className="text-red-500 text-[10px] mt-2 font-bold leading-normal">
                    * Vincule um cliente a este orçamento comercial nas configurações comerciais
                    antes de gerar o contrato digital.
                  </p>
                )}
              </div>
            )}

            <div className="pt-2">
              <h3 className="text-foreground font-bold mb-1">
                Nenhum contrato ativo para este orçamento
              </h3>
              <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                Você pode gerar o contrato de prestação de serviços com os itens e valores
                preenchidos automaticamente.
              </p>
            </div>

            <button
              onClick={handleGerarContrato}
              disabled={generating || !selectedOrcamentoId || (orcDetNorm && !orcDetNorm.clienteId)}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2 mx-auto cursor-pointer text-xs"
            >
              {generating ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Emitindo contrato...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Gerar e Enviar para Assinatura
                </>
              )}
            </button>
          </div>
        ) : (
          /* Estado 2: Contrato Gerado e Pendente ou Assinado */
          <div className="space-y-6">
            {/* Box de Status do Contrato */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                contrato.statusAssinatura === 'assinado'
                  ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
              }`}
            >
              <div className="flex items-center gap-3">
                {contrato.statusAssinatura === 'assinado' ? (
                  <CheckCircle size={24} />
                ) : (
                  <Clock size={24} className="animate-pulse" />
                )}
                <div>
                  <span className="text-xs uppercase font-semibold block text-muted-foreground">
                    Status da Assinatura
                  </span>
                  <strong className="text-foreground text-sm">
                    {contrato.statusAssinatura === 'assinado'
                      ? 'Totalmente Assinado'
                      : 'Aguardando Assinatura'}
                  </strong>
                </div>
              </div>

              <span className="text-xs font-mono text-muted-foreground">
                {contrato.numeroContrato}
              </span>
            </div>

            {/* Informações de Envio e Assinatura */}
            <div className="bg-muted/50 border border-border p-4 rounded-xl space-y-3 text-sm text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente Signatário:</span>
                <span className="font-semibold text-foreground">{contrato.clienteNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Documento do Cliente:</span>
                <span className="font-mono text-muted-foreground">
                  {contrato.clienteCpfCnpj || 'Não cadastrado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de Envio:</span>
                <span className="text-muted-foreground">
                  {new Date(contrato.dataSolicitacaoAssinatura).toLocaleString('pt-BR')}
                </span>
              </div>

              {contrato.statusAssinatura === 'assinado' && (
                <div className="border-t border-border pt-3 mt-2 space-y-3">
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={16} /> Validade Jurídica:
                    </span>
                    <span className="font-semibold">ICP-Brasil / MP 2200-2</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Hash de Integridade:</span>
                    <span className="font-mono text-muted-foreground select-all">
                      {contrato.hashDocumento?.substring(0, 24)}...
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Validade do Certificado:</span>
                    <span>
                      {contrato.certificadoValidade
                        ? new Date(contrato.certificadoValidade).toLocaleDateString('pt-BR')
                        : '-'}
                    </span>
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
                    className="flex-1 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 transition text-sm cursor-pointer"
                  >
                    Abrir Link DocuSign
                    <ExternalLink size={16} />
                  </a>

                  <button
                    onClick={handleSimularAssinatura}
                    disabled={simulating}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-lg transition disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {simulating ? 'Processando...' : 'Simular Assinatura'}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  * A simulação dispara o webhook de aprovação, gerando a OP e atualizando o
                  orçamento.
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
                className="w-full py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 transition text-sm cursor-pointer"
              >
                Visualizar PDF Assinado
                <ExternalLink size={16} />
              </a>
            )}

            {/* Histórico do Contrato */}
            {historico.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground text-xs mb-2 flex items-center gap-1.5">
                  <History size={14} className="text-muted-foreground" />
                  LOGS DE AUDITORIA DO CONTRATO
                </h3>
                <div className="bg-muted/50 border border-border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 text-xs">
                  {historico.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between items-start text-muted-foreground pb-1 border-b border-border last:border-0"
                    >
                      <div>
                        <strong className="text-foreground">
                          {formatarAcaoHistorico(log.acao)}
                        </strong>
                        <span className="block text-[10px] text-muted-foreground/80">
                          {log.detalhes}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.timestampAcao).toLocaleString('pt-BR')}
                      </span>
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
