import React from 'react';
import { Link } from 'react-router-dom';

const FinancePage: React.FC = () => {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h2>Financeiro</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/financeiro/classes" className="card" style={{ padding: '1rem', textDecoration: 'none' }}>
          <h3>Classes Financeiras</h3>
          <p>Gerencie o plano de contas analítico/ sintético</p>
        </Link>
        <Link to="/financeiro/contas" className="card" style={{ padding: '1rem', textDecoration: 'none' }}>
          <h3>Contas Internas</h3>
          <p>Caixas e contas bancárias</p>
        </Link>
        <Link to="/financeiro/titulos-receber" className="card" style={{ padding: '1rem', textDecoration: 'none' }}>
          <h3>Títulos a Receber</h3>
          <p>Faturas, parcelas e recebimentos</p>
        </Link>
        <Link to="/financeiro/titulos-pagar" className="card" style={{ padding: '1rem', textDecoration: 'none' }}>
          <h3>Títulos a Pagar</h3>
          <p>Fornecedores e pagamentos</p>
        </Link>
      </div>
    </div>
  );
};

export default FinancePage;
