import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../landing.module.css';

const ThreeDViewer = React.lazy(() =>
  import('./3DViewer').then((m) => ({ default: m.ThreeDViewer })),
);

export const FeatureShowcase: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="modules" className={styles.featureHighlight}>
      <div className={styles.featureContent}>
        <h2>Visualize Seu Plano de Corte em 3D</h2>
        <p>Renderização gráfica interativa para otimizar o aproveitamento de material.</p>

        <React.Suspense
          fallback={
            <div
              style={{
                height: '300px',
                background: '#0a0a0a',
                borderRadius: '12px',
                border: '1px solid #333333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF9500',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '40px',
              }}
            >
              Carregando simulador 3D...
            </div>
          }
        >
          <ThreeDViewer />
        </React.Suspense>

        <button className={styles.btnExplore} onClick={() => navigate('/modulos')}>
          Explorar Todos os Módulos →
        </button>

        {/* Módulos Grid */}
        <div className={styles.modulesGrid}>
          <div className={styles.moduleItem}>
            <strong>CRM</strong>
            <p>Clientes e Leads</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Orçamentos</strong>
            <p>Propostas automáticas</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Engenharia</strong>
            <p>SKUs e Cálculos</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Produção</strong>
            <p>Kanban e PCP</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Estoque</strong>
            <p>Granular e Compras</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Financeiro</strong>
            <p>DRE e Fluxo de Caixa</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Pós-Venda</strong>
            <p>Garantia e Assistência</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Billing</strong>
            <p>SaaS Integrado</p>
          </div>
          <div className={styles.moduleItem}>
            <strong>Prospecção</strong>
            <p>Para Marcenarias</p>
          </div>
        </div>
      </div>
    </section>
  );
};
