import React from 'react';
import type { EventoCalendarioType } from '../../services/calendarioService.js';
import { AlertCircle, Clock, PlusCircle } from 'lucide-react';

interface CalendarioSemanaProps {
  dataSelecionada: Date;
  eventos: EventoCalendarioType[];
  onEventoClick: (evento: EventoCalendarioType) => void;
  onDiaClick: (dia: Date) => void;
}

export default function CalendarioSemana({ dataSelecionada, eventos, onEventoClick, onDiaClick }: CalendarioSemanaProps) {
  // Acha o início da semana (Domingo) da data selecionada
  const obterDiasDaSemana = () => {
    const dataInicio = new Date(dataSelecionada);
    // subtrai o dia da semana atual para voltar ao Domingo
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay());
    
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const dia = new Date(dataInicio);
      dia.setDate(dia.getDate() + i);
      dias.push(dia);
    }
    return dias;
  };

  const diasSemana = obterDiasDaSemana();
  const diaAtual = new Date();

  const obterEventosDoDia = (data: Date) => {
    const anoStr = data.getFullYear();
    const mesStr = String(data.getMonth() + 1).padStart(2, '0');
    const diaStr = String(data.getDate()).padStart(2, '0');
    const dateStr = `${anoStr}-${mesStr}-${diaStr}`;
    
    return eventos.filter((evt) => evt.data_evento === dateStr);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4">
      {diasSemana.map((dia) => {
        const eventosDia = obterEventosDoDia(dia);
        const isHoje = dia.toDateString() === diaAtual.toDateString();

        return (
          <div
            key={dia.toDateString()}
            className={`
              flex flex-col border rounded-2xl bg-card min-h-[380px] shadow-sm overflow-hidden hover:shadow-md transition-all group
              ${isHoje ? 'border-primary ring-1 ring-primary/20' : 'border-border'}
            `}
          >
            {/* Header da Coluna do Dia */}
            <div 
              className={`
                p-3 border-b border-border text-center flex flex-col items-center justify-center cursor-pointer select-none
                ${isHoje ? 'bg-primary/5 text-primary' : 'bg-muted/30 text-foreground'}
              `}
              onClick={() => onDiaClick(dia)}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                {dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
              </span>
              <span className="text-xl font-extrabold">
                {dia.getDate()}
              </span>
              <button 
                className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[9px] font-semibold text-primary mt-1 transition-opacity"
              >
                <PlusCircle className="w-3 h-3" />
                Criar
              </button>
            </div>

            {/* Eventos do Dia */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[300px]">
              {eventosDia.length === 0 ? (
                <div 
                  className="h-full flex items-center justify-center border-2 border-dashed border-border/40 rounded-xl p-4 text-center text-[10px] text-muted-foreground/40 select-none cursor-pointer"
                  onClick={() => onDiaClick(dia)}
                >
                  Sem compromissos
                </div>
              ) : (
                eventosDia.map((evento) => (
                  <div
                    key={evento.id}
                    onClick={() => onEventoClick(evento)}
                    style={{ 
                      borderColor: `${evento.cor_categoria}40`,
                      backgroundColor: `${evento.cor_categoria}12`
                    }}
                    className={`
                      p-2.5 rounded-xl border text-[11px] cursor-pointer hover:shadow-sm transition flex flex-col gap-1.5
                      ${evento.concluido ? 'opacity-55 bg-muted border-muted-foreground/30' : ''}
                    `}
                  >
                    <div 
                      className={`font-semibold line-clamp-2 ${evento.concluido ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                    >
                      {evento.titulo}
                    </div>
                    {evento.cliente_nome && (
                      <div className="text-[9px] text-primary/80 font-medium mt-0.5">
                        Cliente: {evento.cliente_nome}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1">
                      {evento.hora_evento ? (
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{evento.hora_evento.substring(0, 5)}</span>
                        </div>
                      ) : (
                        <span className="opacity-65 font-medium">Dia inteiro</span>
                      )}

                      {evento.atrasado && !evento.concluido && (
                        <div className="flex items-center gap-0.5 text-destructive font-bold">
                          <AlertCircle className="w-3 h-3 text-destructive animate-pulse" />
                          Atrasado
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
