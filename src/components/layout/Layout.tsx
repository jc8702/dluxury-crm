import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
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
    <div className="flex w-screen h-screen overflow-hidden bg-background">
      
      {/* Overlay de Bloqueio se inadimplente */}
      {billingBlocked && (
        <BillingBlockedOverlay 
          errorMsg={blockedError} 
          invoiceUrl={subData?.invoiceUrl} 
        />
      )}

      <Sidebar />
      
      {/* Main Content Area — off-white background with padded card */}
      <main className="flex-1 h-screen overflow-y-auto relative flex flex-col">
        
        <TopNavbar />

        {/* Banner: Trial */}
        {showTrialBanner && (
          <div className="bg-warning/8 border-b border-warning/20 text-foreground px-4 md:px-8 py-2.5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-warning shrink-0" />
              <span className="font-body">
                Período de teste ativo — Plano <strong className="font-semibold">{subData?.plano?.toUpperCase()}</strong>. Restam <strong className="font-semibold">{subData?.diasRestantes} dias</strong>.
              </span>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="btn btn-primary text-xs px-4 py-1.5 w-full sm:w-auto"
            >
              <CreditCard size={14} className="mr-1.5" />
              ATIVAR ASSINATURA
            </button>
          </div>
        )}

        {/* Banner: Overdue */}
        {showOverdueWarning && (
          <div className="bg-destructive/8 border-b border-destructive/20 text-foreground px-4 md:px-8 py-2.5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <span className="font-body">
                Pagamento em aberto. Regularize para evitar suspensão.
              </span>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="btn btn-danger text-xs px-4 py-1.5 w-full sm:w-auto"
            >
              <CreditCard size={14} className="mr-1.5" />
              REGULARIZAR
            </button>
          </div>
        )}

        {/* Main content card wrapper — white card on off-white background */}
        <div className="flex-1 w-full max-w-[1440px] mx-auto p-3 sm:p-5 md:p-6 lg:p-8">
          <div className="bg-card rounded-2xl border border-border/50 shadow-md min-h-full p-4 sm:p-6 md:p-8">
            <Outlet />
          </div>
        </div>
      </main>
      <DluxChat />
    </div>
  );
}
