import React, { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from '../components/common';
import { Plus, RefreshCw, Edit, DollarSign, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/common/Skeleton';

const FinanceiroFormasPage: React.FC = () => {
  const { success, error } = useToast();
  const [formas, setFormas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    nome: '',
    tipo: 'pix',
    taxa_percentual: 0,
    prazo_compensacao_dias: 0,
  });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.financeiro.formasPagamento.list();
      setFormas(res || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', tipo: 'pix', taxa_percentual: 0, prazo_compensacao_dias: 0 });
    setIsOpen(true);
  };

  const openEdit = (f: any) => {
    setEditing(f);
    setForm({
      nome: f.nome,
      tipo: f.tipo || 'pix',
      taxa_percentual: f.taxa_percentual,
      prazo_compensacao_dias: f.prazo_compensacao_dias,
    });
    setIsOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.financeiro.formasPagamento.update({ id: editing.id, ...form });
      } else {
        await api.financeiro.formasPagamento.create(form);
      }
      setIsOpen(false);
      fetch();
      success('Forma de pagamento salva com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao salvar forma de pagamento');
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case 'pix':
        return 'success';
      case 'dinheiro':
        return 'success';
      case 'credito':
        return 'primary';
      case 'debito':
        return 'outline';
      case 'boleto':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="page-container anim-fade-in" style={{ padding: '1rem' }}>
      <Button
        variant="ghost"
        onClick={() => (window.location.hash = '#/financeiro')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'hsl(var(--muted-foreground))',
          marginBottom: '1rem',
          padding: 0,
          height: 'auto',
          background: 'transparent',
        }}
      >
        <ArrowLeft size={16} /> Voltar ao Painel Financeiro
      </Button>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: 0,
            }}
          >
            <DollarSign style={{ color: 'hsl(var(--primary))' }} /> FORMAS DE PAGAMENTO
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: 0 }}>
            Meios de transação, taxas associadas e prazos de compensação
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="outline"
            onClick={fetch}
            disabled={loading}
            style={{ fontSize: '0.85rem' }}
            aria-label="Atualizar lista"
          >
            <RefreshCw
              size={16}
              className={loading ? 'anim-spin' : ''}
              style={{ marginRight: '0.25rem' }}
            />{' '}
            ATUALIZAR
          </Button>
          <Button
            variant="primary"
            onClick={openNew}
            style={{ fontSize: '0.85rem' }}
            aria-label="Nova forma de pagamento"
          >
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> NOVA FORMA
          </Button>
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <CardHeader>
          <CardTitle style={{ fontSize: '1rem', fontWeight: 800 }}>
            Métodos de Pagamento Ativos
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <TableSkeleton rows={4} cols={4} />
                </tbody>
              </table>
            </div>
          ) : formas.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              Nenhuma forma de pagamento cadastrada.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    style={{
                      textAlign: 'left',
                      borderBottom: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--surface))',
                    }}
                  >
                    <th
                      style={{
                        padding: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'hsl(var(--muted-foreground))',
                      }}
                    >
                      NOME
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'hsl(var(--muted-foreground))',
                      }}
                    >
                      TIPO
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'hsl(var(--muted-foreground))',
                        textAlign: 'right',
                      }}
                    >
                      TAXA
                    </th>
                    <th
                      style={{
                        padding: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'hsl(var(--muted-foreground))',
                        textAlign: 'right',
                      }}
                    >
                      COMPENSAÃ‡ÃƒO
                    </th>
                    <th style={{ padding: '1rem', width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formas.map((f) => (
                    <tr
                      key={f.id}
                      style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'hsl(var(--surface-hover))')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                        {f.nome}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                        <Badge variant={getTipoBadgeVariant(f.tipo)}>
                          {String(f.tipo || '').toUpperCase()}
                        </Badge>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                          color:
                            f.taxa_percentual > 0
                              ? 'hsl(var(--destructive))'
                              : 'hsl(var(--muted-foreground))',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {Number(f.taxa_percentual || 0).toFixed(2)}%
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                          color: 'hsl(var(--muted-foreground))',
                          fontFamily: 'monospace',
                        }}
                      >
                        {f.prazo_compensacao_dias > 0
                          ? `${f.prazo_compensacao_dias} dia${f.prazo_compensacao_dias !== 1 ? 's' : ''}`
                          : 'Imediato'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(f)}
                          aria-label={`Editar ${f.nome}`}
                        >
                          <Edit size={14} style={{ marginRight: '0.25rem' }} /> Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label
              className="label-base"
              style={{
                fontSize: '0.85rem',
                color: 'hsl(var(--muted-foreground))',
                marginBottom: '0.25rem',
                display: 'block',
              }}
            >
              Nome *
            </label>
            <Input
              placeholder="ex: Cartão Visa Crédito, Boleto Sicredi"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div>
            <label
              className="label-base"
              style={{
                fontSize: '0.85rem',
                color: 'hsl(var(--muted-foreground))',
                marginBottom: '0.25rem',
                display: 'block',
              }}
            >
              Tipo *
            </label>
            <select
              className="input-base"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: 'white',
                width: '100%',
                outline: 'none',
              }}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="pix" style={{ background: '#1e293b' }}>
                PIX
              </option>
              <option value="dinheiro" style={{ background: '#1e293b' }}>
                Dinheiro
              </option>
              <option value="credito" style={{ background: '#1e293b' }}>
                Cartão de Crédito
              </option>
              <option value="debito" style={{ background: '#1e293b' }}>
                Cartão de Débito
              </option>
              <option value="boleto" style={{ background: '#1e293b' }}>
                Boleto
              </option>
              <option value="transferência" style={{ background: '#1e293b' }}>
                Transferência Bancária / TED
              </option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label
                className="label-base"
                style={{
                  fontSize: '0.85rem',
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: '0.25rem',
                  display: 'block',
                }}
              >
                Taxa %
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Taxa %"
                value={form.taxa_percentual}
                onChange={(e) => setForm({ ...form, taxa_percentual: Number(e.target.value) })}
              />
            </div>
            <div>
              <label
                className="label-base"
                style={{
                  fontSize: '0.85rem',
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: '0.25rem',
                  display: 'block',
                }}
              >
                Prazo de Compensação (Dias)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="Dias"
                value={form.prazo_compensacao_dias}
                onChange={(e) =>
                  setForm({ ...form, prazo_compensacao_dias: Math.max(0, Number(e.target.value)) })
                }
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              marginTop: '0.5rem',
            }}
          >
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinanceiroFormasPage;
