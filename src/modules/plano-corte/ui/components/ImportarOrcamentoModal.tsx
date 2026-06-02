'use client';

import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, X, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '../../../../components/common';

interface ImportarOrcamentoModalProps {
  onImportar: (chapasImportadas: any[]) => void;
  onFechar: () => void;
}

export function ImportarOrcamentoModal({ onImportar, onFechar }: ImportarOrcamentoModalProps) {
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');

  useEffect(() => {
    async function carregarOrcamentos() {
      try {
        const list = await api.orcamentos.list();
        // Filtrar orÃ§amentos que possuem itens ou estÃ£o fechados/aprovados
        setOrcamentos(list || []);
      } catch (err) {
        console.error('Erro ao carregar orÃ§amentos:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarOrcamentos();
  }, []);

  function parseBrazilianNumber(val: any): number {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    if (!str) return 0;
    const clean = str.replace(',', '.').replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  }

  const handleSelecionarOrcamento = async (orcamentoId: string, numeroOrcamento: string) => {
    setImporting(true);
    try {
      const orcDet = await api.orcamentos.get(orcamentoId);
      if (!orcDet || !orcDet.itens || orcDet.itens.length === 0) {
        alert('Este orÃ§amento nÃ£o contÃ©m itens ou peÃ§as cadastradas.');
        setImporting(false);
        return;
      }

      // Filtrar apenas itens que parecem ser peÃ§as de MDF/chapas
      const itensMdf = orcDet.itens.filter((item: any) => {
        const materialUpper = String(item.material || item.skuDescricao || '').toUpperCase();
        const skuUpper = String(item.skuCodigo || '').toUpperCase();
        const temLargura = parseBrazilianNumber(item.largura) > 0;
        const temAltura = parseBrazilianNumber(item.altura) > 0;

        // CritÃ©rio: ter largura, altura e ter "MDF" ou "CHP" ou "CHAPA" no nome/material
        return (
          temLargura &&
          temAltura &&
          (materialUpper.includes('MDF') ||
            materialUpper.includes('CHAPA') ||
            skuUpper.includes('CHP-') ||
            skuUpper.includes('MDF-') ||
            !item.skuEngenhariaId) // Componentes avulsos do orÃ§amento geralmente sÃ£o chapas
        );
      });

      if (itensMdf.length === 0) {
        alert('NÃ£o foram encontradas peÃ§as de MDF com dimensÃµes vÃ¡lidas neste orÃ§amento.');
        setImporting(false);
        return;
      }

      // Agrupar as peÃ§as por material e espessura
      const grupos: Record<string, any[]> = {};

      itensMdf.forEach((item: any) => {
        const materialRaw = (item.material || item.skuDescricao || 'MDF BRANCO').trim();
        let espessuraRaw = parseBrazilianNumber(item.espessura || 15);
        if (espessuraRaw > 0 && espessuraRaw < 10) {
          espessuraRaw = espessuraRaw * 10; // 1.5 cm -> 15 mm
        }

        const materialClean = materialRaw
          .toUpperCase()
          .replace(/\s*\d+\s*(?:MM|CM).*$/i, '')
          .trim(); // Remove espessura do nome
        const key = `${materialClean}_${espessuraRaw}`;

        let largura = parseBrazilianNumber(item.largura);
        let altura = parseBrazilianNumber(item.altura);

        // ConversÃ£o de cm para mm
        if (largura > 0 && largura < 150) largura = largura * 10;
        if (altura > 0 && altura < 150) altura = altura * 10;

        const peca = {
          id: `peca_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          nome: item.nomeCustomizado || item.skuDescricao || 'PEÃ‡A ORÃ‡AMENTO',
          largura: Math.max(largura, altura), // A maior dimensÃ£o sempre na largura para seguir fibra padrÃ£o
          altura: Math.min(largura, altura),
          quantidade: Math.max(parseInt(item.quantidade) || 1, 1),
          rotacionavel: true,
          material: materialClean,
          sku: item.skuCodigo || undefined,
          observacoes: item.observacoes || undefined,
        };

        if (!grupos[key]) {
          grupos[key] = [];
        }
        grupos[key].push(peca);
      });

      // Criar as chapas com suas respectivas peÃ§as agrupadas
      const chapasImportadas = Object.entries(grupos).map(([key, pecas]) => {
        const [material, espessuraStr] = key.split('_');
        const espessura = parseInt(espessuraStr) || 15;
        const skuChapa = `CHP-${material.replace(/\s+/g, '-')}-${espessura}`;

        return {
          id: `chapa_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sku_chapa: skuChapa,
          nome_exibicao: `${material} ${espessura}MM`,
          largura_mm: 2750, // PadrÃ£o
          altura_mm: 1830, // PadrÃ£o
          espessura_mm: espessura,
          preco_unitario: '0.00',
          pecas: pecas,
        };
      });

      onImportar(chapasImportadas);
      onFechar();
    } catch (err) {
      console.error('Erro ao importar orÃ§amento:', err);
      alert('Ocorreu um erro ao carregar e processar os itens do orÃ§amento.');
    } finally {
      setImporting(false);
    }
  };

  const orcamentosFiltrados = orcamentos.filter((o) => {
    const num = String(o.numeroOrcamento || o.numero || '').toLowerCase();
    const cli = String(o.clienteNome || o.cliente?.nome || '').toLowerCase();
    const texto = filtroTexto.toLowerCase();
    return num.includes(texto) || cli.includes(texto);
  });

  return (
    <Modal isOpen={true} onClose={onFechar} title="Importar PeÃ§as do OrÃ§amento" size="md">
      <div className="flex flex-col gap-6 max-h-[75vh]">
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nÃºmero ou cliente..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-input border border-border/80 rounded-xl text-sm focus:border-primary/50 outline-none transition-all text-foreground"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[250px] max-h-[450px]">
          {loading || importing ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-50">
                {importing ? 'Processando e separando MDFs...' : 'Carregando orÃ§amentos...'}
              </p>
            </div>
          ) : orcamentosFiltrados.length > 0 ? (
            orcamentosFiltrados.map((o) => (
              <div
                key={o.id}
                onClick={() => handleSelecionarOrcamento(o.id, o.numeroOrcamento || o.numero)}
                className="group relative p-4 flex items-center justify-between bg-foreground/5 border border-border/40 rounded-2xl hover:border-primary/30 hover:bg-foreground/10 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary border border-border/40">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                      OrÃ§amento #{o.numeroOrcamento || o.numero}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                      Cliente: {o.clienteNome || o.cliente?.nome || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-success/15 text-success rounded-md border border-success/10">
                    {o.status}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
              <FileText size={40} className="mb-3" />
              <h3 className="text-xs font-bold uppercase tracking-widest">
                Nenhum orÃ§amento encontrado
              </h3>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
