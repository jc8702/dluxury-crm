import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface SubscriptionData {
  status: 'active' | 'trial' | 'overdue' | 'suspended' | 'inactive';
  plano: 'basic' | 'pro' | 'enterprise';
  valor: number;
  diaVencimento: number;
  currentPeriodEnd: string;
  diasRestantes: number;
  invoiceUrl: string | null;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await api.checkout.get();
      setSubData(res);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de faturamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handlePaymentRedirect = async () => {
    if (!subData) return;
    setPaying(true);
    setError('');
    try {
      const res = await api.checkout.pay();
      if (res.invoiceUrl) {
        // Redireciona o usuário para a página de faturamento do Asaas (Sandbox ou Real)
        window.open(res.invoiceUrl, '_blank');
      } else {
        throw new Error('URL de fatura não retornada pelo gateway.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar link de pagamento.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0D1117', color: '#E2AC00'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={spinnerStyle} />
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>CARREGANDO DADOS FINANCEIROS...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span style={{ ...badgeStyle, background: '#3FB950', color: '#0D1117' }}>ATIVA</span>;
      case 'trial':
        return <span style={{ ...badgeStyle, background: '#58A6FF', color: '#0D1117' }}>TRIAL (AVALIAÇÃO)</span>;
      case 'overdue':
        return <span style={{ ...badgeStyle, background: '#E2AC00', color: '#0D1117' }}>PAGAMENTO ATRASADO</span>;
      case 'suspended':
        return <span style={{ ...badgeStyle, background: '#F85149', color: '#F0F6FC' }}>SUSPENSA (BLOQUEADA)</span>;
      default:
        return <span style={{ ...badgeStyle, background: '#8B949E', color: '#0D1117' }}>INATIVA</span>;
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0D1117', color: '#F0F6FC',
      fontFamily: 'Inter, sans-serif', padding: '2rem 1rem', boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#161B22', border: '1px solid rgba(240,246,252,0.1)',
        borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '600px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#E2AC00', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            ASSINATURA & FATURAMENTO
          </h1>
          <p style={{ color: '#8B949E', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Gerencie o plano da sua conta D'Luxury CRM.
          </p>
        </div>

        {subData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Status do Plano */}
            <div style={panelItemStyle}>
              <span style={{ color: '#8B949E', fontSize: '0.85rem' }}>Status da Assinatura</span>
              <div style={{ marginTop: '0.4rem' }}>{getStatusBadge(subData.status)}</div>
            </div>

            {/* Resumo do Plano */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
              borderTop: '1px solid rgba(240,246,252,0.1)', paddingTop: '1.5rem'
            }}>
              <div>
                <span style={{ color: '#8B949E', fontSize: '0.85rem' }}>Plano Contratado</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.2rem 0', color: '#E2AC00' }}>
                  {subData.plano.toUpperCase()}
                </p>
              </div>
              <div>
                <span style={{ color: '#8B949E', fontSize: '0.85rem' }}>Valor Mensal</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.2rem 0' }}>
                  R$ {subData.valor.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Detalhes de Vigência */}
            <div style={{
              borderTop: '1px solid rgba(240,246,252,0.1)', paddingTop: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '0.75rem'
            }}>
              {subData.status === 'trial' ? (
                <div style={warningBoxStyle}>
                  ⚠️ Você está no período de testes grátis. Restam **{subData.diasRestantes} dias** de trial com funcionalidades Pro liberadas.
                </div>
              ) : subData.status === 'overdue' || subData.status === 'suspended' ? (
                <div style={alertBoxStyle}>
                  🚨 Sua conta está suspensa ou inadimplente. Efetue o pagamento da assinatura pendente para restabelecer o acesso completo de escrita.
                </div>
              ) : (
                <div style={{ fontSize: '0.9rem', color: '#8B949E' }}>
                  Sua assinatura está em dia. Próxima renovação em **{subData.currentPeriodEnd ? new Date(subData.currentPeriodEnd).toLocaleDateString('pt-BR') : '-'}**.
                </div>
              )}
            </div>

            {/* Ações de Pagamento */}
            <div style={{
              borderTop: '1px solid rgba(240,246,252,0.1)', paddingTop: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem'
            }}>
              
              {/* Botão para regularizar/assinar via Asaas */}
              {(subData.status === 'trial' || subData.status === 'overdue' || subData.status === 'suspended' || subData.status === 'inactive') && (
                <button
                  onClick={handlePaymentRedirect}
                  disabled={paying}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '8px',
                    background: paying ? '#444' : 'linear-gradient(135deg, #E2AC00, #b49050)',
                    color: '#0D1117', fontWeight: 700, border: 'none',
                    cursor: paying ? 'not-allowed' : 'pointer', fontSize: '1rem',
                    transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(226,172,0,0.15)'
                  }}
                >
                  {paying ? 'GERANDO PORTAL DE PAGAMENTO...' : 'IR PARA O PAGAMENTO SEGURO (ASAAS)'}
                </button>
              )}

              {error && (
                <div style={{
                  color: '#F85149', fontSize: '0.85rem', padding: '0.75rem',
                  background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: '8px'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <button
                  onClick={fetchSubscription}
                  style={{
                    flex: 1, padding: '0.8rem', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,246,252,0.15)',
                    color: '#F0F6FC', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  ATUALIZAR STATUS
                </button>
                <button
                  onClick={() => navigate('/painel')}
                  style={{
                    flex: 1, padding: '0.8rem', borderRadius: '8px',
                    background: 'transparent', border: '1px solid transparent',
                    color: '#58A6FF', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  IR PARA O PAINEL
                </button>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
};

// Estilos Reutilizáveis
const spinnerStyle: React.CSSProperties = {
  width: '32px', height: '32px',
  border: '3px solid #1F2937', borderTop: '3px solid #E2AC00',
  borderRadius: '50%', animation: 'spin 1s linear infinite',
  margin: '0 auto'
};

const badgeStyle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: 800,
  padding: '0.3rem 0.8rem', borderRadius: '20px',
  letterSpacing: '0.5px'
};

const panelItemStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column'
};

const warningBoxStyle: React.CSSProperties = {
  fontSize: '0.85rem', color: '#58A6FF', padding: '0.85rem',
  background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)',
  borderRadius: '8px', lineHeight: '1.4'
};

const alertBoxStyle: React.CSSProperties = {
  fontSize: '0.85rem', color: '#F85149', padding: '0.85rem',
  background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.2)',
  borderRadius: '8px', lineHeight: '1.4'
};

export default CheckoutPage;
