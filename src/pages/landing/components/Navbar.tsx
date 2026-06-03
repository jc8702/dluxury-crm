import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginModal } from './LoginModal';
import styles from '../landing.module.css';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <header className={`fixed top-0 left-0 w-full z-50 transition-all ${styles.glassHeader}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* LOGO */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-black text-lg tracking-wider">DL</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              D'Luxury <span className="text-primary">CRM</span>
            </span>
          </div>

          {/* LINKS DE NAVEGAÇÃO */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#features"
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Funcionalidades
            </a>
            <a
              href="#metrics"
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Métricas
            </a>
            <a href="#3d" className="text-gray-300 hover:text-white transition-colors duration-200">
              Simulador 3D
            </a>
            <a
              href="#pricing"
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Planos
            </a>
            <a
              href="#faq"
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              FAQ
            </a>
          </nav>

          {/* AÇÕES */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLoginOpen(true)}
              className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/signup')}
              className={`px-5 py-2.5 text-sm font-bold ${styles.btnPrimary}`}
            >
              Experimentar Grátis
            </button>
          </div>
        </div>
      </header>
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
};
