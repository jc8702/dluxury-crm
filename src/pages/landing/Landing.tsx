import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MetricsSection } from './components/MetricsSection';
import { FeatureShowcase } from './components/FeatureShowcase';
import './landing.module.css';

const LandingPage: React.FC = () => {
  return (
    <div style={{ background: '#1a1a1a', color: '#ffffff' }}>
      <Navbar />
      <main id="main-content">
        <Hero />
        <MetricsSection />
        <FeatureShowcase />
      </main>

      {/* Simple Footer */}
      <footer
        style={{
          background: '#0a0a0a',
          borderTop: '1px solid #333333',
          padding: '40px 32px',
          textAlign: 'center',
          color: '#b8b8b8',
          fontSize: '13px',
        }}
      >
        <p>&copy; 2026 D'Luxury CRM. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
