import React, { useState } from 'react';
import { calendarService } from '../../services/calendarService.js';
import type { EventoCalendarioType } from '../../services/calendarService.js';
import {
  X,
  CheckCircle,
  Trash2,
  Calendar,
  Clock,
  Tag,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

interface PopoverEventoProps {
  evento: EventoCalendarioType;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PopoverEvento({ evento, onClose, onUpdate }: PopoverEventoProps) {
  const [loading, setLoading] = useState(false);

  const obterNomeTipo = (tipo: string) => {
    switch (tipo) {
      case 'quotation':
        return 'Proposta / Orçamento';
      case 'prazo_entrega':
        return 'Prazo de Entrega OP';
      case 'lembrete_compra':
        return 'Lembrete de Compra';
      case 'tarefa':
        return 'Tarefa Customizada';
      case 'reuniao':
        return 'Reunião / Visita';
      default:
        return 'Evento Geral';
    }
  };

  const alternarConclusao = async () => {
    setLoading(true);
    try {
      // Como os IDs manuais são prefixados com 'manual-', extraímos o número
      const isManual = evento.id.startsWith('manual-');
      if (!isManual) {
        alert(
          'Este é um evento gerado automaticamente pelo sistema (OP/Orçamento) e não pode ser concluído diretamente por aqui.',
        );
        setLoading(false);
        return;
      }
      const rawId = parseInt(evento.id.replace('manual-', ''), 10);
      await calendarService.updateEvento(rawId, { concluido: !evento.concluido });
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar evento:', err);
      alert(err.message || 'Erro ao atualizar evento.');
    } finally {
      setLoading(false);
    }
  };

  const deletarEvento = async () => {
    if (!confirm('Deseja realmente remover esta tarefa do calendário?')) return;
    setLoading(true);
    try {
      const isManual = evento.id.startsWith('manual-');
      if (!isManual) {
        alert('Eventos de sistema (prazos de OP/Orçamento) não podem ser excluídos manualmente.');
        setLoading(false);
        return;
      }
      const rawId = parseInt(evento.id.replace('manual-', ''), 10);
      await calendarService.deleteEvento(rawId);
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Erro ao deletar evento:', err);
      alert(err.message || 'Erro ao remover evento.');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataStr: string) => {
    const parts = dataStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const isManual = evento.id.startsWith('manual-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-[var(--ui-radius-lg)] border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecalho Colorido */}
        <div className="h-3 w-full" style={{ backgroundColor: evento.cor_categoria }} />

        {/* Header */}
        <div className="flex items-start justify-between p-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                style={{
                  color: evento.cor_categoria,
                  borderColor: `${evento.cor_categoria}40`,
                  backgroundColor: `${evento.cor_categoria}15`,
                }}
              >
                {obterNomeTipo(evento.tipo_evento)}
              </span>
              {evento.concluido && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--ui-color-success-soft)] text-[var(--ui-color-success)] border border-[var(--ui-color-success)]/30">
                  CONCLUÍDO
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-foreground leading-snug">{evento.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2.5 text-xs text-muted-foreground">
            {/* Data e Hora */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground/80">
                Data: {formatarData(evento.data_evento)}
              </span>
            </div>

            {evento.hora_evento && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground/80">
                  Horário: {evento.hora_evento.substring(0, 5)}
                </span>
              </div>
            )}

            {evento.cliente_nome && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground/80">
                  Cliente: {evento.cliente_nome}
                </span>
              </div>
            )}

            {/* Descrição */}
            {evento.descricao && (
              <div className="p-3 rounded-xl border border-border bg-muted/20 text-foreground/90 leading-relaxed font-sans text-xs">
                {evento.descricao}
              </div>
            )}
          </div>

          {/* Links para entidades do ERP */}
          {!isManual && (
            <div className="p-3 rounded-xl border border-border bg-primary/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">Vinculado ao Sistema</span>
              </div>

              {evento.tipo_evento === 'prazo_entrega' && evento.operacao_prod_id && (
                <a
                  href={`/#/producao`}
                  className="flex items-center gap-1 text-primary hover:underline font-semibold"
                  onClick={onClose}
                >
                  Ver no Kanban OP
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {evento.tipo_evento === 'quotation' && evento.quotation_id && (
                <a
                  href={`/#/quotations-pro?id=${evento.quotation_id}`}
                  className="flex items-center gap-1 text-primary hover:underline font-semibold"
                  onClick={onClose}
                >
                  Ver Orçamento
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/15">
          <div>
            {isManual && (
              <button
                onClick={deletarEvento}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                title="Excluir tarefa"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border bg-background hover:bg-muted text-xs font-semibold rounded-lg text-foreground transition-all"
            >
              Fechar
            </button>

            {isManual && (
              <button
                onClick={alternarConclusao}
                disabled={loading}
                className={`
                  flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-[hsl(var(--accent-foreground))] transition-all
                  ${evento.concluido ? 'bg-[var(--ui-color-warning)] hover:brightness-90' : 'bg-[var(--ui-color-success)] hover:brightness-90'}
                `}
              >
                <CheckCircle className="w-4 h-4" />
                {evento.concluido ? 'Reabrir' : 'Concluir'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
