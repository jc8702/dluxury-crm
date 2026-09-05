import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function CopilotModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenChat = (event: any) => {
      const query = event.detail?.query;
      if (query) {
        setIsOpen(true);
        setMessages([]);
        setInput('');
        setTimeout(() => {
          document.getElementById('copilot-input')?.focus();
          handleSendMessage(query);
        }, 100);
      }
    };

    window.addEventListener('dlux-open-chat', handleOpenChat);
    return () => window.removeEventListener('dlux-open-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: 'chat',
          payload: {
            message: text,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
          },
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const assistantMessage = data.data?.content || data.message || 'Erro ao processar.';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Erro: ${error.message}. Verifique se a API está disponível.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl h-[70vh] bg-card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary to-secondary">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-accent">
              <Sparkles size={20} className="text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-primary-foreground">Dlux Copilot</h2>
              <p className="text-xs text-primary-foreground/80">
                Consultoria & Insights Inteligentes
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {messages.length === 0 && !loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Sparkles size={48} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">Olá! Sou o Dlux Copilot.</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Faça uma pergunta sobre marcenaria, engenharia ou operações.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-card text-foreground border border-border'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border px-4 py-3 rounded-lg flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-secondary" />
                <span className="text-sm text-muted-foreground">Processando sua pergunta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-card">
          <div className="flex gap-2">
            <input
              id="copilot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50 bg-background text-foreground"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Dica: Pergunte sobre ergonomia, especificações técnicas, cálculos estruturais ou
            operações da fábrica.
          </p>
        </div>
      </div>
    </div>
  );
}
