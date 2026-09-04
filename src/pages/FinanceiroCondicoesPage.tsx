import React, { useEffect, useState } from 'react';
import { Button, Card, CardHeader, CardTitle } from '../components/ui';
import { CardBody as CardContent } from '../components/ui';
import { Modal, Input } from '../components/common';
import { Plus, RefreshCw, Edit, CreditCard, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/common/Skeleton';
import { api } from '../lib/api';

const FinanceiroCondicoesPage: React.FC = () => {
  const { success, error } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    parcelas: 1,
    entrada_percentual: 0,
    juros_percentual: 0,
  });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.financeiro.condicoesPagamento.list();
      setItems(res || []);
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
    setForm({ nome: '', descricao: '', parcelas: 1, entrada_percentual: 0, juros_percentual: 0 });
    setIsOpen(true);
  };

  const openEdit = (f: any) => {
    setEditing(f);
    setForm({
      nome: f.nome,
      descricao: f.descricao || '',
      parcelas: f.parcelas,
      entrada_percentual: f.entrada_percentual,
      juros_percentual: f.juros_percentual,
    });
    setIsOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.financeiro.condicoesPagamento.update({ id: editing.id, ...form });
      } else {
        await api.financeiro.condicoesPagamento.create(form);
      }
      setIsOpen(false);
      fetch();
      success('Condição de pagamento salva com sucesso!');
    } catch (e: any) {
      error(e.message || 'Erro ao salvar condição de pagamento');
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
            <CreditCard style={{ color: 'hsl(var(--primary))' }} /> CONDIÃÕES DE PAGAMENTO
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: 0 }}>
            Parâmetros de parcelamento, juros e entrada
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
            aria-label="Nova condição de pagamento"
          >
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> NOVA CONDIÃÃO
          </Button>
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <CardHeader>
          <CardTitle style={{ fontSize: '1rem', fontWeight: 800 }}>
            Regras de Parcelamento Ativas
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <TableSkeleton rows={4} cols={5} />
                </tbody>
              </table>
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              Nenhuma condição de pagamento cadastrada.
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
                      DESCRIÃÃO
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
                      PARCELAS
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
                      ENTRADA
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
                      JUROS
                    </th>
                    <th style={{ padding: '1rem', width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((f) => (
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
                      <td
                        style={{
                          padding: '1rem',
                          fontSize: '0.85rem',
                          color: 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {f.descricao || '-'}
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {f.parcelas}x
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                          color:
                            f.entrada_percentual > 0
                              ? 'hsl(var(--success))'
                              : 'hsl(var(--muted-foreground))',
                          fontFamily: 'monospace',
                        }}
                      >
                        {Number(f.entrada_percentual || 0).toFixed(2)}%
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                          color:
                            f.juros_percentual > 0
                              ? 'hsl(var(--destructive))'
                              : 'hsl(var(--muted-foreground))',
                          fontFamily: 'monospace',
                        }}
                      >
                        {Number(f.juros_percentual || 0).toFixed(2)}%
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
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Editar Condição de Pagamento' : 'Nova Condição de Pagamento'}
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
              placeholder="ex: 3x Sem Juros, Entrada + 2x"
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
              Descrição
            </label>
            <Input
              placeholder="Descrição ou observações adicionais"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                Parcelas *
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Parcelas"
                value={form.parcelas}
                onChange={(e) =>
                  setForm({ ...form, parcelas: Math.max(1, Number(e.target.value)) })
                }
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
                Entrada %
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Entrada %"
                value={form.entrada_percentual}
                onChange={(e) => setForm({ ...form, entrada_percentual: Number(e.target.value) })}
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
                Juros %
              </label>
              <Input
                type="number"
                min="0"
                placeholder="Juros %"
                value={form.juros_percentual}
                onChange={(e) => setForm({ ...form, juros_percentual: Number(e.target.value) })}
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

export default FinanceiroCondicoesPage;
