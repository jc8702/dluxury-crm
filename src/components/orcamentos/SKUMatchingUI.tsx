import React, { useState } from 'react';
import { Check, AlertCircle, Search, HelpCircle, ArrowRight } from 'lucide-react';

export interface SugestaoMatch {
  sku_interno: string;
  nome: string;
  confianca: number;
  tipo_match: 'exato' | 'fuzzy' | 'descricao';
  quantidade_disponivel: number;
  preco_custo: number;
}

export interface ItemMatching {
  sku_procurado: string;
  descricao_original: string;
  quantidade: number;
  skus_encontrados: SugestaoMatch[];
  sku_selecionado: string;
  requer_validacao_manual: boolean;
}

interface Props {
  resultados: ItemMatching[];
  onConfirmar: (itensValidados: Array<{ sku_promob: string; sku_interno: string; quantidade: number }>) => void;
  onCancelar: () => void;
}

export default function SKUMatchingUI({ resultados, onConfirmar, onCancelar }: Props) {
  const [selecionados, setSelecionados] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const item of resultados) {
      inicial[item.sku_procurado] = item.sku_selecionado || '';
    }
    return inicial;
  });

  const [expandido, setExpandido] = useState<Record<string, boolean>>(() => {
    const inicial: Record<string, boolean> = {};
    for (const item of resultados) {
      inicial[item.sku_procurado] = item.requer_validacao_manual;
    }
    return inicial;
  });

  const [filtroOverride, setFiltroOverride] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, SugestaoMatch[]>>({});

  const handleSelecionar = (skuProcurado: string, skuInterno: string) => {
    setSelecionados(prev => ({ ...prev, [skuProcurado]: skuInterno }));
  };

  const toggleExpandir = (skuProcurado: string) => {
    setExpandido(prev => ({ ...prev, [skuProcurado]: !prev[skuProcurado] }));
  };

  const handleBuscarEstoque = async (skuProcurado: string, query: string) => {
    setFiltroOverride(prev => ({ ...prev, [skuProcurado]: query }));
    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, [skuProcurado]: [] }));
      return;
    }

    try {
      const res = await fetch(`/api/estoque/items?busca=${query}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        const formatados = data.items.map((i: any) => ({
          sku_interno: i.sku_codigo,
          nome: i.descricao,
          confianca: 60,
          tipo_match: 'descricao' as const,
          quantidade_disponivel: Number(i.quantidade_disponivel || 0),
          preco_custo: Number(i.preco_custo_unitario || 0)
        }));
        setSearchResults(prev => ({ ...prev, [skuProcurado]: formatados }));
      }
    } catch (e) {
      console.error('Erro ao buscar SKU alternativo:', e);
    }
  };

  const handleFinalizar = () => {
    const final = resultados.map(r => ({
      sku_promob: r.sku_procurado,
      sku_interno: selecionados[r.sku_procurado] || '',
      quantidade: r.quantidade
    }));
    onConfirmar(final);
  };

  const totalItens = resultados.length;
  const resolvidos = resultados.filter(r => selecionados[r.sku_procurado] !== '').length;
  const pendentesValidacao = resultados.filter(r => r.requer_validacao_manual && !selecionados[r.sku_procurado]).length;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Search className="text-blue-400" size={22} />
            Mapeador SKU (PROMOB ↔ Estoque)
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Mapeamento inteligente para sincronizar sua engenharia de projeto com o estoque detalhado.
          </p>
        </div>

        <div className="mt-3 md:mt-0 flex items-center gap-4 text-sm text-zinc-300">
          <div className="bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span>Resolvidos: <strong>{resolvidos}</strong> de {totalItens}</span>
          </div>
          {pendentesValidacao > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg">
              <span>Pendentes: <strong>{pendentesValidacao}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Itens do CSV */}
      <div className="space-y-4 mb-6">
        {resultados.map((item) => {
          const skuSel = selecionados[item.sku_procurado];
          const isExpandido = expandido[item.sku_procurado];
          const query = filtroOverride[item.sku_procurado] || '';
          const searchList = searchResults[item.sku_procurado] || [];

          return (
            <div 
              key={item.sku_procurado} 
              className={`border rounded-xl transition ${
                item.requer_validacao_manual
                  ? skuSel 
                    ? 'bg-zinc-900/30 border-blue-500/30' 
                    : 'bg-orange-950/5 border-orange-500/30'
                  : 'bg-zinc-900/20 border-zinc-800/80'
              }`}
            >
              {/* Header do Item */}
              <div 
                onClick={() => toggleExpandir(item.sku_procurado)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/30 rounded-t-xl"
              >
                <div className="flex items-center gap-3">
                  {skuSel ? (
                    <div className="bg-green-500/10 text-green-400 p-1.5 rounded-lg">
                      <Check size={18} />
                    </div>
                  ) : (
                    <div className="bg-orange-500/10 text-orange-400 p-1.5 rounded-lg">
                      <AlertCircle size={18} />
                    </div>
                  )}
                  <div>
                    <span className="font-mono text-white font-bold text-sm block">
                      {item.sku_procurado}
                    </span>
                    <span className="text-zinc-400 text-xs block truncate max-w-md">
                      {item.descricao_original}
                    </span>
                    <span className="text-zinc-500 text-[10px] mt-1 block">
                      Quantidade no CSV: <strong>{item.quantidade}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {skuSel ? (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 flex items-center gap-1">
                      Mapeado para: <strong className="text-white font-mono">{skuSel}</strong>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-orange-950/20 border border-orange-500/30 rounded-lg text-orange-400">
                      Requer Seleção
                    </span>
                  )}
                  <span className="text-zinc-500 text-xs">
                    {isExpandido ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Corpo de Seleção (Se expandido) */}
              {isExpandido && (
                <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/60 rounded-b-xl space-y-4">
                  <div className="text-xs text-zinc-400 font-semibold mb-2">
                    ESCOLHA O ITEM DE ESTOQUE CORRESPONDENTE:
                  </div>

                  {/* Opções Sugeridas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.skus_encontrados.map((sug) => {
                      const isAtivo = skuSel === sug.sku_interno;
                      return (
                        <button
                          key={sug.sku_interno}
                          type="button"
                          onClick={() => handleSelecionar(item.sku_procurado, sug.sku_interno)}
                          className={`p-3 rounded-lg border text-left flex justify-between items-start transition ${
                            isAtivo
                              ? 'bg-blue-950/30 border-blue-500 text-white'
                              : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                          }`}
                        >
                          <div>
                            <span className="font-mono text-sm font-bold block">{sug.sku_interno}</span>
                            <span className="text-zinc-400 text-[11px] block mt-0.5">{sug.nome}</span>
                            <span className="text-zinc-500 text-[10px] block mt-2">
                              Estoque disponível: <strong className="text-zinc-300">{sug.quantidade_disponivel}</strong>
                            </span>
                          </div>

                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sug.tipo_match === 'exato'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : sug.tipo_match === 'fuzzy'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {sug.confianca}% Match
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {item.skus_encontrados.length === 0 && (
                      <div className="col-span-2 text-zinc-500 text-xs py-2">
                        Nenhuma sugestão encontrada pelo algoritmo fuzzy.
                      </div>
                    )}
                  </div>

                  {/* Override Manual (Campo de busca alternativo) */}
                  <div className="border-t border-zinc-900 pt-4 mt-3">
                    <label className="text-xs text-zinc-400 block mb-1.5">
                      Busca manual de item no estoque:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digite o SKU ou palavra-chave..."
                        value={query}
                        onChange={(e) => handleBuscarEstoque(item.sku_procurado, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                      />
                    </div>

                    {searchList.length > 0 && (
                      <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2 divide-y divide-zinc-800 max-h-32 overflow-y-auto">
                        {searchList.map(s => (
                          <button
                            key={s.sku_interno}
                            type="button"
                            onClick={() => {
                              handleSelecionar(item.sku_procurado, s.sku_interno);
                              setSearchResults(prev => ({ ...prev, [item.sku_procurado]: [] }));
                            }}
                            className="w-full text-left p-1.5 hover:bg-zinc-950 text-xs text-zinc-300 hover:text-white flex justify-between"
                          >
                            <span><strong className="font-mono text-zinc-200">{s.sku_interno}</strong> - {s.nome}</span>
                            <span className="text-green-500">{s.quantidade_disponivel} disp.</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ações Finais */}
      <div className="flex gap-3 justify-end border-t border-zinc-800 pt-6">
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-lg transition"
        >
          Descartar Importação
        </button>

        <button
          type="button"
          onClick={handleFinalizar}
          disabled={pendentesValidacao > 0}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirmar Mapeamento
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
