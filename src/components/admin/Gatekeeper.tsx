import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { setAppPin } from '../../services/apiService';

interface GatekeeperProps {
  onSuccess?: () => void;
}

const Gatekeeper: React.FC<GatekeeperProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { setIsAdmin, isAdmin } = useAppContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setAppPin(pin);
      setIsAdmin(true);
      setError(false);
      if (onSuccess) onSuccess();
    } else {
      setError(true);
    }
  };

  if (isAdmin) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-500 dark:text-slate-400">Insira sua chave de acesso para gerenciar o CRM e realizar operações no banco de dados.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Digite sua chave (PIN)"
              className={`w-full px-4 py-4 text-center text-2xl tracking-[1em] font-mono bg-slate-50 dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              autoFocus
              maxLength={8}
            />
            {error && <p className="text-red-500 text-sm mt-2 text-center">Chave inválida. Tente novamente.</p>}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98]"
          >
            Desbloquear CRM
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-8">
          Acesso monitorado por SRE Sentinel. Logs de auditoria ativos.
        </p>
      </div>
    </div>
  );
};

export default Gatekeeper;
