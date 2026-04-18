import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertCircle, FileText, 
  XCircle, Send, ShieldCheck, Clock, 
  User, Check, MapPin, Phone, Mail
} from 'lucide-react';
import { api } from '../lib/api';

interface AprovacaoPageProps {
  token: string;
}

const AprovacaoPage: React.FC<AprovacaoPageProps> = ({ token }) => {
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [formName, setFormName] = useState('');
  const [formReason, setFormReason] = useState('');
  const [success, setSuccess] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

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
    if (!formName) return alert('Por favor, informe seu nome para assinar a aprovação.');
    try {
      await api.aprovacao.aprovar(token, { nome: formName });
      setSuccess('approved');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    if (!formReason) return alert('Por favor, informe o motivo da revisão.');
    try {
      await api.aprovacao.recusar(token, { motivo: formReason });
      setSuccess('rejected');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div style={{ background: '#0D2137', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div className="animate-pulse">Aguarde, carregando sua proposta...</div>
    </div>
  );

  if (error) return (
    <div style={{ background: '#0D2137', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <XCircle size={64} color="#EF4444" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Ops! Algo deu errado.</h2>
        <p style={{ color: 'rgba(255,b255,255,0.6)', lineHeight: '1.6' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-secondary" style={{ marginTop: '2rem' }}>Tentar Novamente</button>
      </div>
    </div>
  );

  if (success) return (
    <div style={{ background: '#0D2137', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '500px' }} className="animate-fade-in">
        {success === 'approved' ? (
          <>
            <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 2rem',
                border: '2px solid #10B981'
            }}>
                <CheckCircle2 size={50} color="#10B981" />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', color: '#E2AC00' }}>Proposta Aprovada!</h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,b255,255,0.8)', marginBottom: '2rem' }}>
              Obrigado, <strong>{formName}</strong>. Recebemos sua aprovação formal do orçamento <strong>{orcamento.numero}</strong>.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(255,b255,255,0.2)' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,b255,255,0.4)', margin: '0 0 0.5rem 0' }}>Selo de Autenticidade Digital</p>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--primary)' }}>
                    ID: {orcamento.id}<br/>
                    IP: REGISTRADO<br/>
                    TIMESTAMP: {new Date().toLocaleString('pt-BR')}
                </div>
            </div>
          </>
        ) : (
          <>
            <AlertCircle size={80} color="#F59E0B" style={{ marginBottom: '2rem' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Revisão Solicitada</h1>
            <p style={{ color: 'rgba(255,b255,255,0.8)' }}>Sua solicitação foi enviada para nossa equipe comercial interna. Em breve entraremos em contato.</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', color: '#0D2137', fontFamily: 'Inter, sans-serif' }}>
      {/* Header Premium */}
      <header style={{ background: '#0D2137', padding: '1.5rem 2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#E2AC00', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.5rem', color: '#0D2137' }}>D</div>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '1px' }}>D'LUXURY CRM</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,b255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="#10B981" /> Proposta Digital Segura
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {/* Top Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ background: '#E2AC0020', color: '#E2AC00', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>Orçamento {orcamento.numero}</span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '1rem 0 0.5rem 0' }}>Proposta Comercial</h1>
              <p style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> Emitido em {new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem' }}>{orcamento.cliente_nome}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem', color: '#64748B', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}><Phone size={14} /> {orcamento.cliente_telefone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}><Mail size={14} /> {orcamento.cliente_email}</span>
                </div>
            </div>
          </div>

          {/* Itens */}
          <section>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '0.5rem' }}>Detalhamento da Proposta</h3>
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F8FAFC', color: '#64748B', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Descrição do Item / Ambiente</th>
                    <th style={{ textAlign: 'center', padding: '1rem' }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '1rem 1.5rem' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamento.itens?.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1E293B' }}>{item.descricao}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.2rem' }}>{item.ambiente} | {item.largura_cm}x{item.altura_cm}cm</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.quantidade}</td>
                      <td style={{ textAlign: 'right', padding: '1.2rem 1.5rem', fontWeight: '700', fontSize: '1rem' }}>
                        R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ background: '#F8FAFC', padding: '2rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                        <span>Subtotal</span>
                        <span>R$ {Number(orcamento.valor_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {orcamento.adicional_urgencia_pct > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                            <span>Adicional Urgência</span>
                            <span>+{orcamento.adicional_urgencia_pct}%</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: '900', color: '#0D2137', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '2px solid #CBD5E1' }}>
                        <span>T O T A L</span>
                        <span style={{ color: '#E2AC00' }}>R$ {Number(orcamento.valor_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
              </div>
            </div>
          </section>

          {/* Condições */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
             <section>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} className="text-primary" /> Condições de Pagamento
                </h3>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#1E293B' }}>{orcamento.condicao?.nome || 'A combinar'}</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>Prazos sujeitos a aprovação de crédito.</p>
                </div>
             </section>
             <section>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <MapPin size={18} className="text-primary" /> Prazo de Entrega
                </h3>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#1E293B' }}>{orcamento.prazo_entrega_dias || 45} dias úteis</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>Após a medição final e aprovação técnica.</p>
                </div>
             </section>
          </div>

          {orcamento.observacoes && (
            <section>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1rem' }}>Observações Adicionais</h3>
                <div style={{ background: 'rgba(226, 172, 0, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(226, 172, 0, 0.2)', fontSize: '0.9rem', color: '#665c3b', lineHeight: '1.6' }}>
                    {orcamento.observacoes}
                </div>
            </section>
          )}

          {/* Ações Finais */}
          <section style={{ borderTop: '2px solid #E2E8F0', paddingTop: '3rem', marginTop: '1rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '1rem' }}>Pronto para começar seu projeto?</h2>
                <p style={{ color: '#64748B', marginBottom: '2.5rem' }}>Ao aprovar esta proposta, você concorda com as condições descritas acima e autoriza o início das etapas técnicas.</p>
                
                {action === 'idle' && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button 
                            onClick={() => setAction('approving')}
                            className="btn-primary" 
                            style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px', boxShadow: '0 10px 15px -3px rgba(226, 172, 0, 0.3)' }}
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
                    <div className="animate-fade-in" style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '2px solid #E2AC00', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ margin: '0 0 1.5rem' }}>Assinatura Digital</h4>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                            <label>Seu Nome Completo</label>
                            <input 
                                type="text" 
                                placeholder="Digite seu nome aqui" 
                                value={formName} 
                                onChange={e => setFormName(e.target.value)}
                                style={{ height: '50px', fontSize: '1.1rem' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button onClick={handleApprove} className="btn-primary" style={{ flex: 1, height: '50px' }}>CONCORDAR E APROVAR</button>
                            <button onClick={() => setAction('idle')} className="btn-secondary">Voltar</button>
                        </div>
                    </div>
                )}

                {action === 'rejecting' && (
                    <div className="animate-fade-in" style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '2px solid #EF4444', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ margin: '0 0 1.5rem' }}>O que deseja revisar?</h4>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                            <label>Motivo ou Comentário</label>
                            <textarea 
                                placeholder="Descreva aqui o que precisa ser ajustado..." 
                                value={formReason} 
                                onChange={e => setFormReason(e.target.value)}
                                style={{ minHeight: '120px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button onClick={handleReject} className="btn-primary" style={{ flex: 1, background: '#EF4444', height: '50px' }}>ENVIAR SOLICITAÇÃO</button>
                            <button onClick={() => setAction('idle')} className="btn-secondary">Voltar</button>
                        </div>
                    </div>
                )}
            </div>
          </section>

        </div>
      </div>

      <footer style={{ background: '#0D2137', padding: '3rem 2rem', color: 'rgba(255,b255,255,0.4)', textAlign: 'center', fontSize: '0.8rem' }}>
          <p>© {new Date().getFullYear()} D'Luxury CRM Industrial. Todos os direitos reservados.</p>
          <p style={{ marginTop: '0.5rem' }}>Este documento é eletrônico e possui validade jurídica respaldada pelos termos de uso da plataforma.</p>
      </footer>

      <style>{`
        .btn-primary {
            background: #E2AC00;
            color: #0D2137;
            border: none;
            padding: 0.8rem 1.5rem;
            border-radius: 8px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
        }
        .btn-primary:hover {
            background: #f5ba00;
            transform: translateY(-2px);
        }
        .btn-secondary {
            background: #F1F5F9;
            color: #475569;
            border: 1px solid #E2E8F0;
            padding: 0.8rem 1.5rem;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-secondary:hover {
            background: #E2E8F0;
        }
        .form-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #475569;
        }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 0.8rem;
            border: 1.5px solid #E2E8F0;
            border-radius: 8px;
            font-family: inherit;
            transition: border-color 0.2s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #E2AC00;
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
