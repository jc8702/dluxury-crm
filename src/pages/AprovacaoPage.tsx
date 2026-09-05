import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  Mail,
  FileDown,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { exportBudgetToPDF } from '../modules/quotations/services/export-pdf';

interface AprovacaoPageProps {
  token: string;
}

const AprovacaoPage: React.FC<AprovacaoPageProps> = ({ token: propToken }) => {
  const { error: toastError } = useToast();
  const { token: urlToken, numero } = useParams();
  const token = propToken || urlToken || numero || '';

  const [quotation, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleDownloadPDF = () => {
    if (!quotation) return;

    const orcMapeado = {
      numeroOrcamento: quotation.numero,
      valorTotalVenda: quotation.valor_final,
      cliente: {
        nome: quotation.cliente_nome,
        cidade: '',
        uf: '',
        telefone: quotation.cliente_telefone,
      },
      validadeDias: quotation.validade_dias || 15,
      taxaFinanceiraPercentual: quotation.taxa_mensal || 0,
      itens: (quotation.itens || []).map((item: any) => ({
        nomeCustomizado: item.descricao,
        unidadeMedida: 'UN',
        precoVendaUnitario: item.valor_unitario,
        quantidade: item.quantidade,
        skuCodigo: '',
      })),
    };

    exportBudgetToPDF(orcMapeado);
  };
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [formName, setFormName] = useState('');
  const [formReason, setFormReason] = useState('');
  const [success, setSuccess] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const data = await api.aprovacao.getPublico(token);
      setOrcamento(data);
    } catch (err: any) {
      setError(err.message || 'Link inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!formName) return toastError('Por favor, informe seu nome para assinar a aprovação.');
    try {
      await api.aprovacao.aprovar(token, { nome: formName });
      setSuccess('approved');
    } catch (err: any) {
      toastError(err.message);
    }
  };

  const handleReject = async () => {
    if (!formReason) return toastError('Por favor, informe o motivo da revisão.');
    try {
      await api.aprovacao.recusar(token, { motivo: formReason });
      setSuccess('rejected');
    } catch (err: any) {
      toastError(err.message);
    }
  };

  if (loading)
    return (
      <div
        style={{
          background: 'hsl(var(--primary))',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(var(--primary-foreground))',
        }}
      >
        <div className="animate-pulse">Aguarde, carregando sua proposta...</div>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          background: 'hsl(var(--primary))',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(var(--primary-foreground))',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <XCircle size={64} color="hsl(var(--destructive))" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Ops! Algo deu errado.</h2>
          <p style={{ color: 'hsl(var(--primary-foreground) / 0.7)', lineHeight: '1.6' }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
            style={{ marginTop: '2rem' }}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );

  if (success)
    return (
      <div
        style={{
          background: 'hsl(var(--primary))',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(var(--primary-foreground))',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '500px' }} className="animate-fade-in">
          {success === 'approved' ? (
            <>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'hsl(var(--success) / 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2rem',
                  border: '2px solid hsl(var(--success))',
                }}
              >
                <CheckCircle2 size={50} color="hsl(var(--success))" />
              </div>
              <h1
                style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  marginBottom: '1rem',
                  color: 'hsl(var(--accent))',
                }}
              >
                Proposta Aprovada!
              </h1>
              <p
                style={{
                  fontSize: '1.1rem',
                  color: 'hsl(var(--primary-foreground) / 0.85)',
                  marginBottom: '2rem',
                }}
              >
                Obrigado, <strong>{formName}</strong>. Recebemos sua aprovação formal do orçamento{' '}
                <strong>{quotation.numero}</strong>.
              </p>
              <div
                style={{
                  background: 'hsl(var(--primary-foreground) / 0.08)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed hsl(var(--primary-foreground) / 0.25)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'hsl(var(--primary-foreground) / 0.5)',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  Selo de Autenticidade Digital
                </p>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'hsl(var(--accent))',
                  }}
                >
                  ID: {quotation.id}
                  <br />
                  IP: REGISTRADO
                  <br />
                  TIMESTAMP: {new Date().toLocaleString('pt-BR')}
                </div>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={80} color="hsl(var(--accent))" style={{ marginBottom: '2rem' }} />
              <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>
                Revisão Solicitada
              </h1>
              <p style={{ color: 'hsl(var(--primary-foreground) / 0.85)' }}>
                Sua solicitação foi enviada para nossa equipe comercial interna. Em breve entraremos
                em contato.
              </p>
            </>
          )}
        </div>
      </div>
    );

  return (
    <div
      style={{
        background: 'hsl(var(--background))',
        minHeight: '100vh',
        color: 'hsl(var(--foreground))',
        fontFamily: "'Source Sans 3', Inter, sans-serif",
      }}
    >
      {/* Header Premium */}
      <header
        style={{
          background: 'hsl(var(--primary))',
          padding: '1.5rem 2rem',
          color: 'hsl(var(--primary-foreground))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              background: 'hsl(var(--accent))',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '1.5rem',
              color: 'hsl(var(--primary))',
            }}
          >
            D
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px' }}>
            D'LUXURY CRM
          </span>
        </div>
        <div
          style={{
            fontSize: '0.85rem',
            color: 'hsl(var(--primary-foreground) / 0.7)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldCheck size={16} color="hsl(var(--success))" /> Proposta Digital Segura
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* Top Info */}
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <span
                style={{
                  background: 'hsl(var(--accent) / 0.12)',
                  color: 'hsl(var(--accent))',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                }}
              >
                Orçamento {quotation.numero}
              </span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '1rem 0 0.5rem 0' }}>
                Proposta Comercial
              </h1>
              <p
                style={{
                  color: 'hsl(var(--muted-foreground))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 0 1rem 0',
                }}
              >
                <Clock size={16} /> Emitido em{' '}
                {new Date(quotation.created_at || quotation.criado_em).toLocaleDateString('pt-BR')}
              </p>
              <button
                onClick={handleDownloadPDF}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <FileDown size={16} />
                Baixar PDF da Proposta
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem' }}>
                {quotation.cliente_nome}
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  marginTop: '0.5rem',
                  color: 'hsl(var(--muted-foreground))',
                  fontSize: '0.9rem',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Phone size={14} /> {quotation.cliente_telefone}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Mail size={14} /> {quotation.cliente_email}
                </span>
              </div>
            </div>
          </div>

          {/* Itens */}
          <section>
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: '800',
                marginBottom: '1.5rem',
                borderBottom: '2px solid hsl(var(--border))',
                paddingBottom: '0.5rem',
              }}
            >
              Detalhamento da Proposta
            </h3>
            <div
              style={{
                background: 'hsl(var(--card))',
                borderRadius: '12px',
                boxShadow: '0 4px 20px hsl(var(--foreground) / 0.05)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead
                  style={{
                    background: 'hsl(var(--surface-hover))',
                    color: 'hsl(var(--muted-foreground))',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>
                      Descrição do Item / Ambiente
                    </th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '1rem 1.5rem' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.itens?.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div
                          style={{
                            fontWeight: '700',
                            fontSize: '1rem',
                            color: 'hsl(var(--foreground))',
                          }}
                        >
                          {item.descricao}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'hsl(var(--muted-foreground))',
                            marginTop: '0.2rem',
                          }}
                        >
                          {item.ambiente} | {item.largura_cm}x{item.altura_cm}cm
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.quantidade}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '1.2rem 1.5rem',
                          fontWeight: '700',
                          fontSize: '1rem',
                        }}
                      >
                        R${' '}
                        {Number(item.valor_total).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  background: 'hsl(var(--surface-hover))',
                  padding: '2rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    <span>Subtotal</span>
                    <span>
                      R${' '}
                      {Number(quotation.valor_base).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {quotation.adicional_urgencia_pct > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: 'hsl(var(--destructive))',
                      }}
                    >
                      <span>Adicional Urgência</span>
                      <span>+{quotation.adicional_urgencia_pct}%</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.5rem',
                      fontWeight: '900',
                      color: 'hsl(var(--foreground))',
                      marginTop: '0.5rem',
                      paddingTop: '0.5rem',
                      borderTop: '2px solid hsl(var(--border))',
                    }}
                  >
                    <span>T O T A L</span>
                    <span style={{ color: 'hsl(var(--accent))' }}>
                      R${' '}
                      {Number(quotation.valor_final).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Condições */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <section>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '800',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShieldCheck size={18} className="text-primary" /> Condições de Pagamento
              </h3>
              <div
                style={{
                  background: 'hsl(var(--card))',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                <p style={{ margin: 0, fontWeight: '700', color: 'hsl(var(--foreground))' }}>
                  {quotation.condicao?.nome || 'A combinar'}
                </p>
                <p
                  style={{
                    margin: '0.5rem 0 0',
                    fontSize: '0.85rem',
                    color: 'hsl(var(--muted-foreground))',
                  }}
                >
                  Prazos sujeitos a aprovação de crédito.
                </p>
              </div>
            </section>
            <section>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '800',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <MapPin size={18} className="text-primary" /> Prazo de Entrega
              </h3>
              <div
                style={{
                  background: 'hsl(var(--card))',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                <p style={{ margin: 0, fontWeight: '700', color: 'hsl(var(--foreground))' }}>
                  {quotation.prazo_entrega_dias || 45} dias úteis
                </p>
                <p
                  style={{
                    margin: '0.5rem 0 0',
                    fontSize: '0.85rem',
                    color: 'hsl(var(--muted-foreground))',
                  }}
                >
                  Após a medição final e aprovação técnica.
                </p>
              </div>
            </section>
          </div>

          {quotation.observacoes && (
            <section>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1rem' }}>
                Observações Adicionais
              </h3>
              <div
                style={{
                  background: 'hsl(var(--accent) / 0.06)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--accent) / 0.25)',
                  fontSize: '0.9rem',
                  color: 'hsl(40 100% 22%)',
                  lineHeight: '1.6',
                }}
              >
                {quotation.observacoes}
              </div>
            </section>
          )}

          {/* Ações Finais */}
          <section
            style={{
              borderTop: '2px solid hsl(var(--border))',
              paddingTop: '3rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '1rem' }}>
                Pronto para começar seu projeto?
              </h2>
              <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2.5rem' }}>
                Ao aprovar esta proposta, você concorda com as condições descritas acima e autoriza
                o início das etapas técnicas.
              </p>

              {action === 'idle' && (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => setAction('approving')}
                    className="btn-primary"
                    style={{
                      padding: '1rem 2.5rem',
                      fontSize: '1.1rem',
                      borderRadius: '30px',
                      boxShadow: '0 10px 15px -3px hsl(var(--primary) / 0.3)',
                    }}
                  >
                    APROVAR AGORA
                  </button>
                  <button
                    onClick={() => setAction('rejecting')}
                    className="btn-secondary"
                    style={{ padding: '1rem 2rem', fontSize: '1rem', borderRadius: '30px' }}
                  >
                    Solicitar Revisão
                  </button>
                </div>
              )}

              {action === 'approving' && (
                <div
                  className="animate-fade-in"
                  style={{
                    background: 'hsl(var(--card))',
                    padding: '2rem',
                    borderRadius: '16px',
                    border: '2px solid hsl(var(--accent))',
                    boxShadow: '0 20px 25px -5px hsl(var(--foreground) / 0.1)',
                  }}
                >
                  <h4 style={{ margin: '0 0 1.5rem' }}>Assinatura Digital</h4>
                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label>Seu Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Digite seu nome aqui"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      style={{ height: '50px', fontSize: '1.1rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      onClick={handleApprove}
                      className="btn-primary"
                      style={{ flex: 1, height: '50px' }}
                    >
                      CONCORDAR E APROVAR
                    </button>
                    <button onClick={() => setAction('idle')} className="btn-secondary">
                      Voltar
                    </button>
                  </div>
                </div>
              )}

              {action === 'rejecting' && (
                <div
                  className="animate-fade-in"
                  style={{
                    background: 'hsl(var(--card))',
                    padding: '2rem',
                    borderRadius: '16px',
                    border: '2px solid hsl(var(--destructive))',
                    boxShadow: '0 20px 25px -5px hsl(var(--foreground) / 0.1)',
                  }}
                >
                  <h4 style={{ margin: '0 0 1.5rem' }}>O que deseja revisar?</h4>
                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label>Motivo ou Comentário</label>
                    <textarea
                      placeholder="Descreva aqui o que precisa ser ajustado..."
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      style={{ minHeight: '120px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      onClick={handleReject}
                      className="btn-primary"
                      style={{ flex: 1, background: 'hsl(var(--destructive))', height: '50px' }}
                    >
                      ENVIAR SOLICITAÇÃO
                    </button>
                    <button onClick={() => setAction('idle')} className="btn-secondary">
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer
        style={{
          background: 'hsl(var(--primary))',
          padding: '3rem 2rem',
          color: 'hsl(var(--primary-foreground) / 0.55)',
          textAlign: 'center',
          fontSize: '0.8rem',
        }}
      >
        <p>© {new Date().getFullYear()} D'Luxury CRM Industrial. Todos os direitos reservados.</p>
        <p style={{ marginTop: '0.5rem' }}>
          Este documento é eletrônico e possui validade jurídica respaldada pelos termos de uso da
          plataforma.
        </p>
      </footer>

      <style>{`
        .form-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: hsl(var(--muted-foreground));
        }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 0.8rem;
            border: 1.5px solid hsl(var(--border));
            border-radius: 8px;
            font-family: inherit;
            transition: border-color 0.2s;
            background: hsl(var(--card));
            color: hsl(var(--foreground));
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: hsl(var(--primary));
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AprovacaoPage;
