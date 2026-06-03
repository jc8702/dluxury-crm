import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../landing.module.css';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  const handleStartTest = () => {
    navigate('/signup');
  };

  const handleExploreModules = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h1 className="text-white font-black">O ERP Definitivo</h1>
        <p
          style={{
            fontSize: '42px',
            fontWeight: 800,
            color: '#FF9500',
            marginBottom: '24px',
            lineHeight: '1.2',
          }}
        >
          para Fábricas e Marcenarias
        </p>

        <p className={styles.subtitle}>
          Do fechamento da venda ao plano de corte, orçamentos automáticos, fluxo de caixa e gestão
          CNC.
        </p>

        <div className={styles.ctaGroup}>
          <button onClick={handleStartTest} className={`px-8 py-4 ${styles.btnPrimary}`}>
            Começar Teste de 14 Dias
          </button>
          <button onClick={handleExploreModules} className={`px-8 py-4 ${styles.btnSecondary}`}>
            Explorar Módulos →
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
