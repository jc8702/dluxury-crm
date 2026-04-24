import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bot, Loader2, MessageCircle, Send, Sparkles, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';

type ChartSeries = { key: string; label: string; color?: string };
type ChartData =
  | { type: 'line' | 'bar'; xKey: string; series: ChartSeries[]; data: Array<Record<string, any>>; title?: string }
  | { type: 'pie'; nameKey: string; valueKey: string; data: Array<Record<string, any>>; title?: string };
type TableData = { headers: string[]; rows: (string | number)[][] };

interface DluxMessage {
  role: 'user' | 'assistant';
  text: string;
  chart_data?: ChartData | null;
  table_data?: TableData | null;
  suggestions?: string[];
  timestamp: Date;
}

interface DluxChatProps {
  onSuggestBOM?: (suggestion: any) => void;
}

const initialGreeting =
  'Olá! Sou o **Dlux**. Faça perguntas em linguagem natural sobre o ERP e eu vou interpretar a intenção, consultar os dados quando precisar e responder de forma direta.';

const STORAGE_PREFIX = 'dluxury_dlux_chat';
const MEMORY_STORAGE_PREFIX = 'dluxury_dlux_memory';
const MAX_STORED_MESSAGES = 28;
const MAX_MEMORY_CHARS = 900;

function getStorageKey(userId?: string) {
  return `${STORAGE_PREFIX}:${userId || 'anon'}`;
}

function getMemoryKey(userId?: string) {
  return `${MEMORY_STORAGE_PREFIX}:${userId || 'anon'}`;
}

function serializeMessages(messages: DluxMessage[]) {
  return messages.map((message) => ({
    ...message,
    timestamp: message.timestamp.toISOString(),
  }));
}

function deserializeMessages(raw: any): DluxMessage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.text === 'string')
    .map((item) => ({
      role: item.role,
      text: item.text,
      chart_data: item.chart_data ?? null,
      table_data: item.table_data ?? null,
      suggestions: Array.isArray(item.suggestions) ? item.suggestions : [],
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    }))
    .filter((item) => !Number.isNaN(item.timestamp.getTime()));
}

