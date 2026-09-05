import React from 'react';
import { CreditCard, AlertTriangle } from 'lucide-react';

interface BillingBlockedOverlayProps {
  errorMsg?: string;
  invoiceUrl?: string;
}

const BillingBlockedOverlay: React.FC<BillingBlockedOverlayProps> = ({
  errorMsg = 'Sua assinatura está expirada ou suspensa por falta de pagamento. Regularize seu faturamento para reabilitar o acesso de escrita no ERP.',
  invoiceUrl,
}) => {
  const handleGoToPayment = () => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
    } else {
      window.location.hash = '#/checkout';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'hsla(var(--background) / 0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: 'Inter, sans-serif',
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: 'hsl(var(--card))',
          border: '2px solid hsl(var(--accent))',
          borderRadius: '16px',
          padding: '3rem 2rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        {/* Ícone */}
        <div
          style={{
            background: 'hsla(var(--accent) / 0.1)',
            borderRadius: '50%',
            padding: '1rem',
            color: 'hsl(var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertTriangle size={48} />
        </div>

        {/* Títulos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'hsl(var(--foreground))',
              margin: 0,
            }}
          >
            ACESSO SUSPENSO
          </h2>
          <p
            style={{
              color: 'hsl(var(--muted-foreground))',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Erro 402: Payment Required
          </p>
        </div>

        {/* Descrição do erro */}
        <p
          style={{
            color: 'hsl(var(--foreground))',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          {errorMsg}
        </p>

        {/* Botões de Ação */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
            marginTop: '0.5rem',
          }}
        >
          <button
            onClick={handleGoToPayment}
            style={{
              background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(38_50%_45%))',
              color: 'hsl(var(--accent-foreground))',
              border: 'none',
              borderRadius: '8px',
              padding: '0.85rem',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px hsla(var(--accent) / 0.3)',
              transition: 'transform 0.1s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <CreditCard size={20} />
            REGULARIZAR ASSINATURA
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'hsl(var(--muted) / 0.5)',
              color: 'hsl(var(--muted-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'hsl(var(--foreground))';
              e.currentTarget.style.borderColor = 'hsl(var(--foreground) / 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
              e.currentTarget.style.borderColor = 'hsl(var(--border))';
            }}
          >
            Verificar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingBlockedOverlay;
