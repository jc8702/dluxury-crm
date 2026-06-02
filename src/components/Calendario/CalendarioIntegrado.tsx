import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Sparkles,
  Filter,
  Plus,
} from 'lucide-react';
import { calendarService } from '../../services/calendarService.js';
import type { EventoCalendarioType, TipoEventoType } from '../../services/calendarService.js';
import CalendarioMes from './CalendarioMes.tsx';
import CalendarioSemana from './CalendarioSemana.tsx';
import PopoverEvento from './PopoverEvento.tsx';

export default function CalendarioIntegrado() {
  const [viewType, setViewType] = useState<'mes' | 'semana'>('mes');
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [eventos, setEventos] = useState<EventoCalendarioType[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados dos Modais
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoCalendarioType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [diaSelecionadoParaCriar, setDiaSelecionadoParaCriar] = useState<Date | null>(null);

  // Campos do Formulário de Criação
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formTipo, setFormTipo] = useState<TipoEventoType>('tarefa');
  const [formHora, setFormHora] = useState('');
  const [formCor, setFormCor] = useState('#10B981'); // Verde default para tarefas
  const [formDiasAntes, setFormDiasAntes] = useState(0);

  // Carregar eventos ao alterar a data selecionada ou o filtro
  useEffect(() => {
    carregarEventos();
  }, [dataSelecionada, filtroTipo]);

  const carregarEventos = async () => {
    setLoading(true);
    setError(null);
    try {
      const mes = dataSelecionada.getMonth() + 1;
      const ano = dataSelecionada.getFullYear();

      const data = await calendarService.getEventos(mes, ano, filtroTipo || undefined);

      // Mapear se está atrasado (se data_evento < hoje e não está concluído)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const eventosProcessados = data.map((evt) => {
        const dataEvt = new Date(evt.data_evento);
        dataEvt.setHours(0, 0, 0, 0);
        return {
          ...evt,
          atrasado: dataEvt < hoje && !evt.concluido,
        };
      });

      setEventos(eventosProcessados);
    } catch (err: any) {
      console.error('Erro ao carregar eventos:', err);
      setError(err.message || 'Erro ao carregar a agenda de eventos.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavegarMes = (direcao: 'anterior' | 'proximo') => {
    const novaData = new Date(dataSelecionada);
    if (direcao === 'anterior') {
      novaData.setMonth(novaData.getMonth() - 1);
    } else {
      novaData.setMonth(novaData.getMonth() + 1);
    }
    setDataSelecionada(novaData);
  };

  const handleNavegarHoje = () => {
    setDataSelecionada(new Date());
  };

  const abrirModalCriacao = (dia: Date) => {
    setDiaSelecionadoParaCriar(dia);
    // Definir cor de acordo com o tipo
    setFormCor('#10B981'); // Verde
    setFormTipo('tarefa');
    setFormTitulo('');
    setFormDescricao('');
    setFormHora('');
    setFormDiasAntes(0);
    setShowCreateModal(true);
  };

  const handleCriarEventoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !diaSelecionadoParaCriar) {
      alert('Título do evento é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      const ano = diaSelecionadoParaCriar.getFullYear();
      const mes = String(diaSelecionadoParaCriar.getMonth() + 1).padStart(2, '0');
      const dia = String(diaSelecionadoParaCriar.getDate()).padStart(2, '0');
      const data_evento = `${ano}-${mes}-${dia}`;

      await calendarService.criarEvento({
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim() || undefined,
        data_evento,
        hora_evento: formHora || undefined,
        tipo_evento: formTipo,
        cor_categoria: formCor,
        notificacao_dias_antes: formDiasAntes,
      });

      setShowCreateModal(false);
      carregarEventos();
    } catch (err: any) {
      console.error('Erro ao criar evento:', err);
      alert(err.message || 'Erro ao criar evento.');
    } finally {
      setLoading(false);
    }
  };

  const obterNomeMes = () => {
    return dataSelecionada.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Ajusta cores no form baseado no tipo selecionado
  const handleTipoChange = (tipo: TipoEventoType) => {
    setFormTipo(tipo);
    if (tipo === 'tarefa')
      setFormCor('#10B981'); // Verde
    else if (tipo === 'lembrete_compra')
      setFormCor('#F59E0B'); // Âmbar
    else if (tipo === 'reuniao') setFormCor('#8B5CF6'); // Roxo
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/65 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-1.5 capitalize">
              {obterNomeMes()}
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            </h2>
            <p className="text-xs text-muted-foreground">
              Agenda integrada contendo tarefas, reuniões, prazos de OPs e prazos de propostas
              aprovadas.
            </p>
          </div>
        </div>

        {/* View Changer & Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de View */}
          <div className="flex rounded-xl bg-muted p-1 border border-border">
            <button
              onClick={() => setViewType('mes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'mes' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewType('semana')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'semana' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Semana
            </button>
          </div>

          {/* Navegador */}
          <div className="flex items-center gap-1 border border-border bg-background rounded-xl p-1 shadow-sm">
            <button
              onClick={() => handleNavegarMes('anterior')}
              className="p-1.5 hover:bg-muted rounded-lg text-foreground transition-all"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNavegarHoje}
              className="px-3 py-1 hover:bg-muted text-xs font-bold text-foreground rounded-lg transition-all"
            >
              Hoje
            </button>
            <button
              onClick={() => handleNavegarMes('proximo')}
              className="p-1.5 hover:bg-muted rounded-lg text-foreground transition-all"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtro e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Filtrar por Categoria:</span>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
          >
            <option value="">Todas as Categorias</option>
            <option value="orcamento">Orçamentos Aprovados</option>
            <option value="prazo_entrega">Prazos de Entrega OP</option>
            <option value="lembrete_compra">Lembretes de Compra</option>
            <option value="tarefa">Tarefas Customizadas</option>
            <option value="reuniao">Reunião / Visita</option>
          </select>
        </div>

        <button
          onClick={() => abrirModalCriacao(new Date())}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Criar Nova Tarefa
        </button>
      </div>

      {/* Agenda Views */}
      {loading && eventos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm font-medium animate-pulse">
          Carregando calendário de eventos...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2 shadow-sm">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : viewType === 'mes' ? (
        <CalendarioMes
          dataSelecionada={dataSelecionada}
          eventos={eventos}
          onEventoClick={setEventoSelecionado}
          onDiaClick={abrirModalCriacao}
        />
      ) : (
        <CalendarioSemana
          dataSelecionada={dataSelecionada}
          eventos={eventos}
          onEventoClick={setEventoSelecionado}
          onDiaClick={abrirModalCriacao}
        />
      )}

      {/* Popover Evento Detalhes */}
      {eventoSelecionado && (
        <PopoverEvento
          evento={eventoSelecionado}
          onClose={() => setEventoSelecionado(null)}
          onUpdate={carregarEventos}
        />
      )}

      {/* Modal Criar Evento Manual */}
      {showCreateModal && diaSelecionadoParaCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
              <h3 className="text-lg font-bold text-foreground">
                Agendar para: {diaSelecionadoParaCriar.toLocaleDateString('pt-BR')}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full transition-all"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarEventoSubmit} className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinatura de contrato, Reunião time..."
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Descrição
                </label>
                <textarea
                  placeholder="Informações adicionais da tarefa..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Tipo e Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Categoria
                  </label>
                  <select
                    value={formTipo}
                    onChange={(e) => handleTipoChange(e.target.value as TipoEventoType)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="tarefa">Tarefa</option>
                    <option value="lembrete_compra">Lembrete Compra</option>
                    <option value="reuniao">Reunião / Visita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    Horário (opcional)
                  </label>
                  <input
                    type="time"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Dias de Antecedência para Notificação e Cor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Aviso Prévio (dias)
                  </label>
                  <select
                    value={formDiasAntes}
                    onChange={(e) => setFormDiasAntes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="0">Sem aviso</option>
                    <option value="1">1 dia antes</option>
                    <option value="3">3 dias antes</option>
                    <option value="5">5 dias antes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Cor Visual
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    {['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#DC2626'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormCor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${formCor === c ? 'border-foreground scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border bg-background hover:bg-muted text-xs font-semibold rounded-lg text-foreground transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// XIcon Local para evitar problemas
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
