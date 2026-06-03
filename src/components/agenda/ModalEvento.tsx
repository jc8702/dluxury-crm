import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { X, Calendar, MapPin, Clock, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useCrmStore as useCRM } from '../../stores/useCrmStore';
import { useEscClose } from '../../hooks/useEscClose';
import { Card } from '../common';

interface ModalEventoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  eventToEdit?: any;
}

const ModalEvento: React.FC<ModalEventoProps> = ({ isOpen, onClose, onSave, eventToEdit }) => {
  const { error: toastError } = useToast();
  useEscClose(isOpen ? onClose : () => {});
  const { clients: ctxClients } = useCRM();
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'compromisso',
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    dia_inteiro: false,
    cliente_id: null as number | null,
    projeto_id: null as string | null,
    endereco: '',
    objetivo: 'outro',
    status_visita: 'agendado',
    responsavel_id: '',
    cor: '#3B82F6',
  });

  useEffect(() => {
    if (eventToEdit && eventToEdit.id) {
      const start = eventToEdit.data_inicio;
      const end = eventToEdit.data_fim;
      setFormData({
        tipo: eventToEdit.tipo || 'compromisso',
        titulo: eventToEdit.titulo || '',
        descricao: eventToEdit.descricao || '',
        data_inicio: start
          ? typeof start === 'string'
            ? start.slice(0, 16)
            : new Date(start).toISOString().slice(0, 16)
          : '',
        data_fim: end
          ? typeof end === 'string'
            ? end.slice(0, 16)
            : new Date(end).toISOString().slice(0, 16)
          : '',
        dia_inteiro: !!eventToEdit.dia_inteiro,
        cliente_id: eventToEdit.cliente_id || null,
        projeto_id: eventToEdit.projeto_id || null,
        endereco: eventToEdit.endereco || '',
        objetivo: eventToEdit.objetivo || 'outro',
        status_visita: eventToEdit.status_visita || 'agendado',
        responsavel_id: eventToEdit.responsavel_id || '',
        cor: eventToEdit.cor || '#d4af37',
      });
    } else {
      const now = new Date();
      const endHour = new Date(now.getTime() + 3600000);
      const hasStart = eventToEdit?.data_inicio;
      const hasEnd = eventToEdit?.data_fim;
      const startTime = hasStart
        ? typeof hasStart === 'string'
          ? hasStart
          : new Date(hasStart).toISOString().slice(0, 16)
        : now.toISOString().slice(0, 16);
      const endTime = hasEnd
        ? typeof hasEnd === 'string'
          ? hasEnd
          : new Date(hasEnd).toISOString().slice(0, 16)
        : endHour.toISOString().slice(0, 16);
      setFormData({
        tipo: eventToEdit?.tipo || 'compromisso',
        titulo: '',
        descricao: '',
        data_inicio: startTime,
        data_fim: endTime,
        dia_inteiro: false,
        cliente_id: null,
        projeto_id: null,
        endereco: '',
        objetivo: 'outro',
        status_visita: 'agendado',
        responsavel_id: 'admin',
        cor: eventToEdit?.tipo === 'visita' ? '#00A99D' : '#d4af37',
      });
    }
  }, [eventToEdit, isOpen]);

  useEffect(() => {
    if (isOpen) {
      api.clients
        .list()
        .then((data) => setClientsList(data || []))
        .catch((err) => console.error('Erro ao carregar clientes no ModalEvento:', err));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (eventToEdit?.id) {
        await api.agenda.update(eventToEdit.id, formData);
      } else {
        await api.agenda.create(formData);
      }
      onSave();
      onClose();
    } catch (error: any) {
      toastError('Erro ao salvar', error.message);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.events.remove(eventToEdit.id);
      onSave();
      onClose();
    } catch (error: any) {
      toastError('Erro ao excluir', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isVisita = formData.tipo === 'visita';

  return (
    <div
      className={
        isVisita
          ? 'fixed inset-0 bg-black/35 backdrop-blur-[1px] flex justify-end items-center z-[9999] animate-fade-in'
          : 'modal-overlay animate-fade-in'
      }
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className={
          isVisita
            ? 'bg-card border border-border shadow-2xl rounded-2xl h-[calc(100vh-2rem)] m-4 w-full max-w-[500px] flex flex-col overflow-hidden animate-slide-in'
            : 'modal-content animate-pop-in'
        }
        style={{ width: '100%', maxWidth: isVisita ? '500px' : '650px', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid hsl(var(--border))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(212, 175, 55, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Calendar size={20} color="hsl(var(--primary))" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
              {eventToEdit?.id ? 'EDITAR EVENTO' : 'NOVO EVENTO'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn"
            style={{ padding: '0.5rem', minWidth: 0, background: 'transparent' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className={isVisita ? 'overflow-y-auto flex-1 custom-scrollbar' : ''}
          style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxHeight: isVisita ? 'calc(100vh - 8rem)' : 'none',
          }}
        >
          {/* Selector de Tipo */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.35rem',
              background: 'var(--input-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
            }}
          >
            {[
              { id: 'compromisso', label: 'COMPROMISSO', color: '#d4af37' },
              { id: 'visita', label: 'VISITA TÉCNICA', color: '#00A99D' },
              { id: 'reuniao', label: 'REUNIÃO', color: '#3B82F6' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFormData({ ...formData, tipo: t.id, cor: t.color })}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: formData.tipo === t.id ? 'hsl(var(--primary))' : 'transparent',
                  color:
                    formData.tipo === t.id ? 'var(--primary-text)' : 'hsl(var(--muted-foreground))',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label-base">TÍTULO DO EVENTO *</label>
              <input
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="input-base"
                placeholder="EX: MEDIÇÃO FINAL - RESIDENCIAL BLUMENAU"
              />
            </div>

            <div>
              <label className="label-base">
                CLIENTE {formData.tipo === 'visita' ? '*' : '(OPCIONAL)'}
              </label>
              <select
                required={formData.tipo === 'visita'}
                value={formData.cliente_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cliente_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="input-base"
              >
                <option value="">SELECIONAR CLIENTE...</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div>
                <label className="label-base">INÍCIO</label>
                <div style={{ position: 'relative' }}>
                  <Clock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  />
                  <input
                    required
                    type="datetime-local"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="input-base"
                    style={{ paddingLeft: '3rem' }}
                  />
                </div>
              </div>
              <div>
                <label className="label-base">FIM</label>
                <div style={{ position: 'relative' }}>
                  <Clock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  />
                  <input
                    required
                    type="datetime-local"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    className="input-base"
                    style={{ paddingLeft: '3rem' }}
                  />
                </div>
              </div>
            </div>

            {formData.tipo === 'visita' && (
              <Card variant="primary" padding="md" className="animate-fade-in flex flex-col gap-4">
                <div>
                  <label className="label-base" style={{ color: 'hsl(var(--primary))' }}>
                    OBJETIVO
                  </label>
                  <select
                    value={formData.objetivo}
                    onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                    className="input-base"
                  >
                    <option value="medicao">MEDIÇÃO</option>
                    <option value="apresentacao">APRESENTAÇÃO</option>
                    <option value="instalacao">INSTALAÇÃO</option>
                    <option value="pos_venda">PÓS-VENDA</option>
                    <option value="outro">OUTRO</option>
                  </select>
                </div>
                <div>
                  <label className="label-base" style={{ color: 'hsl(var(--primary))' }}>
                    ENDEREÇO DA VISITA
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'hsl(var(--muted-foreground))',
                      }}
                    />
                    <input
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="input-base"
                      style={{ paddingLeft: '3rem' }}
                      placeholder="RUA, NÚMERO, BAIRRO..."
                    />
                  </div>
                </div>
              </Card>
            )}

            <div>
              <label className="label-base">DESCRIÇÃO / OBSERVAÇÕES</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="input-base"
                style={{ minHeight: '100px' }}
                placeholder="DETALHES IMPORTANTES PARA O COMPROMISSO..."
              />
            </div>

            <div className="grid-2">
              <div>
                <label className="label-base">RESPONSÁVEL</label>
                <select
                  required
                  value={formData.responsavel_id}
                  onChange={(e) => setFormData({ ...formData, responsavel_id: e.target.value })}
                  className="input-base"
                >
                  <option value="admin">ADMINISTRADOR</option>
                  <option value="vendedor">VENDEDOR</option>
                  <option value="marceneiro">MARCENEIRO</option>
                </select>
              </div>
              <div>
                <label className="label-base">COR DE EXIBIÇÃO</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    style={{
                      width: '45px',
                      height: '45px',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {formData.cor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {eventToEdit?.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-outline"
                  style={{
                    color: 'hsl(var(--destructive))',
                    borderColor: 'hsl(var(--destructive))',
                  }}
                >
                  <Trash2 size={18} /> EXCLUIR
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={onClose} className="btn btn-outline">
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '0.75rem 2.5rem' }}
              >
                {loading ? 'SALVANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEvento;
