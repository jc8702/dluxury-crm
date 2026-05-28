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
      
      <main className="flex-1 h-screen overflow-y-auto bg-background bg-gradient-surface relative flex flex-col">
        
        {/* Banner de Aviso de Trial Ativo */}
        {showTrialBanner && (
          <div className="bg-warning/10 border-b border-warning/30 text-foreground px-4 md:px-8 py-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between font-sans gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-warning shrink-0" />
              <span>
                Período de teste grátis ativo (Plano <strong className="font-semibold">{subData?.plano?.toUpperCase()}</strong>). Restam <strong className="font-semibold">{subData?.diasRestantes} dias</strong> de avaliação.
              </span>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="bg-warning text-warning-foreground border-none px-4 py-1.5 rounded-md font-bold text-xs cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:brightness-110 transition-all w-full sm:w-auto"
            >
              <CreditCard size={14} />
              ATIVAR ASSINATURA
            </button>
          </div>
        )}

        {/* Banner de Aviso de Faturamento Atrasado (Tolerância de 5 dias) */}
        {showOverdueWarning && (
          <div className="bg-destructive/10 border-b border-destructive/30 text-foreground px-4 md:px-8 py-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between font-sans gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <span>
                Atenção: Consta um pagamento em aberto. Regularize seu faturamento para evitar a suspensão automática da escrita no ERP.
              </span>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="bg-destructive text-destructive-foreground border-none px-4 py-1.5 rounded-md font-bold text-xs cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:brightness-110 transition-all w-full sm:w-auto"
            >
              <CreditCard size={14} />
              REGULARIZAR
            </button>
          </div>
        )}

        <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col">
          <Outlet />
        </div>
      </main>
      <DluxChat />
    </div>
  );
}
