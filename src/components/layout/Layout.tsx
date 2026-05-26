import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DluxChat from '../ai/DluxChat';
import { api } from '../../lib/api';
import BillingBlockedOverlay from '../BillingBlockedOverlay';
import { AlertCircle, CreditCard } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const [billingBlocked, setBillingBlocked] = useState(false);
  const [blockedError, setBlockedError] = useState('');
  const [subData, setSubData] = useState<{
    status: string;
    plano: string;
    diasRestantes: number;
    invoiceUrl?: string;
  } | null>(null);

  // Carregar dados de faturamento do tenant
  useEffect(() => {
    api.checkout.get()
      .then((data: any) => {
        if (data) {
          setSubData(data);
          // Se o próprio endpoint disser que está suspenso/inativo (bloqueio preventivo)
          if (data.status === 'suspended' || data.status === 'inactive') {
            setBillingBlocked(true);
            setBlockedError('Sua assinatura está suspensa ou inativa por falta de pagamento.');
          }
        }
      })
      .catch((err) => {
        console.error('[LOAD_BILLING_STATUS_ERROR]', err);
      });
  }, []);

  // Ouvir o evento global de bloqueio por faturamento (HTTP 402)
  useEffect(() => {
    const handleBlocked = (e: Event) => {
      const customEvent = e as CustomEvent;
      setBillingBlocked(true);
      setBlockedError(customEvent.detail?.error || 'Sua assinatura expirou ou está atrasada.');
    };

    window.addEventListener('billing-blocked', handleBlocked);
    return () => {
      window.removeEventListener('billing-blocked', handleBlocked);
    };
  }, []);

  const showTrialBanner = subData?.status === 'trial';
  const showOverdueWarning = subData?.status === 'overdue';

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* Overlay de Bloqueio se inadimplente */}
      {billingBlocked && (
        <BillingBlockedOverlay 
          errorMsg={blockedError} 
          invoiceUrl={subData?.invoiceUrl} 
        />
      )}

      <Sidebar />
      
      <main style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--background-gradient)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Banner de Aviso de Trial Ativo */}
        {showTrialBanner && (
          <div style={{
            background: 'rgba(226, 172, 0, 0.12)',
            borderBottom: '1px solid rgba(226, 172, 0, 0.3)',
            color: '#F0F6FC',
            padding: '0.65rem 2rem',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} style={{ color: '#E2AC00' }} />
              <span>
                Período de teste grátis ativo (Plano <strong>{subData?.plano?.toUpperCase()}</strong>). Restam <strong>{subData?.diasRestantes} dias</strong> de avaliação.
              </span>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              style={{
                background: '#E2AC00',
                border: 'none',
                color: '#0D1117',
                padding: '0.35rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 2px 6px rgba(226, 172, 0, 0.2)'
              }}
            >
              <CreditCard size={12} />
              ATIVAR ASSINATURA
            </button>
          </div>
        )}

        {/* Banner de Aviso de Faturamento Atrasado (Tolerância de 5 dias) */}
        {showOverdueWarning && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F0F6FC',
            padding: '0.65rem 2rem',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} style={{ color: '#EF4444' }} />
              <span>
                Atenção: Consta um pagamento em aberto. Regularize seu faturamento para evitar a suspensão automática da escrita no ERP.
              </span>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              style={{
                background: '#EF4444',
                border: 'none',
                color: '#F0F6FC',
                padding: '0.35rem 1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
              }}
            >
              <CreditCard size={12} />
              REGULARIZAR
            </button>
          </div>
        )}

        <div style={{ 
          maxWidth: '1400px', 
          width: '100%',
          margin: '0 auto', 
          padding: '2rem 2.5rem',
          flex: 1
        }}>
          <Outlet />
        </div>
      </main>
      <DluxChat />
    </div>
  );
}
