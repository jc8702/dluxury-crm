// src/modules/orcamentos/components/ImportarCSV.tsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/design-system/components';

interface ImportarCSVProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: any[]) => Promise<any>;
  orcamentoId: string;
}

type ImportStatus = 'idle' | 'parsing' | 'review' | 'saving' | 'success' | 'error';

export function ImportarCSV({ isOpen, onClose, onAddItems, orcamentoId }: ImportarCSVProps) {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('parsing');
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log(`📄 [ImportarCSV] Arquivo parseado: ${results.data.length} linhas`);
        
        // Mapeamento inteligente de colunas (Novo layout + Fallbacks)
        const mappedData = results.data
          .map((row: any) => {
            // Normalizar nomes de colunas (case-insensitive e trim)
            const getVal = (keys: string[]) => {
              const foundKey = Object.keys(row).find(k => keys.some(key => k.toLowerCase().trim() === key.toLowerCase()));
              return foundKey ? row[foundKey] : null;
            };

            const nome = getVal(['Designação', 'designacao', 'nome', 'Description', 'Item', 'Component']) || 'Item sem nome';
            
            // Tratar quantidade com suporte a vírgula decimal
            let qtdStr = getVal(['Quantidade', 'Qtd', 'quantidade', 'Quantity', 'Count']) || '0';
            if (typeof qtdStr === 'string') qtdStr = qtdStr.replace(',', '.');
            const quantidade = parseFloat(qtdStr);

            // Dimensões e Material
            const largura = getVal(['Largura', 'Larg', 'largura', 'Width']) || '';
            const altura = getVal(['Comprimento', 'Comp', 'altura', 'Length', 'Height']) || '';
            const espessura = getVal(['Espessura', 'Esp', 'espessura', 'Thickness']) || '';
            const material = getVal(['Descrição do material', 'Material', 'material', 'Finish']) || '';
            const sku_informado = getVal(['SKU', 'SKU Banco', 'sku', 'Part Number']) || '';

            return { nome, quantidade, largura, altura, espessura, material, sku_informado };
          });

        const filtered = mappedData.filter(i => i.quantidade > 0 && i.nome !== 'Item sem nome');
        
        if (filtered.length > 0) {
          try {
            console.log(`🔍 [ImportarCSV] Buscando SKUs para ${filtered.length} itens...`);
            const matchResponse = await fetch('/api/match-skus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itens: filtered })
            });
            const matchResult = await matchResponse.json();
            
            if (matchResult.success) {
              console.log("✅ [ImportarCSV] SKUs reconhecidos!");
              // Transformar o formato do match-skus para o esperado pelo importar-itens
              const enriched = matchResult.data.map((it: any) => ({
                ...it,
                match_sugerido: it.produto_id ? {
                  sku_componente_id: it.produto_id,
                  nome: it.sku_encontrado,
                  custoUnitario: it.custoUnitario
                } : null
              }));
              setItems(enriched);
            } else {
              setItems(filtered);
            }
          } catch (err) {
            console.warn("⚠️ [ImportarCSV] Erro ao buscar SKUs, prosseguindo sem match:", err);
            setItems(filtered);
          }
        }

        setStatus('review');
      },
      error: (err) => {
        console.error('❌ [ImportarCSV] Erro no parse:', err);
        setError(`Erro ao ler arquivo: ${err.message}`);
        setStatus('error');
      }
    });
  };

  const handleConfirmarImportacao = async () => {
    if (items.length === 0) return;
    
    setStatus('saving');
    setError(null);

    try {
      console.log(`📤 [ImportarCSV] Preparando payload para ${items.length} itens...`);
      
      // Validação prévia de sanidade dos itens
      const sanitizedItems = items.map((it, idx) => {
        const q = parseFloat(it.quantidade);
        if (isNaN(q)) console.warn(`⚠️ [ImportarCSV] Item ${idx} (${it.nome}) com quantidade inválida:`, it.quantidade);
        return {
          ...it,
          quantidade: isNaN(q) ? 1 : q,
          // Garantir que não existam campos nulos críticos
          nome: it.nome || 'Sem Nome',
          sku_id: it.sku_id || it.produto_id || it.match_sugerido?.sku_componente_id || null
        };
      });

      console.log(`📤 [ImportarCSV] Payload sanitizado:`, sanitizedItems);
      
      const success = await onAddItems(sanitizedItems);

      if (success) {
        console.log(`✅ [ImportarCSV] Importação confirmada pelo servidor.`);
        setStatus('success');
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setItems([]);
        }, 1500);
      } else {
        // Se success for false, o erro já deve ter sido alertado pelo useOrcamento ou capturado aqui
        throw new Error('Falha na persistência dos itens. Verifique os logs do servidor.');
      }
    } catch (err: any) {
      console.error('❌ [ImportarCSV] Falha crítica na confirmação:', {
        message: err.message,
        stack: err.stack,
        itemsCount: items.length
      });
      setError(err.message || 'Erro ao processar importação. Tente novamente.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
      <div className="bg-zinc-950 border border-zinc-900 rounded-[32px] w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Upload className="w-6 h-6 text-orange-500" />
              Importar Projeto <span className="text-orange-500">SketchUp</span>
            </h2>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">Injeção Industrial de Dados via CSV</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
            disabled={status === 'saving'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {status === 'idle' || status === 'error' ? (
            <div className="h-full flex flex-col items-center justify-center">
              {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 w-full max-w-md">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}
              
              <label className="group relative w-full max-w-xl h-64 border-2 border-dashed border-zinc-800 rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all duration-500">
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <FileText className="w-10 h-10 text-zinc-700 group-hover:text-orange-500" />
                </div>
                <p className="text-white font-black text-lg">Selecione o arquivo CSV</p>
                <p className="text-zinc-600 text-xs mt-2 font-bold uppercase tracking-tighter">Exportação do CutList Plus ou SketchUp</p>
              </label>
            </div>
          ) : null}

          {status === 'parsing' && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-orange-500 font-black animate-pulse uppercase tracking-[0.3em]">Analisando Estrutura...</p>
            </div>
          )}

          {status === 'review' && (
            <div className="space-y-6">
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-500" />
                  <span className="text-orange-500 font-bold">{items.length} itens detectados no arquivo</span>
                </div>
                <Button variant="ghost" className="text-xs font-black uppercase text-zinc-500 hover:text-white" onClick={() => setStatus('idle')}>
                  Trocar Arquivo
                </Button>
              </div>

              <div className="border border-zinc-900 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/50 text-zinc-500 font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Item / Designação</th>
                      <th className="px-6 py-4 text-center">Qtd</th>
                      <th className="px-6 py-4">Dimensões (LxAxE)</th>
                      <th className="px-6 py-4">Material</th>
                      <th className="px-6 py-4">SKU / Vínculo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-white uppercase">{item.nome}</td>
                        <td className="px-6 py-4 text-center font-black text-orange-500">{item.quantidade}</td>
                        <td className="px-6 py-4 text-zinc-400 font-mono">
                          {item.largura} x {item.altura} x {item.espessura}
                        </td>
                        <td className="px-6 py-4 text-zinc-500 italic">{item.material || '-'}</td>
                        <td className="px-6 py-4">
                          {item.match_sugerido ? (
                            <div className="flex flex-col">
                              <span className="text-green-500 font-bold">{item.match_sugerido.nome}</span>
                              <span className="text-[10px] text-zinc-600 uppercase">Reconhecido</span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-zinc-500">{item.sku_informado || '-'}</span>
                              <span className="text-[10px] text-red-500/50 uppercase">Não encontrado</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {status === 'saving' && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 border-8 border-orange-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-orange-500 animate-bounce" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-black text-2xl uppercase italic italic tracking-tighter">Sincronizando Banco de Dados</p>
                <p className="text-zinc-500 text-sm mt-2">Gravando itens e vinculando SKUs industriais...</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="text-green-500 font-black text-xl uppercase tracking-widest">Importação Concluída!</p>
              <p className="text-zinc-500">O orçamento foi atualizado com sucesso.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === 'review' && (
          <div className="p-8 border-t border-zinc-900 bg-zinc-900/20 flex justify-end gap-4">
            <Button variant="ghost" className="px-8 font-bold text-zinc-500" onClick={onClose}>Cancelar</Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white font-black px-12 h-14 text-lg shadow-xl shadow-orange-900/20"
              onClick={handleConfirmarImportacao}
            >
              Confirmar Importação
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
