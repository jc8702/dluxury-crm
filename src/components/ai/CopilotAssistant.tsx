import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bot, AlertTriangle, ShoppingCart, Settings2, X, Send, Loader2, User } from 'lucide-react';
import { api } from '../../lib/api';

interface CopilotAssistantProps {
  onSuggestBOM?: (suggestion: any) => void;
}

const CopilotAssistant: React.FC<CopilotAssistantProps> = ({ onSuggestBOM }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { type: 'ai', content: 'Olá! Sou seu Copiloto Industrial. Como posso ajudar hoje?', timestamp: new Date() }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const callSkill = async (skill: string, payload: any = {}) => {
    setLoading(true);
    try {
      let data;
      switch(skill) {
        case 'generate-bom': data = await api.ai.generateBOM(payload); break;
        case 'purchase-suggestion': data = await api.ai.purchaseSuggestion(); break;
        case 'detect-anomalies': data = await api.ai.detectAnomalies(); break;
        default: data = { content: "Função não reconhecida." };
      }
      
      const content = data.pedidos_sugeridos 
        ? `Sugestão de Compras gerada! Encontrei ${data.pedidos_sugeridos.length} itens críticos.`
        : data.anomalias 
          ? `Auditoria concluída. Detectei ${data.anomalias.length} possíveis anomalias.`
          : data.itens
            ? `BOM gerada com sucesso para ${payload.tipo}.`
            : "Ação concluída.";

      setMessages(prev => [...prev, {
        type: 'ai',
        skill,
        content,
        data,
        timestamp: new Date()
      }]);

      if (skill === 'generate-bom' && onSuggestBOM) onSuggestBOM(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMsg, timestamp: new Date() }]);
    setLoading(true);

    try {
      const history = messages.slice(-5).map(m => ({ role: m.type === 'ai' ? 'assistant' : 'user', content: m.content }));
      const response = await api.ai.chat({ message: userMsg, history });
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: response.content || "Não consegui processar sua dúvida agora.",
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error('CHAT_FRONTEND_ERROR:', err);
      const errorMessage = err.message || "Erro desconhecido na conexão.";
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: `⚠️ Erro Técnico: ${errorMessage}. Verifique se a API Key do Gemini está configurada na Vercel.`, 
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
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

      {isOpen && (
        <div className="card animate-pop-in" style={{
          width: '400px', height: '600px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 64px rgba(0,0,0,0.6)',
          background: 'rgba(10, 13, 20, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-strong)',
          borderRadius: '1.5rem',
          overflow: 'hidden'
        }}>
          <header style={{ 
            padding: '1.25rem', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.1), transparent)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'var(--primary)', color: 'var(--primary-text)', padding: '0.4rem', borderRadius: '0.75rem' }}>
                <Bot size={20} />
              </div>
              <span style={{ fontWeight: '700', letterSpacing: '0.02em', fontSize: '0.9rem' }}>IA COPILOT</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ all: 'unset', cursor: 'pointer', opacity: 0.6, padding: '0.5rem' }}>
              <X size={20} />
            </button>
          </header>

          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <section style={{ marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: '700', letterSpacing: '0.05em' }}>AÇÕES RÁPIDAS</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button onClick={() => callSkill('purchase-suggestion')} className="ai-skill-btn">
                  <ShoppingCart size={14} /> Compras
                </button>
                <button onClick={() => callSkill('generate-bom', { tipo: 'Armário Padrão', medidas: {L:1200,A:700,P:500} })} className="ai-skill-btn">
                  <Settings2 size={14} /> Sugerir BOM
                </button>
              </div>
            </section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ 
                  alignSelf: m.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <div style={{ 
                    padding: '0.85rem 1rem',
                    borderRadius: m.type === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                    background: m.type === 'user' ? 'var(--primary)' : 'var(--surface-hover)',
                    color: m.type === 'user' ? 'var(--primary-text)' : 'var(--text)',
                    fontSize: '0.875rem',
                    border: m.type === 'ai' ? '1px solid var(--border)' : 'none',
                    boxShadow: 'var(--shadow-xs)',
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    lineHeight: '1.5'
                  }}>
                    {m.content}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: m.type === 'user' ? 'right' : 'left' }}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}>
                   <Loader2 className="animate-spin" size={14} /> Processando...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text"
                className="input"
                placeholder="Pergunte qualquer coisa..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{ borderRadius: '1rem', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading || !input.trim()}
                style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, minWidth: '40px' }}
              >
                <Send size={18} />
              </button>
            </form>
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