function normalizeMemorySummary(value: any) {
  const text = String(value || '')
    .replace(/\r/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text.slice(0, MAX_MEMORY_CHARS);
}

const palette = ['#00A99D', '#E2AC00', '#8B5CF6', '#22C55E', '#EF4444', '#3B82F6'];

function formatCell(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return new Intl.NumberFormat('pt-BR').format(value);
  return String(value);
}

function ChartBlock({ chart }: { chart: ChartData }) {
  if (chart.type === 'pie') {
    return (
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(13,17,23,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff' }}
            />
            <Pie data={chart.data} dataKey={chart.valueKey} nameKey={chart.nameKey} innerRadius={56} outerRadius={92} paddingAngle={2}>
              {chart.data.map((_, index) => (
                <Cell key={index} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === 'bar') {
    return (
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey={chart.xKey} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }} stroke="rgba(255,255,255,0.15)" />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }} stroke="rgba(255,255,255,0.15)" />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(13,17,23,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff' }}
            />
            <Legend />
            {chart.series.map((series, index) => (
              <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color || palette[index % palette.length]} radius={[8, 8, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey={chart.xKey} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }} stroke="rgba(255,255,255,0.15)" />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }} stroke="rgba(255,255,255,0.15)" />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(13,17,23,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff' }}
          />
          <Legend />
          {chart.series.map((series, index) => (
            <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color || palette[index % palette.length]} strokeWidth={2.5} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableBlock({ table }: { table: TableData }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
            {table.headers.map((header) => (
              <th key={header} style={{ textAlign: 'left', padding: '0.85rem 0.9rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: '0.8rem 0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                  {formatCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DluxChat({ onSuggestBOM }: DluxChatProps) {
  const { user } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [memorySummary, setMemorySummary] = useState('');
  const [messages, setMessages] = useState<DluxMessage[]>([
    { role: 'assistant', text: initialGreeting, timestamp: new Date() },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const memoryLoadedRef = useRef(false);
  const storageKey = getStorageKey(user?.id);
  const memoryKey = getMemoryKey(user?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadedRef.current = false;

    try {
      const raw = localStorage.getItem(storageKey);
      const restored = deserializeMessages(raw ? JSON.parse(raw) : null);
      setMessages(restored.length > 0 ? restored : [{ role: 'assistant', text: initialGreeting, timestamp: new Date() }]);
    } catch {
      setMessages([{ role: 'assistant', text: initialGreeting, timestamp: new Date() }]);
    }

    loadedRef.current = true;
  }, [storageKey]);

  useEffect(() => {
    memoryLoadedRef.current = false;

    try {
      const raw = localStorage.getItem(memoryKey);
      setMemorySummary(normalizeMemorySummary(raw || ''));
    } catch {
      setMemorySummary('');
    }

    memoryLoadedRef.current = true;
  }, [memoryKey]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(serializeMessages(messages.slice(-MAX_STORED_MESSAGES))));
    } catch {
      // Sem bloqueio se o storage estiver indisponível.
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (!memoryLoadedRef.current) return;
    try {
      const normalized = normalizeMemorySummary(memorySummary);
      if (normalized) localStorage.setItem(memoryKey, normalized);
      else localStorage.removeItem(memoryKey);
    } catch {
      // Sem bloqueio se o storage estiver indisponível.
    }
  }, [memorySummary, memoryKey]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setIsOpen(true);
  };

  const clearConversation = () => {
    const reset = [{ role: 'assistant' as const, text: initialGreeting, timestamp: new Date() }];
    setMessages(reset);
    setInput('');
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // noop
    }
  };

  const clearMemory = () => {
    setMemorySummary('');
    try {
      localStorage.removeItem(memoryKey);
    } catch {
      // noop
    }
  };

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
    }));

    setMessages((prev) => [...prev, { role: 'user', text, timestamp: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.ai.chat({
        message: text,
        conversation_history: history,
        context: {
          data_atual: new Date().toISOString(),
          rota_atual: window.location.hash || window.location.pathname,
          usuario_id: user?.id,
          usuario_nome: user?.name,
          empresa: 'D\'LUXURY CRM',
        },
        memory_summary: memorySummary,
      });

      const assistantMessage: DluxMessage = {
        role: 'assistant',
        text: response?.text || response?.content || 'Não consegui processar a resposta no momento.',
        chart_data: response?.chart_data ?? null,
        table_data: response?.table_data ?? null,
        suggestions: Array.isArray(response?.suggestions) ? response.suggestions : [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (typeof response?.memory_summary === 'string') {
        setMemorySummary(normalizeMemorySummary(response.memory_summary));
      }
    } catch (err: any) {
      console.error('DLUX_CHAT_FRONTEND_ERROR:', err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: `Desculpe, houve um erro. Tente novamente.\n\n${err?.message ? `Detalhe: ${err.message}` : ''}`.trim(),
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Dlux"
          style={{
            position: 'fixed',
            right: '1.25rem',
            bottom: '1.25rem',
            zIndex: 1200,
            width: 60,
            height: 60,
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            background: 'linear-gradient(135deg, #E2AC00, #00A99D)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Sparkles size={26} />
        </button>
      )}

      {isOpen && (
        <div
          className="dlux-panel-mobile"
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '1rem',
            zIndex: 1200,
            width: 'min(440px, calc(100vw - 1.5rem))',
            height: 'min(680px, calc(100vh - 1.5rem))',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 24,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(8, 11, 17, 0.97)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
            color: '#fff',
          }}
        >
          <header
            style={{
              padding: '1rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(135deg, rgba(226,172,0,0.18), rgba(0,169,157,0.12))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #E2AC00, #00A99D)' }}>
                <Bot size={21} />
              </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>Dlux</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>IA generativa do D'LUXURY ERP</div>
                </div>
              </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={clearMemory}
                aria-label="Limpar memória"
                title="Limpar memória"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={clearConversation}
                aria-label="Nova conversa"
                title="Nova conversa"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <MessageCircle size={16} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar Dlux"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', lineHeight: 1.5 }}>
              Pergunte livremente em português. Eu entendo contexto, histórico e dados do ERP sem precisar de comandos prontos.
            </div>
            {memorySummary && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                Memória ativa: mantendo preferências e contexto recorrente deste usuário.
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {messages.map((message, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: message.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}>
                <div
                  style={{
                    maxWidth: '100%',
                    width: 'fit-content',
                    borderRadius: 18,
                    padding: '0.9rem 1rem',
                    background: message.role === 'user' ? 'linear-gradient(135deg, #00A99D, #007c73)' : 'rgba(255,255,255,0.05)',
                    border: message.role === 'assistant' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    color: '#fff',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    fontSize: 14,
                  }}
                >
                  {message.text}
                </div>

                {message.role === 'assistant' && message.chart_data && (
                  <div style={{ width: '100%', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '0.85rem', background: 'rgba(255,255,255,0.03)' }}>
                    {message.chart_data.title && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>{message.chart_data.title}</div>}
                    <ChartBlock chart={message.chart_data} />
                  </div>
                )}

                {message.role === 'assistant' && message.table_data && (
                  <div style={{ width: '100%', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '0.85rem', background: 'rgba(255,255,255,0.03)' }}>
                    <TableBlock table={message.table_data} />
                  </div>
                )}

                {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                  <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {message.suggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => handleSuggestion(suggestion)}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.04)',
                          color: '#fff',
                          cursor: 'pointer',
                          borderRadius: 999,
                          padding: '0.45rem 0.7rem',
                          fontSize: 12,
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.65)' }}>
                <Loader2 size={16} className="dlux-spin" />
                Processando dados...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={{ padding: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.14)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte livremente ao Dlux..."
                  disabled={loading}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  padding: '0.9rem 1rem',
                  outline: 'none',
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #E2AC00, #00A99D)',
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .dlux-spin {
          animation: dlux-spin 1s linear infinite;
        }
        @keyframes dlux-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .dlux-panel-mobile {
            width: calc(100vw - 1rem) !important;
            height: calc(100vh - 1rem) !important;
            right: 0.5rem !important;
            bottom: 0.5rem !important;
          }
        }
      `}</style>
    </>
  );
}
