import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Phone,
  MessageSquare,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { whatsappService } from '../../services/whatsappService.js';
import type { MensagemWhatsApp, ModeloMsgWhatsApp } from '../../services/whatsappService.js';

interface ChatIntegradoProps {
  quotation_id?: string;
  operacao_prod_id?: string;
  numero_telefone: string;
  contato_nome: string;
}

export default function ChatIntegrado({
  quotation_id,
  operacao_prod_id,
  numero_telefone,
  contato_nome,
}: ChatIntegradoProps) {
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState('');
  const [modelosMensagem, setModelosMensagem] = useState<ModeloMsgWhatsApp[]>([]);
  const [simulandoResposta, setSimulandoResposta] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar histórico de mensagens e modelos
  useEffect(() => {
    carregarMensagens();
    carregarModelos();
  }, [quotation_id, operacao_prod_id]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const carregarMensagens = async () => {
    setLoadingHistory(true);
    try {
      const res = await whatsappService.getMensagens({ quotation_id, operacao_prod_id });
      if (res.success) {
        setMensagens(res.mensagens || []);
        setTags(res.tags || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const carregarModelos = async () => {
    try {
      const res = await whatsappService.getModelos();
      if (res.success) {
        setModelosMensagem(res.modelos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
    }
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !numero_telefone) return;

    setLoading(true);
    const msgTexto = inputMsg;
    setInputMsg('');

    try {
      const res = await whatsappService.enviarMensagem({
        quotation_id,
        operacao_prod_id,
        numero_telefone,
        conteudo_msg: msgTexto,
        tags,
      });

      if (res.success) {
        // Otimistic update
        setMensagens((prev) => [
          ...prev,
          {
            id: res.id,
            tipo_msg: 'saida',
            conteudo_msg: msgTexto,
            timestamp_msg: new Date().toISOString(),
            status_entrega: 'enviado',
          },
        ]);

        // Recarregar em ciclos de 2 segundos para acompanhar a mudança de status simulada
        setTimeout(() => carregarMensagens(), 2000);
        setTimeout(() => carregarMensagens(), 4000);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const inserirModelo = (conteudo: string) => {
    const msg = conteudo
      .replace('{cliente}', contato_nome || 'Cliente')
      .replace(
        '{numero_op}',
        operacao_prod_id ? `OP-${operacao_prod_id.substring(0, 8).toUpperCase()}` : '',
      )
      .replace(
        '{data_prazo}',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      );

    setInputMsg(msg);
  };

  const adicionarTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaTag.trim() && !tags.includes(novaTag)) {
      setTags([...tags, novaTag]);
      setNovaTag('');
    }
  };

  const removerTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Simular Resposta Entrando do Cliente (UAU!)
  const simularRespostaCliente = async () => {
    if (simulandoResposta) return;
    setSimulandoResposta(true);

    const respostasMocks = [
      'Olá! Acabei de ver aqui, está perfeito. Muito obrigado!',
      'Oi, tudo bem? O prazo de entrega me atende perfeitamente.',
      'Gostei do modelo que enviou, por favor dê continuidade ao projeto.',
      'Vocês conseguem me entregar um dia antes? Tenho um evento no sábado.',
      'Obrigado pelo aviso, fico no aguardo dos próximos passos.',
    ];

    const randomMsg = respostasMocks[Math.floor(Math.random() * respostasMocks.length)];

    try {
      await whatsappService.receberWebhook({
        from_number: numero_telefone,
        message_text: randomMsg,
        quotation_id,
        operacao_prod_id,
      });

      // Carrega novas mensagens
      await carregarMensagens();
    } catch (err) {
      console.error('Falha ao simular resposta:', err);
    } finally {
      setSimulandoResposta(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/50 border-l border-border select-text">
      {/* Header do Chat */}
      <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
              {contato_nome || 'Cliente'}
              <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-ping" />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {numero_telefone || 'Sem telefone'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Simulação */}
          <button
            onClick={simularRespostaCliente}
            disabled={simulandoResposta}
            className="px-2.5 py-1 text-[10px] font-bold border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success))] hover:text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Simula o cliente enviando uma mensagem de volta no WhatsApp"
          >
            {simulandoResposta ? 'Respondendo...' : 'Simular Resposta'}
          </button>

          <button
            onClick={carregarMensagens}
            disabled={loadingHistory}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-all hover:bg-muted/80 cursor-pointer"
            title="Sincronizar Mensagens"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tags de Atendimento */}
      <div className="px-4 py-2 border-b border-border bg-muted/10 flex flex-wrap items-center gap-1.5 shrink-0 min-h-[40px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removerTag(tag)}
              className="text-muted-foreground hover:text-foreground font-black cursor-pointer text-[8px]"
            >
              ✕
            </button>
          </span>
        ))}

        <form onSubmit={adicionarTag} className="flex items-center gap-1 ml-auto">
          <input
            type="text"
            placeholder="Nova tag..."
            value={novaTag}
            onChange={(e) => setNovaTag(e.target.value)}
            className="px-2 py-0.5 text-[10px] bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-20"
          />
          <button
            type="submit"
            className="p-0.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Histórico de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/5 space-y-3 min-h-0">
        {loadingHistory && mensagens.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-10 animate-pulse">
            Carregando histórico com {contato_nome}...
          </div>
        ) : mensagens.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-16 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
            <p>Nenhuma mensagem trocada ainda.</p>
            <p className="text-[10px] text-muted-foreground/60 max-w-[200px]">
              Use modelos de resposta rápida ou digite abaixo para iniciar a conversa.
            </p>
          </div>
        ) : (
          mensagens.map((msg) => {
            const isMe = msg.tipo_msg === 'saida';
            const hora = new Date(msg.timestamp_msg).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-250`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm border ${
                    isMe
                      ? 'bg-[hsl(var(--success))] text-white border-[hsl(var(--success))] rounded-tr-none'
                      : 'bg-card text-foreground border-border rounded-tl-none'
                  }`}
                >
                  <p className="text-xs whitespace-pre-wrap leading-relaxed break-words font-medium">
                    {msg.conteudo_msg}
                  </p>

                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-75">
                    <span>{hora}</span>
                    {isMe && (
                      <span className="font-bold">
                        {msg.status_entrega === 'lido' && (
                          <span className="text-[hsl(var(--info))]">✓✓</span>
                        )}
                        {msg.status_entrega === 'entregue' && <span>✓✓</span>}
                        {msg.status_entrega === 'enviado' && <span>✓</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Modelos rápidos */}
      {modelosMensagem.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/10 shrink-0">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">
            Modelos Rápidos
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin select-none">
            {modelosMensagem.map((modelo) => (
              <button
                key={modelo.id}
                type="button"
                onClick={() => inserirModelo(modelo.conteudo_template)}
                className="bg-card text-primary hover:bg-primary/10 border border-border hover:border-primary/30 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer"
              >
                {modelo.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Caixa de Texto de Envio */}
      <form onSubmit={enviarMensagem} className="p-3 bg-card border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-all cursor-pointer"
            title="Anexar Mídia (Simulado)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Digite a mensagem no WhatsApp..."
            className="flex-1 px-3 py-2 text-xs bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--success))] focus:border-transparent transition-all"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !inputMsg.trim()}
            className="p-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] disabled:bg-muted text-white rounded-xl transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
