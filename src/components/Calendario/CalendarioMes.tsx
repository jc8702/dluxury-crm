import React from 'react';
import type { EventoCalendarioType } from '../../services/calendarioService.js';
import { AlertCircle } from 'lucide-react';

interface CalendarioMesProps {
  dataSelecionada: Date;
  eventos: EventoCalendarioType[];
  onEventoClick: (evento: EventoCalendarioType) => void;
  onDiaClick: (dia: Date) => void;
}

export default function CalendarioMes({ dataSelecionada, eventos, onEventoClick, onDiaClick }: CalendarioMesProps) {
  const ano = dataSelecionada.getFullYear();
  const mes = dataSelecionada.getMonth();

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasMes = ultimoDia.getDate();
  const inicioSemana = primeiroDia.getDay(); // 0 = Domingo, 1 = Segunda, etc.

  const dias = [];

  // Dias em branco para preencher o início do mês
  for (let i = 0; i < inicioSemana; i++) {
    dias.push(null);
  }

  // Dias do mês atual
  for (let dia = 1; dia <= diasMes; dia++) {
    dias.push(new Date(ano, mes, dia));
  }

  const obterEventosDoDia = (data: Date) => {
    // Formatar data como YYYY-MM-DD local
    const anoStr = data.getFullYear();
    const mesStr = String(data.getMonth() + 1).padStart(2, '0');
    const diaStr = String(data.getDate()).padStart(2, '0');
    const dateStr = `${anoStr}-${mesStr}-${diaStr}`;
    
    return eventos.filter((evt) => evt.data_evento === dateStr);
  };

  const diaAtual = new Date();

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground py-3">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
          <div key={dia}>{dia}</div>
        ))}
      </div>

      {/* Dias do Mês */}
      <div className="grid grid-cols-7 gap-[1px] bg-border">
        {dias.map((data, idx) => {
          const eventosDia = data ? obterEventosDoDia(data) : [];
          const isHoje = data && data.toDateString() === diaAtual.toDateString();

          return (
            <div
              key={idx}
              className={`
                min-h-[110px] p-2 bg-card flex flex-col justify-between group transition-all duration-150
                ${data ? 'hover:bg-muted/10 cursor-pointer' : 'bg-muted/5 cursor-default'}
              `}
              onClick={() => data && onDiaClick(data)}
            >
              {data ? (
                <>
                  {/* Número do Dia */}
                  <div className="flex justify-between items-center mb-1">
                    <span 
                      className={`
                        text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                        ${isHoje ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/80'}
                      `}
                    >
                      {data.getDate()}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-primary/70 transition-opacity">
                      + Add
                    </span>
                  </div>

                  {/* Lista de Eventos */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[75px] scrollbar-none">
                    {eventosDia.map((evento) => (
                      <div
                        key={evento.id}
                        onClick={(e) => {
                          e.stopPropagation(); // Impede de abrir o modal de criar evento no dia
                          onEventoClick(evento);
                        }}
                        style={{ 
                          backgroundColor: `${evento.cor_categoria}18`,
                          borderLeft: `3px solid ${evento.cor_categoria}`,
                          color: evento.cor_categoria
                        }}
                        className={`
                          px-2 py-0.5 rounded text-[10px] font-medium truncate hover:brightness-95 transition flex items-center justify-between gap-1
                          ${evento.concluido ? 'line-through opacity-50 bg-muted border-l-muted-foreground text-muted-foreground' : ''}
                        `}
                        title={evento.titulo}
                      >
                        <span className="truncate">{evento.titulo}</span>
                        {evento.atrasado && !evento.concluido && (
                          <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
