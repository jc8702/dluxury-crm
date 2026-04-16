import React, { useState } from 'react';
import { Sparkles, Bot, AlertTriangle, ShoppingCart, Settings2, X, ChevronRight, Loader2 } from 'lucide-react';

interface CopilotAssistantProps {
  onSuggestBOM?: (suggestion: any) => void;
}

const CopilotAssistant: React.FC<CopilotAssistantProps> = ({ onSuggestBOM }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const callSkill = async (skill: string, payload: any = {}) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, payload })
      });
      const data = await res.json();
      
      setMessages(prev => [{
        skill,
        content: data.suggestions || data.audit || "Sugestão gerada com sucesso!",
        timestamp: new Date()
      }, ...prev]);

      if (skill === 'generate-bom' && onSuggestBOM) {
        onSuggestBOM(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn-primary pulse"
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.4)',
            border: 'none', cursor: 'pointer'
          }}
        >
          <Sparkles size={28} />
        </button>
      )}

      {/* Painel do Copiloto */}
      {isOpen && (
        <div className="card animate-slide-up" style={{
          width: '380px', maxHeight: '600px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--primary-low)',
          borderRadius: '1.5rem',
          overflow: 'hidden'
        }}>
          <header style={{ 
            padding: '1.25rem', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(90deg, var(--primary-low), transparent)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                background: 'var(--primary)', color: 'white', padding: '0.4rem', 
                borderRadius: '0.75rem', display: 'flex' 
              }}>
                <Bot size={20} />
              </div>
              <span style={{ fontWeight: '700', letterSpacing: '0.02em' }}>IA COPILOT</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ all: 'unset', cursor: 'pointer', opacity: 0.6 }}>
              <X size={20} />
            </button>
          </header>

          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Ações Rápidas */}
            <section>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: '600' }}>AÇÕES INDUSTRIAIS</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button onClick={() => callSkill('purchase-advisor')} className="ai-skill-btn">
                  <ShoppingCart size={16} /> Compras
                </button>
                <button onClick={() => callSkill('generate-bom', { descricao: 'Armário Cozinha', medidas: {L:1200,A:700,P:500} })} className="ai-skill-btn">
                  <Settings2 size={16} /> Gerar BOM
                </button>
                <button onClick={() => callSkill('anomaly-detection')} className="ai-skill-btn" style={{ borderColor: 'var(--danger-low)', color: '#ffb347' }}>
                  <AlertTriangle size={16} /> Anomalias
                </button>
              </div>
            </section>

            {/* Histórico de Sugestões */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}>
                  <Loader2 className="animate-spin" size={16} /> Consultando inteligência industrial...
                </div>
              )}
              
              {messages.map((m, i) => (
                <div key={i} className="card-sub" style={{ padding: '0.85rem', fontSize: '0.85rem', borderLeft: '3px solid var(--primary)' }}>
                   <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{m.content}</p>
                   <small style={{ color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>{m.timestamp.toLocaleTimeString()}</small>
                </div>
              ))}
            </div>
          </div>

          <footer style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
               <AlertTriangle size={12} style={{ color: 'var(--danger)' }} />
               Dica: Use IA para validar duplicidades no cadastro.
             </div>
          </footer>
        </div>
      )}

      <style>{`
        .ai-skill-btn {
          all: unset;
          padding: 0.6rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ai-skill-btn:hover {
          background: var(--primary-low);
          border-color: var(--primary);
          color: var(--primary);
        }
        .ai-skill-btn svg { opacity: 0.7; }
        .pulse { animation: pulse-shadow 2s infinite; }
        @keyframes pulse-shadow {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        }
      `}</style>
    </div>
  );
};

export default CopilotAssistant;
